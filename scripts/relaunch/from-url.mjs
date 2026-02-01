import { spawn } from 'node:child_process';
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { withNpmBin } from '../lib/env-utils.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  let url;
  let slug;
  let mode = 'generate';
  let configPath;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--url') {
      url = args[i + 1];
      i += 1;
    } else if (arg === '--slug') {
      slug = args[i + 1];
      i += 1;
    } else if (arg === '--mode') {
      mode = args[i + 1] || mode;
      i += 1;
    } else if (arg === '--config') {
      configPath = args[i + 1];
      i += 1;
    }
  }

  return { url, slug, mode, configPath };
}

function usage() {
  console.error('Usage: node scripts/relaunch/from-url.mjs --url <url> --slug <slug> [--mode generate|build|dev|scrape] [--config config/firecrawl.makler.json]');
}

function timestamp() {
  return new Date().toISOString();
}

function runStep(label, cmd, args, options = {}) {
  const { allowFailure = false, heartbeat = true, ...spawnOptions } = options;
  console.log(`[${timestamp()}] Start: ${label}`);

  return new Promise((resolve) => {
    const child = spawn(cmd, args, { stdio: 'inherit', ...spawnOptions });
    let interval;

    if (heartbeat) {
      interval = setInterval(() => {
        console.log(`[${timestamp()}] Still running: ${label}`);
      }, 30_000);
    }

    const finish = (code) => {
      if (interval) clearInterval(interval);
      const normalized = code ?? 1;
      console.log(`[${timestamp()}] End: ${label} (code ${normalized})`);
      if (normalized !== 0 && !allowFailure) {
        console.error(`Step failed: ${label}`);
        process.exit(normalized);
      }
      resolve(normalized);
    };

    child.on('error', () => finish(1));
    child.on('close', (code) => finish(code));
  });
}

function readJsonSafe(filePath) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return null;
  }
}

async function main() {
  const { url, slug, mode, configPath } = parseArgs();
  if (!url || !slug) {
    usage();
    process.exit(1);
  }

  const envWithPath = withNpmBin(process.env);
  const resolvedConfig = configPath || 'config/firecrawl.makler.json';
  const baseDir = path.join('raw', 'firecrawl', slug);
  const mapOutput = path.join(baseDir, 'map.json');
  const crawlOutput = path.join(baseDir, 'crawl.json');
  const metaOutput = path.join(baseDir, 'meta.json');
  const violationsOutput = path.join(baseDir, 'violations.json');

  await runStep('Firecrawl status', 'firecrawl', ['--status'], { env: envWithPath, heartbeat: false });
  await runStep('Map website', 'node', ['scripts/firecrawl/map.mjs', '--url', url, '--slug', slug, '--config', resolvedConfig], {
    env: envWithPath,
  });

  if (mode !== 'scrape') {
    const crawlArgs = ['scripts/firecrawl/crawl.mjs', '--url', url, '--slug', slug, '--config', resolvedConfig];
    const crawlStatus = await runStep('Crawl website', 'node', crawlArgs, { env: envWithPath, allowFailure: true });
    if (crawlStatus === 2) {
      console.error(`Listing policy violated. See details: ${violationsOutput}`);
      process.exit(2);
    }

    if (crawlStatus !== 0) {
      const meta = readJsonSafe(metaOutput);
      if (meta?.fallback === 'scrape' || meta?.result === 'fallback') {
        await runStep('Scrape whitelist fallback', 'node', ['scripts/firecrawl/scrape-whitelist.mjs', '--url', url, '--slug', slug, '--config', resolvedConfig], {
          env: envWithPath,
        });
        const nextMeta = readJsonSafe(metaOutput) || {};
        nextMeta.slug = nextMeta.slug || slug;
        nextMeta.url = nextMeta.url || url;
        nextMeta.runMode = 'scrape-only';
        nextMeta.result = 'fallback';
        nextMeta.fallback = 'scrape';
        nextMeta.updatedAt = new Date().toISOString();
        try {
          writeFileSync(metaOutput, JSON.stringify(nextMeta, null, 2));
        } catch {
          // ignore meta update failures
        }
      } else {
        process.exit(crawlStatus);
      }
    }
  } else {
    await runStep('Scrape whitelist', 'node', ['scripts/firecrawl/scrape-whitelist.mjs', '--url', url, '--slug', slug, '--config', resolvedConfig], {
      env: envWithPath,
    });
    const nextMeta = readJsonSafe(metaOutput) || {};
    nextMeta.slug = nextMeta.slug || slug;
    nextMeta.url = nextMeta.url || url;
    nextMeta.runMode = 'scrape-only';
    nextMeta.result = 'success';
    nextMeta.updatedAt = new Date().toISOString();
    try {
      writeFileSync(metaOutput, JSON.stringify(nextMeta, null, 2));
    } catch {
      // ignore meta update failures
    }
  }

  if (!existsSync(mapOutput)) {
    console.error(`Expected map output missing: ${mapOutput}`);
    process.exit(1);
  }

  if (existsSync(violationsOutput)) {
    console.error(`Listing policy violated. See details: ${violationsOutput}`);
    process.exit(2);
  }

  const generatorArgs = ['scripts/brand/generate-from-firecrawl.mjs', '--slug', slug];
  if (existsSync(crawlOutput)) {
    generatorArgs.push('--input', crawlOutput);
  }
  await runStep('Generate brand/home', 'node', generatorArgs, {
    env: envWithPath,
  });
  await runStep('Validate brand/home', 'node', ['scripts/brand/validate-brand-home.mjs', '--slug', slug], {
    env: envWithPath,
  });

  if (mode === 'dev') {
    console.log('\nDev server not auto-started to avoid blocking Conductor.');
    console.log(`Next: BRAND_SLUG=${slug} PATH=$HOME/.npm-global/bin:$PATH npm run dev`);
    return;
  }

  if (mode === 'generate') {
    console.log('\nGenerated brand/home without starting build/dev.');
    if (existsSync(crawlOutput)) {
      console.log(`Artifacts: ${crawlOutput} and src/data/brands/${slug}/{brand.json,home.json}`);
    } else {
      console.log(`Artifacts: raw/firecrawl/${slug}/scrape/ and src/data/brands/${slug}/{brand.json,home.json}`);
    }
    return;
  }

  if (mode === 'scrape') {
    console.log('\nScrape-only flow completed (no build/dev).');
    return;
  }

  const npmCmd = ['run', 'build'];
  await runStep('Start build', 'npm', npmCmd, { env: { ...envWithPath, BRAND_SLUG: slug } });
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
