import dns from 'node:dns/promises';
import net from 'node:net';

const MAX_HTML_BYTES = 25 * 1024 * 1024;
const FETCH_TIMEOUT_MS = 6000;
const RESOURCE_PROBE_TIMEOUT_MS = 1500;
const MAX_RESOURCE_PROBES = 12;

function isPrivateIPv4(ip) {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some(n => !Number.isInteger(n) || n < 0 || n > 255)) return true;
  const [a,b] = parts;
  return a === 0 || a === 10 || a === 127 || a >= 224 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) || (a === 192 && b === 0) ||
    (a === 198 && (b === 18 || b === 19 || b === 51)) ||
    (a === 203 && b === 0);
}
function isPrivateIPv6(ip) {
  const x = ip.toLowerCase().split('%')[0];
  if (x === '::' || x === '::1' || x.startsWith('fe8') || x.startsWith('fe9') || x.startsWith('fea') || x.startsWith('feb') || x.startsWith('fc') || x.startsWith('fd') || x.startsWith('ff')) return true;
  if (x.startsWith('::ffff:')) {
    const mapped = x.slice(7);
    if (net.isIPv4(mapped)) return isPrivateIPv4(mapped);
  }
  return false;
}
async function validatePublicUrl(raw) {
  let u;
  try { u = new URL(raw); } catch { throw new Error('Enter a valid website URL.'); }
  if (!['http:', 'https:'].includes(u.protocol)) throw new Error('Only HTTP and HTTPS URLs are supported.');
  if (u.username || u.password) throw new Error('URLs containing usernames or passwords are not accepted.');
  const host = u.hostname.toLowerCase().replace(/^\[|\]$/g, '').replace(/\.$/, '');
  if (!host || host === 'localhost' || host.endsWith('.localhost') || host.endsWith('.local') || host.endsWith('.internal')) {
    throw new Error('For safety, FreeAssess only checks public websites.');
  }
  if (net.isIP(host)) {
    const privateIp = net.isIPv4(host) ? isPrivateIPv4(host) : isPrivateIPv6(host);
    if (privateIp) throw new Error('For safety, FreeAssess cannot access private or local network addresses.');
  } else {
    let addresses;
    try { addresses = await dns.lookup(host, { all: true, verbatim: true }); }
    catch { throw new Error('This domain could not be resolved. Check the URL and try again.'); }
    if (!addresses.length || addresses.some(a => net.isIPv4(a.address) ? isPrivateIPv4(a.address) : isPrivateIPv6(a.address))) {
      throw new Error('For safety, FreeAssess only checks domains that resolve to public IP addresses.');
    }
  }
  u.hash = '';
  return u;
}
async function safeFetch(startUrl, method = 'GET', accept = 'text/html,application/xhtml+xml') {
  let current = startUrl;
  for (let hop = 0; hop <= 4; hop++) {
    current = await validatePublicUrl(current);
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let response;
    try {
      response = await fetch(current, {
        method, redirect: 'manual', signal: controller.signal,
        headers: { 'User-Agent': 'FreeAssessBot/1.0 (+https://github.com/avada-kedavra62442/FreeAssess)', Accept: accept }
      });
    } catch (error) {
      if (error.name === 'AbortError') throw new Error('The website took too long to respond.');
      throw new Error('FreeAssess could not connect to this website. It may block automated requests.');
    } finally { clearTimeout(timer); }
    if ([301,302,303,307,308].includes(response.status)) {
      const location = response.headers.get('location');
      if (!location) return response;
      if (hop === 4) throw new Error('This website redirected too many times.');
      current = new URL(location, current).href;
      continue;
    }
    return response;
  }
  throw new Error('Too many redirects.');
}
async function readLimited(response) {
  const declared = Number(response.headers.get('content-length') || 0);
  if (declared > MAX_HTML_BYTES) throw new Error('This page is larger than the 25 MB analysis limit. Try a lighter page.');
  if (!response.body) return Buffer.alloc(0);
  const reader = response.body.getReader();
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > MAX_HTML_BYTES) {
      await reader.cancel().catch(() => {});
      throw new Error('This page is larger than the 25 MB analysis limit. Try a lighter page.');
    }
    chunks.push(Buffer.from(value));
  }
  return Buffer.concat(chunks);
}
function decodeEntities(s = '') {
  return s.replace(/&nbsp;/gi,' ').replace(/&amp;/gi,'&').replace(/&quot;/gi,'"').replace(/&#39;|&apos;/gi,"'").replace(/&lt;/gi,'<').replace(/&gt;/gi,'>').replace(/&#(\d+);/g,(_,n)=>String.fromCodePoint(Number(n))).replace(/&#x([\da-f]+);/gi,(_,n)=>String.fromCodePoint(parseInt(n,16)));
}
function stripTags(s = '') { return decodeEntities(s.replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi,' ').replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi,' ').replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim()); }
function attr(tag, name) {
  const re = new RegExp(`(?:^|\\s)${name}\\s*=\\s*(?:\"([^\"]*)\"|'([^']*)'|([^\\s>]+))`, 'i');
  const m = tag.match(re);
  return decodeEntities(m ? (m[1] ?? m[2] ?? m[3] ?? '').trim() : '');
}
function tags(html, name) { return [...html.matchAll(new RegExp('<' + name + '\\b[^>]*>', 'gi'))].map(m=>m[0]); }
function metaContent(html, key, value) {
  const t = tags(html,'meta').find(x=>attr(x,key).toLowerCase() === value.toLowerCase());
  return t ? attr(t,'content') : '';
}
function htmlScore(items) {
  const positive = items.filter(x=>x.level==='good').length;
  const warnings = items.filter(x=>x.level==='warning').length;
  return Math.max(20, Math.min(100, Math.round(100 - warnings * 13 + positive * 2)));
}
function finding(level,title,detail,fix) { return {level,title,detail,...(fix?{fix}:{})}; }
function collectMeta(html, pageUrl) {
  const title = stripTags((html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)||[])[1]||'');
  const description = metaContent(html,'name','description');
  const canonicalTag = tags(html,'link').find(x=>attr(x,'rel').toLowerCase().split(/\s+/).includes('canonical'));
  const robots = metaContent(html,'name','robots') || metaContent(html,'name','googlebot');
  const h1 = [...html.matchAll(/<h1\b[^>]*>([\s\S]*?)<\/h1>/gi)].map(m=>stripTags(m[1])).filter(Boolean);
  const h2 = [...html.matchAll(/<h2\b[^>]*>([\s\S]*?)<\/h2>/gi)].map(m=>stripTags(m[1])).filter(Boolean);
  const openGraph = !!(metaContent(html,'property','og:title') || metaContent(html,'property','og:description') || metaContent(html,'property','og:image'));
  const imgs = tags(html,'img');
  const imgsWithoutAlt = imgs.filter(t=>!/(?:^|\s)alt\s*=/i.test(t) || attr(t,'alt')==='');
  const imagesWithoutDimensions = imgs.filter(t=>!attr(t,'width') || !attr(t,'height'));
  const inputs = tags(html,'input').concat(tags(html,'select'),tags(html,'textarea'));
  const labels = tags(html,'label');
  const formIssues = inputs.filter(t => {
    if (/type\s*=\s*["']?hidden/i.test(t)) return false;
    const id = attr(t,'id');
    const aria = attr(t,'aria-label') || attr(t,'aria-labelledby');
    const placeholder = attr(t,'placeholder');
    return !aria && !(id && labels.some(l=>attr(l,'for')===id)) && !placeholder;
  });
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>/gi)].map(m=>Number(m[1]));
  const headingSkips = headings.slice(1).some((level,i)=>level > headings[i] + 1);
  const buttons = tags(html,'button');
  const anchors = tags(html,'a');
  const imagesWithLogoClues = imgs.filter(t=>/logo|brand|wordmark/i.test(attr(t,'alt')+' '+attr(t,'src')+' '+attr(t,'class')));
  const linksWithoutHref = anchors.filter(t=>!attr(t,'href'));
  const newTabLinksWithoutRel = anchors.filter(t=>attr(t,'target').toLowerCase()==='_blank' && !/\bnoopener\b/i.test(attr(t,'rel')));
  const forms = tags(html,'form');
  const formActions = forms.map(t=>({action:attr(t,'action'),method:(attr(t,'method')||'get').toLowerCase()}));
  const imageSources = imgs.map(t=>attr(t,'src') || attr(t,'data-src')).filter(Boolean);
  const anchorTargets = anchors.map(t=>attr(t,'href')).filter(h=>h && !/^(?:#|mailto:|tel:|javascript:|data:)/i.test(h));
  const hasViewport = !!tags(html,'meta').find(t=>attr(t,'name').toLowerCase()==='viewport');
  const hasFavicon = tags(html,'link').some(t=>/icon/i.test(attr(t,'rel')) && !!attr(t,'href'));
  const hasNavigation = /<nav\b/i.test(html);
  const hasMainLandmark = /<main\b/i.test(html);
  const scripts = tags(html,'script').filter(t=>attr(t,'src'));
  const stylesheets = tags(html,'link').filter(t=>attr(t,'rel').toLowerCase().split(/\s+/).includes('stylesheet'));
  const resources = new Set([...scripts.map(t=>attr(t,'src')),...stylesheets.map(t=>attr(t,'href')),...imgs.map(t=>attr(t,'src'))].filter(Boolean).map(s=>{try{return new URL(s,pageUrl).href}catch{return s}}));
  const pageSize = Number(html.length);
  const seo = {title,description,canonical:canonicalTag?new URL(attr(canonicalTag,'href'),pageUrl).href:'',robots,h1Count:h1.length,h2Count:h2.length,h1,h2,openGraph,imagesWithoutAlt:imgsWithoutAlt.length,sitemap:false};
  const accessibility = {images:imgs.length,imagesWithoutAlt:imgsWithoutAlt.length,formControls:inputs.length,formIssues:formIssues.length,headingSkips,headings:headings.length};
  const uiux = {buttons:buttons.length,links:anchors.length,linksWithoutHref:linksWithoutHref.length,newTabLinksWithoutRel:newTabLinksWithoutRel.length,forms:forms.length,images:imgs.length,logoCandidates:imagesWithLogoClues.length,imageSources,anchorTargets,hasViewport,hasFavicon,hasNavigation,hasMainLandmark};
  return {seo,accessibility,uiux,resources:[...resources],scripts: scripts.length,stylesheets: stylesheets.length,images:imgs.length,imagesWithoutDimensions:imagesWithoutDimensions.length,pageSize};
}
async function probeResource(rawUrl, pageUrl) {
  let target;
  try { target = new URL(rawUrl, pageUrl); } catch { return { url: rawUrl, status: 0, ok: false, reason: 'Invalid URL' }; }
  if (!['http:', 'https:'].includes(target.protocol)) return null;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), RESOURCE_PROBE_TIMEOUT_MS);
  try {
    await validatePublicUrl(target.href);
    let response = await fetch(target.href, { method: 'HEAD', redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'FreeAssessBot/1.0 (+https://github.com/avada-kedavra62442/FreeAssess)' } });
    if ([405, 501].includes(response.status)) response = await fetch(target.href, { method: 'GET', redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': 'FreeAssessBot/1.0 (+https://github.com/avada-kedavra62442/FreeAssess)', Range: 'bytes=0-0' } });
    if (response.body) await response.body.cancel().catch(() => {});
    return { url: target.href, status: response.status, ok: response.status < 400, reason: response.status >= 400 ? `HTTP ${response.status}` : undefined };
  } catch (error) {
    return { url: target.href, status: 0, ok: false, reason: error?.name === 'AbortError' ? 'Timed out' : 'Could not verify' };
  } finally { clearTimeout(timer); }
}
async function probePageResources(parsed, pageUrl) {
  const unique = [...new Set([
    ...parsed.uiux.imageSources.slice(0, MAX_RESOURCE_PROBES),
    ...parsed.uiux.anchorTargets.slice(0, MAX_RESOURCE_PROBES)
  ])].slice(0, MAX_RESOURCE_PROBES);
  const results = await Promise.all(unique.map(url => probeResource(url, pageUrl)));
  const checked = results.filter(Boolean);
  const images = checked.filter(x => parsed.uiux.imageSources.some(raw => { try { return new URL(raw, pageUrl).href === x.url; } catch { return false; } }));
  const links = checked.filter(x => parsed.uiux.anchorTargets.some(raw => { try { return new URL(raw, pageUrl).href === x.url; } catch { return false; } }));
  return { checked: checked.length, failedImages: images.filter(x => !x.ok), failedLinks: links.filter(x => !x.ok), unverified: checked.filter(x => x.reason === 'Could not verify' || x.reason === 'Timed out').length };
}
async function sitemapExists(pageUrl) {
  const u = new URL('/sitemap.xml', pageUrl);
  try {
    const response = await safeFetch(u.href, 'HEAD', 'application/xml,text/xml,*/*');
    if (response.status >= 200 && response.status < 400) return true;
  } catch {}
  try {
    const response = await safeFetch(new URL('/robots.txt', pageUrl).href, 'GET', 'text/plain,*/*');
    if (!response.ok) return false;
    const body = (await response.text()).slice(0,50000);
    return /^\s*Sitemap\s*:/im.test(body);
  } catch { return false; }
}
function scoreAll(findings) {
  const group = (items) => {
    const critical = items.filter(x => x.level === 'critical').length;
    const warnings = items.filter(x => x.level === 'warning').length;
    return Math.max(0, Math.min(100, Math.round(100 - critical * 30 - warnings * 18)));
  };
  const seo=group(findings.seo), performance=group(findings.performance), accessibility=group(findings.accessibility), security=group(findings.security), uiux=group(findings.uiux || []);
  const raw = Math.round(seo*.2 + performance*.2 + accessibility*.2 + security*.2 + uiux*.2);
  // This is a static assessment. Until real-browser visual and interaction checks run, do not present it as a near-perfect full-site audit.
  return {seo,performance,accessibility,security,uiux,overall:Math.min(79,raw),scoreType:'static-source-assessment',browserChecksComplete:false};
}
export default async function handler(req, res) {
  res.setHeader('Content-Type','application/json; charset=utf-8');
  res.setHeader('Cache-Control','no-store');
  if (req.method !== 'POST') { res.setHeader('Allow','POST'); return res.status(405).json({error:'Use POST to analyze a website.'}); }
  try {
    const input = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body || {});
    if (typeof input.url !== 'string' || input.url.length > 2048) return res.status(400).json({error:'Enter a website URL up to 2,048 characters long.'});
    const start = Date.now();
    const initialUrl = await validatePublicUrl(input.url);
    if (initialUrl.protocol !== 'https:' && initialUrl.protocol !== 'http:') return res.status(400).json({error:'Only public HTTP and HTTPS websites can be checked.'});
    const snapshotMode = typeof input.htmlSnapshot === 'string';
    if (snapshotMode && Buffer.byteLength(input.htmlSnapshot, 'utf8') > 3.5 * 1024 * 1024) return res.status(413).json({error:'Saved HTML snapshots must be 3.5 MB or smaller.'});
    const response = snapshotMode
      ? { ok: true, status: 200, statusText: 'Imported HTML snapshot', url: initialUrl.href, headers: { get: () => null } }
      : await safeFetch(initialUrl.href);
    if (!response.ok) return res.status(502).json({error:`The website returned HTTP ${response.status} ${response.statusText || ''}. Check the URL or try a public page that loads without a login.`.trim()});
    const contentType = snapshotMode ? 'text/html; charset=utf-8' : (response.headers.get('content-type') || '');
    if (!/text\/html|application\/xhtml\+xml/i.test(contentType)) return res.status(415).json({error:'That URL did not return an HTML page. Enter a website page, not an image, PDF or download.'});
    const body = snapshotMode ? Buffer.from(input.htmlSnapshot, 'utf8') : await readLimited(response);
    const html = body.toString('utf8');
    const finalUrl = response.url || initialUrl.href;
    const parsed = collectMeta(html, finalUrl);
    parsed.seo.sitemap = snapshotMode ? false : await sitemapExists(finalUrl);
    const securityChecks = [];
    const findings = {seo:[],performance:[],accessibility:[],security:[],uiux:[]};
    if (parsed.seo.title) findings.seo.push(finding('good','Page title found',`Title: “${parsed.seo.title.slice(0,140)}”`));
    else findings.seo.push(finding('warning','Missing page title','Search engines and browser tabs use the title to identify the page.','Add a concise, unique <title> in the document head.'));
    if (parsed.seo.title && parsed.seo.title.length > 60) findings.seo.push(finding('warning','Title may be long',`The title is ${parsed.seo.title.length} characters. Search snippets may truncate it.`,'Consider a descriptive title around 50–60 characters; this is a guideline, not a hard limit.'));
    if (parsed.seo.description) findings.seo.push(finding('good','Meta description found',`Found a ${parsed.seo.description.length}-character description.`));
    else findings.seo.push(finding('warning','Missing meta description','A summary can help searchers understand the page.','Add a useful <meta name="description" content="…"> to the document head.'));
    if (parsed.seo.h1Count===1) findings.seo.push(finding('good','One H1 heading detected','The page has a single top-level heading.'));
    else findings.seo.push(finding('warning',parsed.seo.h1Count===0?'No H1 heading detected':'Multiple H1 headings detected',`Found ${parsed.seo.h1Count} H1 headings in the HTML source.`,'Use a clear main heading and a logical heading hierarchy.'));
    if (parsed.seo.canonical) findings.seo.push(finding('good','Canonical URL is set',parsed.seo.canonical));
    else findings.seo.push(finding('warning','Canonical URL not found','A canonical helps indicate the preferred URL when duplicate versions exist.','Add a rel="canonical" link when your site needs a preferred URL.'));
    if (parsed.seo.openGraph) findings.seo.push(finding('good','Open Graph metadata detected','At least one common social preview property was found.'));
    else findings.seo.push(finding('warning','Social preview metadata missing','Open Graph tags can control how a page appears when shared.','Add og:title, og:description and og:image metadata.'));
    findings.seo.push(parsed.seo.sitemap ? finding('good','Sitemap signal detected','A sitemap.xml response or Sitemap directive in robots.txt was found.') : finding('info','Sitemap not detected','The standard sitemap URL and robots.txt were checked. This does not prove a sitemap is absent.','If useful for your site, publish a sitemap and reference it from robots.txt.'));
    if (parsed.seo.robots) findings.seo.push(finding('info','Robots directive found',parsed.seo.robots));
    else findings.seo.push(finding('info','No page-level robots directive found','Search engines generally apply their defaults when no directive is set.'));
    findings.performance.push(finding('info','HTML response size',`${(body.length/1024).toFixed(1)} KB of HTML was downloaded (compressed transfer size may differ).`));
    if (body.length > 500*1024) findings.performance.push(finding('warning','Large HTML document',`The HTML is about ${(body.length/1024).toFixed(0)} KB before compression.`,'Reduce repeated markup and inline payloads; defer large data blobs when possible.'));
    else findings.performance.push(finding('good','HTML document size looks modest','The HTML source is below 500 KB.'));
    findings.performance.push(finding(parsed.resources.length>80?'warning':'good','Page resource references',`Found ${parsed.resources.length} unique script, stylesheet and image URLs in the HTML source.`,parsed.resources.length>80?'Review unused assets, image delivery and script bundles.':undefined));
    findings.performance.push(finding(parsed.imagesWithoutDimensions>0?'warning':'good',parsed.imagesWithoutDimensions>0?'Some images lack dimensions':'Image dimensions look specified',`Found ${parsed.imagesWithoutDimensions} of ${parsed.images} image tags without both width and height attributes.`,parsed.imagesWithoutDimensions>0?'Set width and height attributes or an aspect-ratio to reduce layout shifts.':undefined));
    findings.performance.push(finding('info','Browser performance not simulated','Core Web Vitals, full request waterfalls, image transfer sizes and render-blocking behaviour require a real browser or field data.'));
    findings.accessibility.push(finding(parsed.accessibility.imagesWithoutAlt>0?'warning':'good',parsed.accessibility.imagesWithoutAlt>0?'Images missing alternative text':'Image alternative text check passed',`Found ${parsed.accessibility.imagesWithoutAlt} images with missing or empty alt attributes out of ${parsed.accessibility.images} image tags.`,parsed.accessibility.imagesWithoutAlt>0?'Add meaningful alt text to informative images. Use alt="" only for decorative images.':undefined));
    findings.accessibility.push(finding(parsed.accessibility.formIssues>0?'warning':'good',parsed.accessibility.formIssues>0?'Form controls may lack labels':'Form control label check passed',`Found ${parsed.accessibility.formIssues} of ${parsed.accessibility.formControls} controls without a detectable label, aria label or placeholder.`,'Associate every form control with a visible <label> or accessible name. Placeholder text alone is not a substitute for a label.'));
    findings.accessibility.push(finding(parsed.accessibility.headingSkips?'warning':'good',parsed.accessibility.headingSkips?'Heading levels may be skipped':'Heading hierarchy check passed',parsed.accessibility.headingSkips?'A heading level jumps by more than one in source order.':'No skipped heading levels were detected in the static source.',parsed.accessibility.headingSkips?'Keep headings in a logical order (for example H1, H2, H3).':undefined));
    findings.accessibility.push(finding('info','Contrast and keyboard use need a browser check','Colour contrast, focus visibility, keyboard interactions and dynamically rendered content cannot be reliably verified from HTML alone.'));
    findings.uiux.push(finding(parsed.uiux.hasViewport?'good':'warning',parsed.uiux.hasViewport?'Mobile viewport metadata detected':'Mobile viewport metadata missing',parsed.uiux.hasViewport?'The source declares a viewport, an important mobile-layout baseline.':'The source has no detectable viewport meta tag. Check mobile scaling and responsive behaviour.','Add <meta name="viewport" content="width=device-width, initial-scale=1"> to the document head when appropriate.'));
    findings.uiux.push(finding(parsed.uiux.linksWithoutHref?'warning':'good',parsed.uiux.linksWithoutHref?'Links without destinations detected':'Link destination markup check passed',parsed.uiux.linksWithoutHref+' of '+parsed.uiux.links+' anchor elements have no href attribute. This does not test whether destinations actually load.',parsed.uiux.linksWithoutHref?'Give navigation links a valid destination, or use a button for an action.':undefined));
    findings.uiux.push(finding(parsed.uiux.hasFavicon?'good':'warning',parsed.uiux.hasFavicon?'Favicon reference detected':'No favicon link detected',parsed.uiux.hasFavicon?'A link element references an icon asset.':'No icon link was detected in the source. Verify browser tab and saved-home-screen branding.','Provide a favicon and platform-appropriate home-screen icons.'));
    findings.uiux.push(finding(parsed.uiux.logoCandidates?'good':'info',parsed.uiux.logoCandidates?'Logo or brand image clue detected':'Logo could not be confirmed from image markup',parsed.uiux.logoCandidates?'Found '+parsed.uiux.logoCandidates+' image tag(s) whose alt, source or class mentions logo/brand.':'Logos may be implemented as CSS, inline SVG or components, so this heuristic may miss them.'));
    findings.uiux.push(finding(parsed.uiux.hasNavigation?'good':'info',parsed.uiux.hasNavigation?'Navigation landmark detected':'Navigation landmark not detected',parsed.uiux.hasNavigation?'A <nav> element is present in the HTML source.':'No <nav> element was detected; check whether navigation is clearly structured.'));
    findings.uiux.push(finding(parsed.uiux.hasMainLandmark?'good':'info',parsed.uiux.hasMainLandmark?'Main content landmark detected':'Main content landmark not detected',parsed.uiux.hasMainLandmark?'A <main> element is present in the HTML source.':'No <main> element was detected; confirm the page has a clear primary-content landmark.'));
    findings.uiux.push(finding('warning','Button and route functionality needs a browser test','The source contains '+parsed.uiux.buttons+' button element(s) and '+parsed.uiux.links+' link(s). Static HTML cannot confirm event handlers, destination response codes, login flows, overlays or page-to-page navigation.','Run browser-based smoke tests for every important button, form, menu and route at desktop and mobile widths.'));
    const resourceChecks = snapshotMode ? { checked: 0, failedImages: [], failedLinks: [], unverified: 0 } : await probePageResources(parsed, finalUrl);
    parsed.uiux.brokenImages = resourceChecks.failedImages.length;
    parsed.uiux.brokenLinks = resourceChecks.failedLinks.length;
    parsed.uiux.resourcesChecked = resourceChecks.checked;
    parsed.uiux.failedImageUrls = resourceChecks.failedImages.map(x => ({ url: x.url, status: x.status, reason: x.reason }));
    parsed.uiux.failedLinkUrls = resourceChecks.failedLinks.map(x => ({ url: x.url, status: x.status, reason: x.reason }));
    findings.uiux.push(finding(parsed.uiux.brokenImages ? 'critical' : snapshotMode || resourceChecks.checked === 0 ? 'info' : 'good', parsed.uiux.brokenImages ? 'Broken image assets detected' : snapshotMode ? 'Image delivery not verified from HTML export' : resourceChecks.checked === 0 ? 'No image/link resources available to probe' : 'Sampled image assets responded', `${parsed.uiux.brokenImages} of the checked image resources failed or returned an error. ${resourceChecks.checked} unique image/link URLs were probed in total.`, parsed.uiux.brokenImages ? 'Replace or repair the failing image URLs. Confirm brand logos use the correct official assets; this automated check cannot verify logo identity.' : 'Manually confirm logos and brand marks; a successful URL response does not prove the image is the right logo.'));
    findings.uiux.push(finding(parsed.uiux.brokenLinks ? 'critical' : 'info', parsed.uiux.brokenLinks ? 'Broken link destinations detected' : 'Link destinations need interaction verification', `${parsed.uiux.brokenLinks} of the sampled link destinations returned an error. A successful HTTP response still does not prove the destination or client-side navigation works.`, parsed.uiux.brokenLinks ? 'Fix the failing links and test important user journeys in a browser.' : 'Test navigation, forms and important user journeys in a real browser.'));
    findings.uiux.push(finding(parsed.uiux.newTabLinksWithoutRel ? 'warning' : 'good', parsed.uiux.newTabLinksWithoutRel ? 'New-tab links missing rel=noopener' : 'New-tab link isolation check passed', `${parsed.uiux.newTabLinksWithoutRel} links opening a new tab lack a detectable noopener rel token.`, parsed.uiux.newTabLinksWithoutRel ? 'Add rel="noopener" to links using target="_blank".' : undefined));
    findings.uiux.push(finding(parsed.uiux.brokenImages ? 'critical' : 'warning', 'Brand/logo identity requires visual review', 'HTML can reveal logo-related filenames and image failures, but cannot reliably tell whether a valid image is the correct logo for the claimed brand.', 'Compare every logo, favicon and brand icon against the official brand assets and check desktop/mobile rendering.'));
    const isHttps = !snapshotMode && finalUrl.startsWith('https://');
    const mixedContent = isHttps ? [...tags(html,'img').map(t=>attr(t,'src')), ...tags(html,'script').map(t=>attr(t,'src')), ...tags(html,'iframe').map(t=>attr(t,'src')), ...tags(html,'link').map(t=>attr(t,'href'))].filter(x=>/^http:\/\//i.test(x)) : [];
    const insecureForms = isHttps ? tags(html,'form').filter(t=>/^http:\/\//i.test(attr(t,'action'))) : [];
    const setCookie = response.headers.get('set-cookie') || '';
    const secretPatterns = [
      { name: 'Private key material', regex: /-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----/ },
      { name: 'AWS access key pattern', regex: /\bAKIA[0-9A-Z]{16}\b/ },
      { name: 'GitHub token pattern', regex: /\bgh[pousr]_[A-Za-z0-9_]{30,}\b/ },
      { name: 'Slack token pattern', regex: /\bxox[baprs]-[A-Za-z0-9-]{20,}\b/ }
    ];
    const exposedSecret = secretPatterns.find(x => x.regex.test(html));
    const securityChecks = [
      {name:'HTTPS transport',status:snapshotMode?'not-observed':isHttps?'pass':'fail',detail:snapshotMode?'An uploaded HTML snapshot cannot verify the live site’s transport security.':isHttps?'The analyzed page uses HTTPS.':'The final page URL is not HTTPS.',severity:snapshotMode?'info':isHttps?'good':'critical'},
      {name:'Mixed-content references',status:mixedContent.length?'fail':'pass',detail:`${mixedContent.length} HTTP resource reference(s) were found in the HTML of this ${isHttps?'HTTPS':'HTTP'} page.`,severity:mixedContent.length?'critical':'good'},
      {name:'Insecure form actions',status:insecureForms.length?'fail':'pass',detail:`${insecureForms.length} form(s) submit to an explicit HTTP URL.`,severity:insecureForms.length?'critical':'good'},
      {name:'Potential exposed secret',status:exposedSecret?'fail':'not-detected',detail:exposedSecret?`A ${exposedSecret.name} pattern was found in the downloaded HTML. Treat it as exposed and rotate it if genuine.`:'No high-confidence private-key or common token pattern was detected in the HTML. This is not a complete secret scan.',severity:exposedSecret?'critical':'good'},
      {name:'Cookie security attributes',status:setCookie?(/;\s*secure/i.test(setCookie)&&/;\s*httponly/i.test(setCookie)?'pass':'review'):'not-observed',detail:setCookie?`Set-Cookie was present; Secure: ${/;\s*secure/i.test(setCookie)?'yes':'not detected'}, HttpOnly: ${/;\s*httponly/i.test(setCookie)?'yes':'not detected'}, SameSite: ${/;\s*samesite=/i.test(setCookie)?'detected':'not detected'}.`:'No Set-Cookie header was observed on this response; session cookies may be set on other routes.',severity:setCookie&&(!/;\s*secure/i.test(setCookie)||!/;\s*httponly/i.test(setCookie))?'warning':'good'}
    ];
    for (const check of securityChecks) findings.security.push(finding(check.severity, check.name, check.detail, check.status==='fail' || check.status==='review' ? 'Review this control in the deployed application and verify it on authenticated routes as well.' : undefined));
    const scores=scoreAll(findings);
    const totalMs=Date.now()-start;
    return res.status(200).json({
      url:finalUrl,analyzedAt:new Date().toISOString(),durationMs:totalMs,
      page:{status:response.status,statusText:response.statusText,contentType},
      seo:parsed.seo,
      performance:{pageSizeBytes:body.length,pageSizeLabel:body.length>=1024*1024?(body.length/1024/1024).toFixed(2)+' MB':(body.length/1024).toFixed(1)+' KB',requests:parsed.resources.length,imageCount:parsed.images,imagesWithoutDimensions:parsed.imagesWithoutDimensions,scripts:parsed.scripts,stylesheets:parsed.stylesheets},
      accessibility:parsed.accessibility,
      uiux:parsed.uiux,
      security:{checks:securityChecks,headers:[]},
      scores,findings
    });
  } catch (error) {
    console.error('[FreeAssess] Website analysis failed:', error?.stack || error);
    const message = error?.message || 'Website analysis failed. Please try again.';
    const status = /only public|private|local network|resolve|valid website|username|safety|http and https|2,048/i.test(message) ? 400 : /25 MB|too long|redirect/i.test(message) ? 422 : 502;
    return res.status(status).json({error:message});
  }
}
