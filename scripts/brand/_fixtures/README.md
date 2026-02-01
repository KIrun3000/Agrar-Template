# Brand generator fixtures

Use this folder to stash tiny crawl.json/map.json files for manual testing.

Example (replace with your own small public site):

```bash
node scripts/firecrawl/map.mjs --url https://example.com --slug example
node scripts/firecrawl/crawl.mjs --url https://example.com --slug example
node scripts/brand/generate-from-firecrawl.mjs --slug example --input raw/firecrawl/example/crawl.json --out scripts/brand/_fixtures/example
node scripts/brand/validate-brand-home.mjs --brand scripts/brand/_fixtures/example/brand.json --home scripts/brand/_fixtures/example/home.json
```

Keep fixtures lightweight and free of listings/inserate content.
