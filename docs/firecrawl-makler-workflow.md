# Firecrawl Makler Workflow

**Goal:** reproducible "Map → Crawl → Generate → Run" flow for a Makler brand without touching real listings.

## RULE / HOW TO USE

0) Auth check
- Install: `npm install -g firecrawl-cli` (binary is `firecrawl`).
- `firecrawl --status` (needs `PATH` to include `$HOME/.npm-global/bin` if you use the local prefix)
- Authenticate: set `FIRECRAWL_API_KEY` (see `.env.example`) or run `firecrawl login`.

1) Map
- `npm run firecrawl:map -- --url https://example.com --slug example` (writes JSON to `raw/firecrawl/example/map.json`; map supports `--json --pretty`, no `--wait`)

2) Crawl
- `npm run firecrawl:crawl -- --url https://example.com --slug example` (wait + pretty JSON to `raw/firecrawl/example/crawl.json`; writes `meta.json`, and on timeout dumps `status.json`/`errors.json`, cancels job, then signals scrape-only fallback)
- Uses `config/firecrawl.makler.json` for `limit`, `maxDepth`, `delayMs`, `maxConcurrency`, `pollInterval`, `timeout`, `excludePaths`/`includePaths` (safe defaults set to avoid listings).
- Firecrawl CLI currently has no "main content only" flag; not applied.
- Defaults in `config/firecrawl.makler.json`: `limit=8`, `maxDepth=2`, `delayMs=1000ms`, `maxConcurrency=2`, `sitemap=include`, `pollInterval=5s`, `timeout=180s`, `excludePaths` as listed below, `includePaths` preset to home/about/services/contact/impressum/datenschutz/presse.
- includePaths is a safe whitelist by default; anything else should be explicit opt-in.
- If a crawl times out or stalls in `scraping`, the script cancels the job, writes `status.json`/`errors.json`, retries once with tighter limits, and then falls back to scrape-only if needed.

2b) Scrape-only (whitelist)
- `node scripts/firecrawl/scrape-whitelist.mjs --url https://example.com --slug example` → writes `raw/firecrawl/example/scrape/*.json`
- Scrape is main-content only (`--only-main-content`) and uses `markdown,links,images` output.

3) Generate BrandSlug
- `npm run brand:from-firecrawl -- --slug example` → creates `src/data/brands/example/brand.json` + `home.json` (fails if listing patterns detected; writes `raw/firecrawl/example/violations.json`).

4) Run site
- Build: `BRAND_SLUG=example npm run build`
- Dev (manual/local): `BRAND_SLUG=example npm run dev` (not auto-started by the relaunch script to avoid blocking)

## No Listings Policy
- Forbidden patterns (URL/content): `/angebote`, `/angebot`, `/immobilien`, `/objekte`, `/expose`, `/exposé`, `/listing`, `/property`, `/inserat`, `/kaufen`, `/mieten`.
- Why: keeps demo safe, avoids sensitive/off-limit data; highlights remain generic placeholders.
- If violated: crawl/generate steps write `raw/firecrawl/<slug>/violations.json` and exit non-zero.

## One-command shortcut
- `npm run relaunch:from-url -- --url https://example.com --slug example --mode generate|build|dev|scrape`
- Runs status → map → crawl → generate → validate. `--mode dev` prints the follow-up command instead of running a blocking dev server; `--mode generate` stops after generation/validation; `--mode scrape` skips crawl and uses scrape-only fallback.

## Conductor/CI Runbook (3 commands)
1) `PATH=$(npm config get prefix)/bin:$PATH npm run relaunch:from-url -- --url https://example.com --slug example --mode generate`
2) `PATH=$(npm config get prefix)/bin:$PATH node scripts/brand/validate-brand-home.mjs --slug example`
3) `BRAND_SLUG=example PATH=$(npm config get prefix)/bin:$PATH npm run build`
