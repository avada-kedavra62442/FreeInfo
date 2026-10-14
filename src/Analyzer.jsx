import React, { useMemo, useState } from 'react';
import InstallAppButton from './components/InstallAppButton.jsx';
import AppFooter from './components/AppFooter.jsx';

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
  return (
    <div className="finding">
      <span className={'finding-icon ' + level}>
        <Icon name={level === 'good' ? 'check' : level === 'warning' || level === 'critical' ? 'alert' : 'scan'} size={17}/>
      </span>
      <div className="finding-copy">
        <strong>{item.title}</strong>
        <p>{item.detail}</p>
        {item.fix && <div className="finding-fix"><span>RECOMMENDED FIX</span>{item.fix}</div>}
      </div>
      <span className={'severity ' + level}>{level}</span>
    </div>
  );
}

// Dummy structures to satisfy variables used in lines 180-184
export default function Analyzer({ report = { url: '', scores: { overall: 0 }, analyzedAt: new Date() }, fixes = [], allFindings = [], sections = [], tab, setTab, copyReport, downloadReport, copied }) {
  return (
    <section className="analyzer-section">
      <div className="report-heading">
        <div>
          <div className="section-kicker">YOUR RESULTS</div>
          <h2>Website report<span className="title-period">.</span></h2>
          <p>Analysis for <a href={report.url} target="_blank" rel="noreferrer">{niceUrl(report.url)} <Icon name="external" size={13}/></a> · {new Date(report.analyzedAt).toLocaleString()}</p>
        </div>
        <div className="report-actions">
          <button className="ghost-button" onClick={copyReport}><Icon name="copy" size={16}/>{copied ? 'Copied!' : 'Copy JSON'}</button>
          <button className="solid-small" onClick={downloadReport}><Icon name="download" size={16}/> Download report</button>
        </div>
      </div>

      <div className="overall-card">
        <div className="overall-score">
          <div className={"big-ring " + grade(report.scores.overall)} style={{"--score": report.scores.overall}}>
            <div><strong>{report.scores.overall}</strong><small>OUT OF 100</small></div>
          </div>
        </div>
        <div className="overall-copy">
          <div className="score-overline"><span className="status-dot"/> YOUR WEBSITE HEALTH</div>
          <h3>{scoreLabel(report.scores.overall)}</h3>
          <p>{fixes.length ? `We found ${fixes.length} high-priority item${fixes.length === 1 ? '' : 's'} worth fixing. Start with the highest-impact recommendations below.` : 'No high-priority static issues were detected. Visual identity and interactive behavior still require real-browser verification.'}</p>
          <div className="overall-stats">
            <span><b>{allFindings.filter(x=>x.level==='good').length}</b> checks passed</span>
            <span><b>{fixes.length}</b> recommendations</span>
            <span><b>{report.performance?.requests ?? '—'}</b> page resources</span>
          </div>
          <p className="score-caveat">Static-source score only (maximum 79/100). Logo identity, visual polish, JavaScript button behavior, responsive layouts and complete user journeys are not verified by this server-side scan.</p>
        </div>
      </div>
    </section>
  );
}
