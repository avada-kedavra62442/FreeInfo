# FreeInfo — Website Toolkit

FreeInfo is a free, dark emerald-and-silver website analyzer. Enter a public URL to inspect SEO basics, performance signals, accessibility markup and security response headers.

## Features
- SEO title, meta description, H1/H2 structure, canonical URL, robots directive, Open Graph metadata and sitemap signal.
- HTML source size, resource references, image count and image dimension hints.
- Basic accessibility checks for image alt text, form-control names and heading hierarchy.
- Security header checks for CSP, HSTS, frame protection, MIME sniffing, referrer policy and permissions policy.
- Prioritized "Things you should fix" suggestions, scorecards and downloadable JSON reports.
- Responsive design, custom SVG favicon/app icon, and reduced-motion support.

## Run locally
```bash
npm install
npm run dev
```

## Deploy
Import this repository into Vercel with the default Vite settings. The `api/analyze.js` file is a Vercel serverless function.

## Important limitations
FreeInfo analyzes publicly accessible HTML and response headers. It does not run the target site's JavaScript in a browser, so client-rendered UI, full network waterfalls, exact image transfer sizes, Core Web Vitals, colour contrast and keyboard behaviour cannot be completely audited. Scores are directional signals, not a certification.

The analyzer rejects local/private IP ranges and validates redirect destinations. Do not treat an automated scan as a substitute for a professional security, SEO or accessibility audit.

Built to be free: no account, paid API, analytics SDK or external analysis service is required.
