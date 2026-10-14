# FreeAssess — Free Website Assessor

FreeAssess is a free Emerald-and-Silver website assessor that turns accessible website signals into a practical list of improvements.

## Routes
- `/` — Long public homepage with features, workflow, FAQs and footer.
- `/assess` — Website assessment tool and downloadable report.

## What it checks
- SEO title, meta description, H1/H2 structure, canonical URL, robots directive, Open Graph metadata and sitemap signals.
- HTML source size (up to 25 MB), resource references, image count and image-dimension hints.
- Basic accessibility checks for image alternative text, form-control names and heading hierarchy.
- Security headers including CSP, HSTS, frame protection, MIME sniffing, referrer policy and permissions policy.
- Prioritized “Things you should fix” recommendations, category scorecards and downloadable JSON reports.
- Authorized login-protected page snapshots: save the current page as an HTML file while signed in, then upload it in the assessor. The saved HTML upload is limited to 3 MB and does not include original HTTP headers, scripts loaded later, or private API responses.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
Import this repository into Vercel with the default Vite settings. `api/analyze.js` is a Vercel serverless function. The `/assess` route is explicitly rewritten to the SPA entry point.

## Important limitations
A URL scan can inspect only the response FreeAssess can access. It does not sign in, bypass access controls, or ask for passwords/session cookies. Saved HTML snapshots cover static markup only; they cannot reproduce authenticated interactions or reveal original response headers. JavaScript-rendered UI, real network waterfalls, exact image transfer sizes, Core Web Vitals, colour contrast and keyboard behaviour require browser-based checks.

The URL analyzer rejects local/private IP ranges and validates redirect destinations. The 25 MB HTML limit is a practical serverless limit, not an unlimited or terabyte-scale crawler. Results are directional signals, not a certification or substitute for a professional audit.

Built to be free: no account, paid API key, or external analysis service is required.
