# Firecrawl outputs

This folder stores deterministic crawl/map artifacts per website slug:

- `raw/firecrawl/<slug>/map.json` (JSON; generated with `--json --pretty`)
- `raw/firecrawl/<slug>/crawl.json` (pretty JSON)
- `raw/firecrawl/<slug>/meta.json` (timings, config hash, job id, counts, fallback info)
- `raw/firecrawl/<slug>/status.json` (failure-only status dump)
- `raw/firecrawl/<slug>/errors.json` (failure-only errors dump)
- `raw/firecrawl/<slug>/violations.json` (only when listing policy is violated)
- `raw/firecrawl/<slug>/scrape/` (scrape-only fallback outputs + manifest)
- `raw/firecrawl/<slug>/pages/` (per-page HTML/markdown if exported)
- `raw/firecrawl/<slug>/images.json`
- `raw/firecrawl/<slug>/branding.json`

Usage: run the helper scripts in `scripts/firecrawl/` (see root README) to populate the slugged folder before downstream processing.

Policy reminder: downstream pipelines must exclude listing/exposé URLs (e.g. `angebote`, `objekte`, `expose`, `exposes`, `listing`, `angebot`) from training or publishing.

## Workflow (Makler)

0) Auth check: `npm install -g firecrawl-cli` and `PATH=$(npm config get prefix)/bin:$PATH firecrawl --status` (or set `FIRECRAWL_API_KEY`).
1) Map: `npm run firecrawl:map -- --url https://example.com --slug example` → `raw/firecrawl/example/map.json` (JSON; map supports `--json --pretty`, no `--wait`).
2) Crawl: `npm run firecrawl:crawl -- --url https://example.com --slug example` → `raw/firecrawl/example/crawl.json` + `meta.json` (uses `config/firecrawl.makler.json`; crawl supports `--wait`/`--poll-interval`/`--timeout`; failures dump `status.json` + `errors.json` and signal scrape-only fallback).
3) Scrape-only fallback: `node scripts/firecrawl/scrape-whitelist.mjs --url https://example.com --slug example` → `raw/firecrawl/example/scrape/*.json` + `manifest.json`.
4) Generate brand/home: `npm run brand:from-firecrawl -- --slug example` → writes `src/data/brands/example/{brand.json,home.json}` (fails fast and writes `raw/firecrawl/example/violations.json` if listing patterns found; works with crawl.json or scrape-only outputs).
5) Run: `BRAND_SLUG=example npm run build` (preferred in Conductor; run `npm run dev` manually if needed).

## No Listings Policy

Forbidden patterns (URLs/content): `/angebote`, `/angebot`, `/immobilien`, `/objekte`, `/expose`, `/exposé`, `/listing`, `/property`, `/inserat`, `/kaufen`, `/mieten`. If detected, generation fails and logs `violations.json` under the slugged folder.
