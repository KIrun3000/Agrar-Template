import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync } from 'node:fs';
import path from 'node:path';
import { withNpmBin } from '../lib/env-utils.mjs';

function parseArgs() {
  const args = process.argv.slice(2);
  let url;
  let slug;
  let configPath;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];

    if (arg === '--url') {
      url = args[i + 1];
      i += 1;
    } else if (arg === '--slug') {
      slug = args[i + 1];
      i += 1;
    } else if (arg === '--config') {
      configPath = args[i + 1];
      i += 1;
    }
  }

  return { url, slug, configPath };
}

function ensureValidSlug(slug) {
  if (!slug || slug.includes('..') || slug.includes('/') || path.isAbsolute(slug)) {
    return false;
  }
  return true;
}

function printUsage() {
  console.error('Usage: node scripts/firecrawl/map.mjs --url <url> --slug <slug> [--config config/firecrawl.makler.json]');
}

function loadConfig(configPath) {
  if (!configPath) return {};
  try {
    const raw = readFileSync(configPath, 'utf8');
    return JSON.parse(raw);
  } catch (error) {
    console.warn(`Warning: could not read config at ${configPath}: ${error.message}`);
    return {};
  }
}

const { url, slug, configPath } = parseArgs();

if (!url || !slug || !ensureValidSlug(slug)) {
  printUsage();
  process.exit(1);
}

const outputDir = path.join('raw', 'firecrawl', slug);
mkdirSync(outputDir, { recursive: true });

const resolvedConfigPath = configPath ? path.resolve(configPath) : path.resolve('config', 'firecrawl.makler.json');
const cfg = loadConfig(resolvedConfigPath);

const env = withNpmBin(process.env);

const firecrawlArgs = ['map', url, '--json', '--pretty', '-o', path.join(outputDir, 'map.json')];

if (typeof cfg.limit === 'number') {
  firecrawlArgs.push('--limit', String(cfg.limit));
}

const child = spawn('firecrawl', firecrawlArgs, { stdio: 'inherit', env });

child.on('error', (error) => {
  console.error('Failed to start firecrawl:', error.message);
  process.exit(1);
});

child.on('exit', (code) => {
  if (code !== 0) {
    process.exit(code ?? 1);
  }

  try {
    const mapPath = path.join(outputDir, 'map.json');
    const raw = readFileSync(mapPath, 'utf8');
    JSON.parse(raw);
  } catch (error) {
    console.error(`Map output is not valid JSON: ${error.message}`);
    process.exit(1);
  }

  process.exit(0);
});
