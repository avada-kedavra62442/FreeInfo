import React from 'react';
import { FaGithub, FaEnvelope, FaLinkedin } from 'react-icons/fa';

const OWNER_GITHUB = 'https://github.com/avada-kedavra62442/';
const EMAIL = 'aarav.krish62442@gmail.com';
const LINKEDIN = 'https://www.linkedin.com/in/aarav-krish-665702440/';
const FREEPDF_URL = 'https://free-pdf-delta.vercel.app/';
const FREECODE_URL = 'https://free-code-zeta.vercel.app/';

function Mark() {
  return <span className="brand-mark footer-mark"><svg width="23" height="23" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15V9l5 4 5-4v6"/></svg></span>;
}

export default function AppFooter() {
  return <footer className="site-footer">
    <div className="footer-main">
      <div className="footer-brand-block">
        <a className="footer-brand-row" href="/" aria-label="FreeInfo home"><Mark/><span className="footer-brand-name">Free<span>Info</span></span></a>
        <p className="footer-tagline">Useful software.<br/>Without the nonsense.</p>
        <div className="footer-status"><span className="footer-status-dot"/>Building useful things</div>
        <div className="footer-socials">
          <a className="footer-social-link" href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer" aria-label="GitHub" title="GitHub"><FaGithub/></a>
          <a className="footer-social-link" href={`mailto:${EMAIL}`} aria-label="Email" title="Email"><FaEnvelope/></a>
          <a className="footer-social-link" href={LINKEDIN} target="_blank" rel="noopener noreferrer" aria-label="LinkedIn" title="LinkedIn"><FaLinkedin/></a>
        </div>
      </div>
      <div className="footer-column"><span className="footer-heading">FREEINFO</span><a href="/">Home</a><a href="/assess">Website assessor</a><a href="/#capabilities">Capabilities</a><a href="/#how-it-works">How it works</a><a href="/#faq">FAQs</a></div>
      <div className="footer-column"><span className="footer-heading">ASSESSMENT</span><a href="/assess">Run an assessment</a><a href="/assess#report">Review findings</a><a href="/assess">Export a JSON report</a><span className="footer-note">SEO · Performance · Accessibility · Security</span></div>
      <div className="footer-column"><span className="footer-heading">FREE TOOLZ</span><a href={FREEPDF_URL} target="_blank" rel="noopener noreferrer">FreePDF ↗</a><a href={FREECODE_URL} target="_blank" rel="noopener noreferrer">FreeCode ↗</a><a href={`mailto:${EMAIL}?subject=FreeInfo%20Feedback`}>Send feedback</a><a href={OWNER_GITHUB} target="_blank" rel="noopener noreferrer">Developer profile ↗</a></div>
    </div>
    <div className="footer-bottom"><span>© {new Date().getFullYear()} FreeInfo. All rights reserved.</span><span className="footer-line"/><span>BUILT FOR THE WEB · BUILT TO BE USEFUL</span></div>
  </footer>;
}
