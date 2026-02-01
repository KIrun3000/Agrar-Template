import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import { getDefaultForbiddenSegments } from '../lib/config-utils.mjs';

const DEFAULT_WHITELIST = ['/', '/ueber-uns', '/leistungen', '/kontakt', '/impressum', '/datenschutz'];

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
  return slug && !slug.includes('..') && !slug.includes('/') && !path.isAbsolute(slug);
}

function printUsage() {
  console.error('Usage: node scripts/firecrawl/scrape-whitelist.mjs --url <url> --slug <slug> [--config config/firecrawl.makler.json]');
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

function normalizePaths(paths = []) {
  return paths
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim())
    .filter(Boolean);
}

function normalizeForbidden(paths = []) {
  return paths
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function safeFilename(value) {
  const cleaned = value
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9-_]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
  return cleaned || 'page';
}

function buildTargets(baseUrl, includePaths, forbiddenSegments) {
  const base = new URL(baseUrl);
  const targets = new Set();

  includePaths.forEach((rawPath) => {
    let targetUrl;
    if (/^https?:\/\//i.test(rawPath)) {
      targetUrl = rawPath;
    } else {
      const normalizedPath = rawPath.startsWith('/') ? rawPath : `/${rawPath}`;
      targetUrl = new URL(normalizedPath, base).toString();
    }

    try {
      const parsed = new URL(targetUrl);
      const lowerPath = parsed.pathname.toLowerCase();
      if (forbiddenSegments.some((segment) => lowerPath.includes(segment))) return;
    } catch {
      return;
    }

    targets.add(targetUrl);
  });

  return Array.from(targets);
}

function main() {
  const { url, slug, configPath } = parseArgs();
  if (!url || !slug || !ensureValidSlug(slug)) {
    printUsage();
    process.exit(1);
  }

  const outputDir = path.join('raw', 'firecrawl', slug, 'scrape');
  mkdirSync(outputDir, { recursive: true });

  const resolvedConfigPath = configPath ? path.resolve(configPath) : path.resolve('config', 'firecrawl.makler.json');
  const cfg = loadConfig(resolvedConfigPath);
  const whitelist = normalizePaths(cfg.includePaths).length > 0 ? normalizePaths(cfg.includePaths) : DEFAULT_WHITELIST;
  const forbidden = normalizeForbidden(cfg.excludePaths ?? getDefaultForbiddenSegments(resolvedConfigPath));

  const targets = buildTargets(url, whitelist, forbidden);
  if (targets.length === 0) {
    console.error('No scrape targets found for whitelist.');
    process.exit(1);
  }

  const manifest = {
    url,
    slug,
    configPath: resolvedConfigPath,
    targets,
    generatedAt: new Date().toISOString(),
  };

  const usedNames = new Map();
  for (const target of targets) {
    let baseName = 'page';
    try {
      const parsed = new URL(target);
      baseName = parsed.pathname === '/' ? 'home' : safeFilename(parsed.pathname.slice(1));
    } catch {
      baseName = safeFilename(target);
    }

    const count = usedNames.get(baseName) || 0;
    usedNames.set(baseName, count + 1);
    const filename = count === 0 ? `${baseName}.json` : `${baseName}-${count + 1}.json`;
    const outputPath = path.join(outputDir, filename);

    const args = [
      'scrape',
      target,
      '--only-main-content',
      '--format',
      'markdown,links,images',
      '--pretty',
      '-o',
      outputPath,
    ];

    const result = spawnSync('firecrawl', args, { stdio: 'inherit' });
    if (result.status !== 0) {
      console.error(`Scrape failed for ${target}`);
      process.exit(result.status ?? 1);
    }
  }

  writeFileSync(path.join(outputDir, 'manifest.json'), JSON.stringify(manifest, null, 2));
  process.exit(0);
}

main();
