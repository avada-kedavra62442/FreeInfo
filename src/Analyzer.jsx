import React, { useMemo, useState } from 'react';

const Icon = ({ name, size = 18 }) => {
  const common = { width: size, height: size, viewBox: '0 0 24 24', fill: 'none', stroke: 'currentColor', strokeWidth: 1.7, strokeLinecap: 'round', strokeLinejoin: 'round', 'aria-hidden': true };
  const paths = {
    scan: <><circle cx="11" cy="11" r="7"/><path d="m20 20-4-4M8 11h6M11 8v6"/></>,
    globe: <><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,
    shield: <><path d="M12 22s8-4 8-11V5l-8-3-8 3v6c0 7 8 11 8 11Z"/><path d="m9 12 2 2 4-4"/></>,
    gauge: <><path d="M20 13a8 8 0 1 0-16 0"/><path d="m12 13 4-5"/><circle cx="12" cy="13" r="1"/></>,
    accessibility: <><circle cx="12" cy="4" r="1.5"/><path d="M4 7h16M12 7v5m0 0-4 8m4-8 4 8"/></>,
    search: <><circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4 4"/></>,
    arrow: <><path d="M5 12h14M13 6l6 6-6 6"/></>,
    check: <path d="m5 12 4 4L19 6"/>,
    alert: <><path d="M12 3 2.8 19h18.4L12 3Z"/><path d="M12 9v4m0 3h.01"/></>,
    copy: <><rect x="8" y="8" width="12" height="12" rx="2"/><path d="M16 8V5a2 2 0 0 0-2-2H5a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h3"/></>,
    download: <><path d="M12 3v12m-5-5 5 5 5-5"/><path d="M5 17v4h14v-4"/></>,
    lock: <><rect x="4" y="10" width="16" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></>,
    clock: <><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></>,
    external: <><path d="M14 3h7v7M10 14 21 3"/><path d="M19 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2h6"/></>,
    logo: <><path d="M4 5h16v14H4z"/><path d="M8 15V9l4 4 4-4v6"/></>
  };
  return <svg {...common}>{paths[name] || paths.globe}</svg>;
};

const grade = (score) => score >= 85 ? 'strong' : score >= 60 ? 'medium' : 'weak';
const scoreLabel = (score) => score >= 85 ? 'Looking good' : score >= 60 ? 'Room to improve' : 'Needs attention';
const niceUrl = (value) => { try { return new URL(value).hostname.replace(/^www\./, ''); } catch { return value; } };

function ScoreCard({ title, icon, score, detail }) {
  return <div className="score-card">
    <div className="score-card-top"><span className="score-icon"><Icon name={icon}/></span><span className="score-number">{score}<small>/100</small></span></div>
    <div className="score-track"><span className={grade(score)} style={{ width: score + '%' }}/></div>
    <strong>{title}</strong><span className="muted small">{detail}</span>
  </div>;
}

function Finding({ item }) {
  const level = item.level || 'info';
  return <div className="finding">
    <span className={'finding-icon ' + level}><Icon name={level === 'good' ? 'check' : level === 'warning' ? 'alert' : 'scan'} size={17}/></span>
    <div className="finding-copy"><strong>{item.title}</strong><p>{item.detail}</p>{item.fix && <div className="finding-fix"><span>RECOMMENDED FIX</span>{item.fix}</div>}</div>
    <span className={'severity ' + level}>{level === 'good' ? 'PASS' : level === 'warning' ? 'CHECK' : 'INFO'}</span>
  </div>;
}

