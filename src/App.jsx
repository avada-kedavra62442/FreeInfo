import React from 'react';
import Analyzer from './Analyzer.jsx';
import InstallAppButton from './components/InstallAppButton.jsx';
import AppFooter from './components/AppFooter.jsx';

const Arrow = () => <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>;
const Mark = () => <span className="brand-mark"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15V9l5 4 5-4v6"/></svg></span>;
const features = [
  { n:'01', icon:'⌕', label:'DISCOVERABILITY', title:'SEO essentials', text:'Review titles, descriptions, headings, canonical URLs, sitemap signals, robots directives and social-sharing metadata.' },
  { n:'02', icon:'↗', label:'SPEED SIGNALS', title:'Performance clues', text:'Inspect HTML weight, image markup and resource references to uncover practical places to investigate.' },
  { n:'03', icon:'◉', label:'INCLUSIVE UX', title:'Accessibility basics', text:'Flag missing image alternatives, form controls without clear labels and heading hierarchy issues.' },
  { n:'04', icon:'◇', label:'SAFER DEFAULTS', title:'Security headers', text:'Review important browser security headers and get plain-language suggestions for missing protections.' }
];
function HomePage() {
 return <div className="app-shell home-page">
  <header className="topbar">
   <a className="brand" href="/" aria-label="FreeAssess homepage"><Mark/><span>Free<span className="brand-accent">Assess</span><small>WEBSITE ASSESSER</small></span></a>
   <nav className="topnav"><a href="#capabilities">Capabilities</a><a href="#how-it-works">How it works</a><a href="#faq">FAQ</a><span className="nav-pill"><span/>Free forever</span></nav>
   <InstallAppButton />
  </header>
  <main>
   <section className="home-hero">
    <div className="home-hero-copy">
     <div className="eyebrow"><span className="eyebrow-line"/> A CLEARER VIEW OF YOUR WEBSITE <span className="eyebrow-dot">✦</span></div>
     <h1>Your website,<br/><span>understood.</span></h1>
     <p className="hero-copy">A practical first-pass website quality review for product teams, agencies and engineering teams. Surface meaningful SEO, performance, accessibility and security-header issues, then turn findings into a prioritized fix list — without paywalls or confusing jargon.</p>
     <div className="home-actions"><a className="home-primary" href="/assess">Assess a website <Arrow/></a><a className="home-secondary" href="#capabilities">Explore capabilities <span>↓</span></a></div>
     <div className="trust-row"><span>✓ Free to use</span><i/><span>✓ No account required</span><i/><span>✓ No paid API</span></div>
    </div>
    <div className="home-visual" aria-hidden="true"><div className="home-orbit orbit-a"/><div className="home-orbit orbit-b"/>
     <div className="home-dashboard"><div className="dashboard-top"><span className="dashboard-mark"><Mark/></span><span>WEBSITE ASSESSMENT</span><span className="live-dot"/></div><div className="dashboard-domain"><span className="secure-dot"/> example.com <span className="scan-chip">READY TO CHECK</span></div>
      <div className="dashboard-score"><div className="dashboard-ring"><strong>92</strong><small>HEALTH</small></div><div className="dashboard-bars"><span/><span/><span/><small>Illustrative preview — not a real scan</small></div></div>
      <div className="dashboard-row"><span>✓</span><div><b>SEO essentials</b><small>Metadata and headings</small></div><em>REVIEW</em></div>
      <div className="dashboard-row"><span>✓</span><div><b>Security headers</b><small>Browser-side protections</small></div><em>REVIEW</em></div>
      <div className="dashboard-row"><span>↗</span><div><b>Actionable findings</b><small>Plain-language suggestions</small></div><em>READY</em></div>
     </div><div className="home-float home-float-left">✦ <span>Clarity over jargon</span></div><div className="home-float home-float-right">◇ <span>Built for the open web</span></div>
    </div>
    <div className="home-hero-foot"><span>USEFUL SOFTWARE. WITHOUT THE NONSENSE.</span><span>EMERALD / SILVER EDITION</span></div>
   </section>
   <section className="home-intro"><div className="section-kicker">WHY FREEASSESS EXISTS</div><h2>Good decisions start with<br/><span>knowing what to improve.</span></h2><p>Built for professional workflows, FreeAssess helps teams triage visible website quality issues, share a JSON report, and decide what to fix first. It is a useful first-pass assessment — not a replacement for browser-based performance testing, manual accessibility review, or a full security audit.</p></section>
   <section id="capabilities" className="features-section home-features"><div className="section-intro"><div className="section-kicker">ONE ASSESSMENT. FOUR PERSPECTIVES.</div><h2>Useful checks.<br/><span>Understandable results.</span></h2><p>Start with the essentials, see what was detected, then use the recommended fixes as a practical checklist.</p></div>
    <div className="feature-grid">{features.map(f=><article className="feature-card" key={f.n}><div className="feature-icon home-feature-symbol">{f.icon}</div><span className="feature-index">{f.n} / {f.label}</span><h3>{f.title}</h3><p>{f.text}</p><div className="feature-foot"><span/>Clear findings, not a wall of jargon.</div></article>)}</div>
   </section>
   <section className="home-detail-grid"><div className="home-detail-copy"><div className="section-kicker">MADE TO BE USEFUL</div><h2>From a URL to a<br/><span>prioritized improvement plan.</span></h2><p>FreeAssess collects accessible page markup and response-header signals, groups the results into familiar categories, and explains why a finding may matter. Export the report to share it or keep a record of what you checked.</p><a className="text-link" href="/assess">Open the assessor <Arrow/></a></div><div className="home-checklist"><div className="checklist-head"><span>ASSESSMENT CHECKLIST</span><span className="nav-pill"><span/> 5 categories</span></div>{[['SEO','Titles, descriptions, headings and canonical hints'],['Performance','HTML size, images and resource references'],['Accessibility','Image alternatives, labels and heading order'],['Security','HTTPS, mixed content, insecure forms and exposed secrets'],['UI/UX','Broken assets, link destinations, brand consistency and interaction gaps']].map(([t,d],i)=><div className="checklist-item" key={t}><span className="checklist-number">0{i+1}</span><div><b>{t}</b><p>{d}</p></div><Arrow/></div>)}<p className="checklist-note">Automated checks are best-effort signals. They do not replace a full professional or manual audit.</p></div></section>
   <section id="how-it-works" className="how-section home-how"><div className="section-kicker">SIMPLE BY DESIGN</div><h2>Three steps. No unnecessary friction.</h2><div className="steps"><div><span>01</span><h3>Enter a website</h3><p>Start with the URL of the page you want to assess.</p></div><div><span>02</span><h3>Review the signals</h3><p>FreeAssess checks the HTML response and selected security headers that it can access.</p></div><div><span>03</span><h3>Choose your next steps</h3><p>Read the recommendations, inspect category details and download your report.</p></div></div></section>
   <section className="home-boundaries"><div><div className="section-kicker">HONEST BY DESIGN</div><h2>Clear about what we can —<br/><span>and cannot — see.</span></h2></div><div className="boundaries-copy"><p>FreeAssess does not break into websites, bypass access controls, or try to retrieve private information. A normal URL scan can only inspect what the service can legitimately access. Login-protected pages may require an owner-provided export or a future browser-based assessment workflow.</p><p>JavaScript-rendered interfaces, real-world Core Web Vitals, authenticated user flows and complete security testing may need browser tools or a dedicated audit. We avoid pretending a quick scan proves a site is perfectly safe.</p></div></section>
   <section id="faq" className="home-faq"><div className="section-kicker">GOOD QUESTIONS</div><h2>Frequently asked questions.</h2><div className="faq-grid"><article><h3>Is FreeAssess really free?</h3><p>Yes. The goal is to keep useful website checks accessible without a subscription, paid API key or account requirement.</p></article><article><h3>Does it change my website?</h3><p>No. The assessor reads accessible responses and reports observations. It does not edit or publish anything to the site being checked.</p></article><article><h3>Can it assess a page behind a login?</h3><p>A server-side URL scan cannot use your existing browser login session. Do not submit passwords or session cookies. Authenticated assessment needs a safe browser-side workflow or an HTML export supplied by an authorized site owner.</p></article><article><h3>Does a high score guarantee security?</h3><p>No. Results are automated indicators and can miss issues. Use them as a starting checklist, not as a certification or penetration test.</p></article></div></section>
   <section className="closing-cta home-closing"><div><div className="section-kicker">READY WHEN YOU ARE</div><h2>Know what to improve.<br/><span>Start with FreeAssess.</span></h2><p>Free website assessment. Clear recommendations. No nonsense.</p></div><a className="home-primary" href="/assess">Start an assessment <Arrow/></a></section>
  </main>
  <AppFooter />
 </div>;
}
export default function App() {
 const path = window.location.pathname.replace(/\/+$/, '') || '/';
 return path === '/assess' ? <Analyzer/> : <HomePage/>;
}