function Analyzer() {
  const [url, setUrl] = useState('');
  const [htmlFile, setHtmlFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [report, setReport] = useState(null);
  const [tab, setTab] = useState('overview');
  const [copied, setCopied] = useState(false);

  const allFindings = useMemo(() => report ? [
    ...(report.findings?.seo || []),
    ...(report.findings?.performance || []),
    ...(report.findings?.accessibility || []),
    ...(report.findings?.security || [])
  ] : [], [report]);
  const fixes = allFindings.filter(x => x.level === 'warning');

  async function analyze(event) {
    event?.preventDefault();
    setError('');
    setReport(null);
    setCopied(false);
    let clean = url.trim();
    if (!clean) { setError('Enter a website URL to get started.'); return; }
    if (!/^https?:\/\//i.test(clean)) clean = 'https://' + clean;
    try {
      const parsed = new URL(clean);
      if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Only public HTTP and HTTPS websites can be checked.');
      if (!parsed.hostname.includes('.') || parsed.hostname === 'localhost') throw new Error('Enter a full public domain, such as example.com.');
      setUrl(parsed.href);
      const htmlSnapshot = htmlFile ? await htmlFile.text() : null;
      if (htmlSnapshot && htmlSnapshot.length > 3 * 1024 * 1024) throw new Error('For login-protected pages, the saved HTML file must be 3 MB or smaller. Try saving only the current page as HTML.');
      setBusy(true);
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 55000);
      let response;
      try {
        response = await fetch('/api/analyze', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: parsed.href, ...(htmlSnapshot ? { htmlSnapshot } : {}) }), signal: controller.signal });
      } finally { clearTimeout(timeout); }
      const data = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(data.error || 'The website could not be checked. Try again with its homepage URL.');
      setReport(data);
      setTab('overview');
      document.getElementById('report')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (e) {
      setError(e.name === 'AbortError' ? 'This website took too long to respond. Try a smaller or faster public page.' : (e.message || 'Something went wrong. Please try again.'));
    } finally { setBusy(false); }
  }

  async function copyReport() {
    try {
      await navigator.clipboard.writeText(JSON.stringify(report, null, 2));
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch { setError('Clipboard access was blocked by your browser. Use Download report instead.'); }
  }
  function downloadReport() {
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = (niceUrl(report.url) || 'website') + '-freeinfo-report.json';
    link.click();
    URL.revokeObjectURL(link.href);
  }

  const sections = report ? [
    { id: 'seo', title: 'SEO', icon: 'search', count: report.findings.seo.length },
    { id: 'performance', title: 'Performance', icon: 'gauge', count: report.findings.performance.length },
    { id: 'accessibility', title: 'Accessibility', icon: 'accessibility', count: report.findings.accessibility.length },
    { id: 'security', title: 'Security', icon: 'shield', count: report.findings.security.length }
  ] : [];

  return <div className="app-shell">
    <header className="topbar">
      <a className="brand" href="#" aria-label="FreeInfo home"><span className="brand-mark"><Icon name="logo" size={23}/></span><span>Free<span className="brand-accent">Info</span><small>WEBSITE TOOLKIT</small></span></a>
      <nav className="topnav"><a href="#features">What we check</a><a href="#how-it-works">How it works</a><span className="nav-pill"><span/>Free forever</span></nav>
      <a className="github-link" href="https://github.com/avada-kedavra62442/FreeInfo" target="_blank" rel="noreferrer"><Icon name="external" size={16}/> GitHub</a>
    </header>

    <main>
      <section className="hero">
        <div className="hero-glow glow-one"/><div className="hero-glow glow-two"/>
        <div className="hero-content">
          <div className="eyebrow"><span className="eyebrow-line"/> THE WEBSITE HEALTH CHECK <span className="eyebrow-dot">✦</span></div>
          <h1>Know your website.<br/><span>Make it better.</span></h1>
          <p className="hero-copy">A clear, practical audit of your website's SEO, performance, accessibility and security — without the jargon or the price tag.</p>
          <form className="url-form" onSubmit={analyze}>
            <span className="url-icon"><Icon name="globe" size={20}/></span>
            <input aria-label="Website URL" value={url} onChange={e => setUrl(e.target.value)} placeholder="Enter a website URL — example.com" disabled={busy}/>
            <button type="submit" disabled={busy}>{busy ? <><span className="spinner"/> Checking…</> : <>Analyze website <Icon name="arrow" size={18}/></>}</button>
          </form>
          <div className="snapshot-upload">
            <label htmlFor="snapshot-file">Assess a page that requires login <span>While signed in, save the page as an HTML file and attach it here. FreeInfo assesses the saved markup without receiving your password or session cookies.</span></label>
            <input id="snapshot-file" type="file" accept=".html,.htm,text/html" disabled={busy} onChange={e => setHtmlFile(e.target.files?.[0] || null)} />
            {htmlFile && <p className="snapshot-selected">Selected: {htmlFile.name}</p>}
          </div>
          {error && <div className="error-message" role="alert"><Icon name="alert" size={17}/>{error}</div>}
          <div className="trust-row"><span><Icon name="lock" size={14}/> No account needed</span><i/><span><Icon name="check" size={14}/> No paid API</span><i/><span><Icon name="clock" size={14}/> Usually under a minute</span></div>
          {busy && <div className="scan-progress"><div/><p>Checking page content, response headers and key resources. HTML responses up to 25 MB can be assessed; larger sites may take a little longer.</p></div>}
        </div>
        <div className="hero-art" aria-hidden="true">
          <div className="orbit orbit-a"/><div className="orbit orbit-b"/>
          <div className="scanner-card"><div className="scanner-head"><span className="mini-brand"><Icon name="logo" size={15}/></span><span>WEBSITE SCAN</span><span className="live-dot"/></div>
            <div className="scanner-url"><span className="secure-dot"/> example.com <span className="scan-chip">READY</span></div>
            <div className="mock-score"><div className="mock-ring"><div><strong>92</strong><small>HEALTH</small></div></div><div className="mock-lines"><span/><span/><span/></div></div>
            <div className="mock-checks"><div><span className="mock-check"><Icon name="check" size={12}/></span> SEO signals <b>GOOD</b></div><div><span className="mock-check"><Icon name="check" size={12}/></span> Secure headers <b>GOOD</b></div><div><span className="mock-warn"><Icon name="alert" size={12}/></span> Image weight <b className="warm">REVIEW</b></div></div>
          </div>
          <div className="float-tag tag-left"><span className="tag-icon"><Icon name="shield" size={16}/></span><span><b>Security scan</b><small>Headers checked</small></span></div>
          <div className="float-tag tag-right"><span className="tag-icon"><Icon name="gauge" size={16}/></span><span><b>Performance</b><small>Resource insights</small></span></div>
          <div className="art-spark spark-a">✦</div><div className="art-spark spark-b">✧</div>
        </div>
        <div className="hero-bottom"><span>BUILT FOR THE OPEN WEB</span><div/><span>USEFUL SOFTWARE. WITHOUT THE NONSENSE.</span></div>
      </section>

      {report && <section id="report" className="report-section">
        <div className="report-heading"><div><div className="section-kicker">YOUR RESULTS</div><h2>Website report<span className="title-period">.</span></h2><p>Analysis for <a href={report.url} target="_blank" rel="noreferrer">{niceUrl(report.url)} <Icon name="external" size={13}/></a> · {new Date(report.analyzedAt).toLocaleString()}</p></div><div className="report-actions"><button className="ghost-button" onClick={copyReport}><Icon name="copy" size={16}/>{copied ? 'Copied!' : 'Copy JSON'}</button><button className="solid-small" onClick={downloadReport}><Icon name="download" size={16}/> Download report</button></div></div>
        <div className="overall-card"><div className="overall-score"><div className={'big-ring ' + grade(report.scores.overall)} style={{'--score': report.scores.overall}}><div><strong>{report.scores.overall}</strong><small>OUT OF 100</small></div></div></div><div className="overall-copy"><div className="score-overline"><span className="status-dot"/> YOUR WEBSITE HEALTH</div><h3>{scoreLabel(report.scores.overall)}</h3><p>{fixes.length ? `We found ${fixes.length} item${fixes.length === 1 ? '' : 's'} worth fixing. Start with the highest-impact recommendations below.` : 'No major issues were detected by these automated checks. A manual review can still uncover more.'}</p><div className="overall-stats"><span><b>{allFindings.filter(x=>x.level==='good').length}</b> checks passed</span><span><b>{fixes.length}</b> recommendations</span><span><b>{report.performance?.requests ?? '—'}</b> page resources</span></div></div></div>
        <div className="score-grid">{sections.map(s => <ScoreCard key={s.id} title={s.title} icon={s.icon} score={report.scores[s.id]} detail={s.count + (s.count === 1 ? ' finding' : ' findings')}/>)}</div>
        <div className="report-tabs">{[{id:'overview',label:'Overview'},{id:'seo',label:'SEO'},{id:'performance',label:'Performance'},{id:'accessibility',label:'Accessibility'},{id:'security',label:'Security'}].map(t => <button key={t.id} className={tab===t.id?'active':''} onClick={()=>setTab(t.id)}>{t.label}{t.id!=='overview' && <span>{report.findings[t.id].length}</span>}</button>)}</div>
        {tab==='overview' ? <div className="overview-grid"><div className="panel-card"><div className="panel-title"><span className="panel-title-icon"><Icon name="alert" size={17}/></span><div><h3>Things you should fix</h3><p>Prioritized suggestions from your scan</p></div></div>{fixes.length ? fixes.slice(0,8).map((f,i)=><Finding key={i} item={f}/>) : <div className="empty-state"><Icon name="check" size={22}/><strong>Nothing urgent found</strong><p>Great start. Review the category tabs for more details.</p></div>}</div><div className="panel-card details-card"><div className="panel-title"><span className="panel-title-icon"><Icon name="globe" size={17}/></span><div><h3>Page snapshot</h3><p>What FreeInfo could read</p></div></div><dl><dt>Page title</dt><dd>{report.seo.title || 'Not found'}</dd><dt>Meta description</dt><dd>{report.seo.description || 'Not found'}</dd><dt>HTTP status</dt><dd><span className="status-value">{report.page.status} {report.page.statusText}</span></dd><dt>Page size</dt><dd>{report.performance.pageSizeLabel}</dd><dt>Canonical URL</dt><dd className="break-word">{report.seo.canonical || 'Not specified'}</dd><dt>Sitemap</dt><dd>{report.seo.sitemap ? 'Detected' : 'Not detected'}</dd></dl><div className="note-box"><Icon name="lock" size={15}/><p>{report.page.statusText === 'Imported HTML snapshot' ? 'This report uses the HTML file you supplied. Original HTTP headers, scripts loaded later, and private API responses are not included.' : 'Only publicly accessible page content and response headers were checked. No website changes were made.'}</p></div></div></div> :
          <div className="panel-card category-panel"><div className="panel-title"><span className="panel-title-icon"><Icon name={sections.find(s=>s.id===tab)?.icon || 'scan'} size={17}/></span><div><h3>{sections.find(s=>s.id===tab)?.title} checks</h3><p>Signals collected from the public page</p></div></div>{(report.findings[tab]||[]).map((f,i)=><Finding key={i} item={f}/>)}
          {tab==='seo' && <div className="data-grid"><div><span>H1 headings</span><b>{report.seo.h1Count}</b></div><div><span>H2 headings</span><b>{report.seo.h2Count}</b></div><div><span>Open Graph</span><b>{report.seo.openGraph ? 'Detected' : 'Missing'}</b></div><div><span>Robots directive</span><b>{report.seo.robots || 'Default'}</b></div></div>}
          {tab==='performance' && <div className="data-grid"><div><span>HTML transfer size</span><b>{report.performance.pageSizeLabel}</b></div><div><span>Detected resources</span><b>{report.performance.requests}</b></div><div><span>Images</span><b>{report.performance.imageCount}</b></div><div><span>Images without dimensions</span><b>{report.performance.imagesWithoutDimensions}</b></div></div>}
          {tab==='accessibility' && <div className="note-box"><Icon name="alert" size={15}/><p>Automated checks cannot replace assistive-technology testing. Colour contrast and keyboard behaviour should be reviewed in a real browser.</p></div>}
          {tab==='security' && <div className="data-grid">{report.security.headers.map(h=><div key={h.name}><span>{h.name}</span><b className={h.present?'good-text':'warn-text'}>{report.page.statusText === 'Imported HTML snapshot' ? 'Not in snapshot' : h.present ? 'Present' : 'Missing'}</b></div>)}</div>}
          </div>}
        <p className="report-disclaimer">Automated results are best-effort signals, not a certification or a substitute for a full audit. Third-party resources, JavaScript-rendered content and browser-only behaviour may not be fully visible.</p>
      </section>}

      {false && !report && <section id="features" className="features-section">
        <div className="section-intro"><div className="section-kicker">ONE SCAN. FOUR PERSPECTIVES.</div><h2>More clarity.<br/><span>Less guesswork.</span></h2><p>Useful checks that turn technical website signals into a to-do list you can actually use.</p></div>
        <div className="feature-grid">
          <article className="feature-card"><div className="feature-icon"><Icon name="search" size={21}/></div><span className="feature-index">01 / DISCOVERABILITY</span><h3>SEO essentials</h3><p>See the title, description, heading structure, canonical URL, robots hints, sitemap and social preview metadata.</p><div className="feature-foot"><span/>Help people and search engines understand your page.</div></article>
          <article className="feature-card"><div className="feature-icon"><Icon name="gauge" size={21}/></div><span className="feature-index">02 / SPEED SIGNALS</span><h3>Performance</h3><p>Inspect HTML size, response timing, detected resources, images and potential asset-weight hotspots.</p><div className="feature-foot"><span/>Find obvious opportunities to trim the load.</div></article>
          <article className="feature-card"><div className="feature-icon"><Icon name="accessibility" size={21}/></div><span className="feature-index">03 / INCLUSIVE UX</span><h3>Accessibility</h3><p>Catch missing image alternatives, unlabeled forms, skipped heading levels and other common markup issues.</p><div className="feature-foot"><span/>Make your content easier for more people.</div></article>
          <article className="feature-card"><div className="feature-icon"><Icon name="shield" size={21}/></div><span className="feature-index">04 / SAFER DEFAULTS</span><h3>Security headers</h3><p>Check important response headers including CSP, HSTS, frame protection, content-type protection and referrer policy.</p><div className="feature-foot"><span/>Spot missing layers of browser-side protection.</div></article>
        </div>
      </section>}

      {false && <section id="how-it-works" className="how-section"><div className="section-kicker">SIMPLE BY DESIGN</div><h2>From URL to action plan.</h2><div className="steps"><div><span>01</span><h3>Enter a public URL</h3><p>Start with a page you want to understand.</p></div><div><span>02</span><h3>Run the checks</h3><p>FreeInfo inspects page markup and response headers.</p></div><div><span>03</span><h3>Make improvements</h3><p>Use clear findings and exportable results to plan your next steps.</p></div></div></section>}
      {false && <section className="closing-cta"><div><div className="section-kicker">YOUR NEXT IMPROVEMENT STARTS HERE</div><h2>A better website begins<br/>with <span>better information.</span></h2></div><button onClick={()=>{document.querySelector('.url-form input')?.focus();window.scrollTo({top:0,behavior:'smooth'});}}>Analyze a website <Icon name="arrow" size={18}/></button></section>
    </section>}
    </main>

    <footer className="footer"><div className="footer-top"><a className="brand footer-brand" href="#"><span className="brand-mark"><Icon name="logo" size={23}/></span><span>Free<span className="brand-accent">Info</span><small>WEBSITE TOOLKIT</small></span></a><p>Useful software. Without the nonsense.</p><a className="footer-github" href="https://github.com/avada-kedavra62442/FreeInfo" target="_blank" rel="noreferrer"><Icon name="external" size={15}/> Open-source home</a></div><div className="footer-bottom"><span>© {new Date().getFullYear()} FreeInfo. Built for the open web.</span><span><Icon name="lock" size={13}/> No account · No paid API · No nonsense</span><a href="https://github.com/avada-kedavra62442/FreeInfo" target="_blank" rel="noreferrer">Source code <Icon name="arrow" size={13}/></a></div></footer>
  </div>;
}


export default Analyzer;
