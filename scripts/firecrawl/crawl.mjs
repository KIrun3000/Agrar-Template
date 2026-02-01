import { spawn } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync, existsSync } from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { withNpmBin } from '../lib/env-utils.mjs';
import { getDefaultForbiddenSegments } from '../lib/config-utils.mjs';

const API_BASE = process.env.FIRECRAWL_API_BASE || 'https://api.firecrawl.dev';

// CLEANUP: Ensure all child processes are killed on exit
function cleanupChildren() {
  try {
    // Kill entire process group (works because detached: false)
    process.kill(-process.pid, 'SIGKILL');
  } catch {
    // Ignore errors (process group may not exist)
  }
}

// Register cleanup on process exit
process.on('exit', cleanupChildren);
process.on('SIGINT', () => {
  cleanupChildren();
  process.exit(130);
});
process.on('SIGTERM', () => {
  cleanupChildren();
  process.exit(143);
});

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
  console.error('Usage: node scripts/firecrawl/crawl.mjs --url <url> --slug <slug> [--config config/firecrawl.makler.json]');
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

function normalizePathPatterns(patterns = []) {
  return patterns
    .filter((p) => typeof p === 'string')
    .map((p) => p.trim().toLowerCase())
    .filter(Boolean);
}

function collectUrls(node, acc = []) {
  if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') {
    return acc;
  }

  if (Array.isArray(node)) {
    node.forEach((item) => collectUrls(item, acc));
    return acc;
  }

  if (typeof node === 'object') {
    if (typeof node.url === 'string') {
      acc.push(node.url);
    }
    Object.values(node).forEach((val) => collectUrls(val, acc));
  }
  return acc;
}

function collectPageEntries(data) {
  if (!data) return [];
  if (Array.isArray(data)) return data;
  if (Array.isArray(data.pages)) return data.pages;
  if (Array.isArray(data.data)) return data.data;
  return [];
}

function findListingContentViolations(pages, forbiddenPaths) {
  const reasons = [];
  const strongKeyword = /(objektnr|objekt-nr|energieausweis|expos[eé]|kaufpreis|kaltmiete|warmmiete|provision|wohnfl(ä|a)che|zimmer)/i;
  const contentKeyword = /(preis|miete|grundst(ü|u)ck|wohnfl(ä|a)che|m²|m2)/i;
  const pricePattern = /(€|eur)\s?\d[\d\.\s,]*/i;

  for (const page of pages) {
    const url = typeof page?.url === 'string' ? page.url : undefined;
    const pageText =
      [page?.content, page?.markdown, page?.html, page?.text, page?.raw, page?.metadata?.description]
        .filter((v) => typeof v === 'string')
        .join('\n');

    const hitUrl = url && forbiddenPaths.some((segment) => url.toLowerCase().includes(segment));
    const hitStrong = pageText && strongKeyword.test(pageText);
    const hitContent = pageText && contentKeyword.test(pageText) && pricePattern.test(pageText);

    if (hitUrl || hitStrong || hitContent) {
      reasons.push({
        url: url ?? 'unknown',
        reason: hitUrl
          ? 'URL matched forbidden listing pattern'
          : hitStrong
            ? 'Content looked like a listing (listing field keyword)'
            : 'Content looked like a listing (price + listing keyword)',
      });
    }
  }

  return reasons;
}

function writeViolations(outputDir, reasons) {
  const filePath = path.join(outputDir, 'violations.json');
  writeFileSync(filePath, JSON.stringify({ reasons }, null, 2));
  console.error(`Listing policy violated. Details: ${filePath}`);
}

function writeJson(filePath, data) {
  mkdirSync(path.dirname(filePath), { recursive: true });
  writeFileSync(filePath, JSON.stringify(data, null, 2));
}

function buildCrawlArgs(url, outputDir, cfg, overrides = {}) {
  const crawlPath = path.join(outputDir, 'crawl.json');
  const merged = { ...cfg, ...overrides };
  const firecrawlArgs = ['crawl', url, '--wait', '--progress', '--pretty', '-o', crawlPath];

  if (typeof merged.limit === 'number') {
    firecrawlArgs.push('--limit', String(merged.limit));
  }
  if (typeof merged.maxDepth === 'number') {
    firecrawlArgs.push('--max-depth', String(merged.maxDepth));
  }
  if (typeof merged.delayMs === 'number') {
    firecrawlArgs.push('--delay', String(merged.delayMs));
  }
  if (typeof merged.maxConcurrency === 'number') {
    firecrawlArgs.push('--max-concurrency', String(merged.maxConcurrency));
  }
  if (typeof merged.pollInterval === 'number') {
    firecrawlArgs.push('--poll-interval', String(merged.pollInterval));
  }
  if (typeof merged.timeout === 'number') {
    firecrawlArgs.push('--timeout', String(merged.timeout));
  }
  if (typeof merged.sitemap === 'string' && merged.sitemap.trim()) {
    firecrawlArgs.push('--sitemap', merged.sitemap);
  }
  if (Array.isArray(merged.excludePaths) && merged.excludePaths.length > 0) {
    firecrawlArgs.push('--exclude-paths', merged.excludePaths.join(','));
  }
  if (Array.isArray(merged.includePaths) && merged.includePaths.length > 0) {
    firecrawlArgs.push('--include-paths', merged.includePaths.join(','));
  }

  return { firecrawlArgs, crawlPath, merged };
}

function extractJobId(text) {
  if (!text) return null;
  const match = text.match(/Job ID:\s*([a-f0-9-]+)/i);
  return match ? match[1] : null;
}

async function runCrawlAttempt({ firecrawlArgs, env, timeoutSeconds }) {
  return new Promise((resolve) => {
    const child = spawn('firecrawl', firecrawlArgs, {
      stdio: ['inherit', 'pipe', 'pipe'],
      env,
      detached: false,  // Ensure child dies with parent
    });
    let jobId = null;
    let buffer = '';
    let timedOut = false;
    let resolved = false;  // Track if promise already resolved

    const handleChunk = (chunk, stream) => {
      const text = chunk.toString();
      stream.write(text);
      buffer = `${buffer}${text}`.slice(-4000);
      if (!jobId) {
        const extracted = extractJobId(buffer);
        if (extracted) jobId = extracted;
      }
    };

    child.stdout.on('data', (chunk) => handleChunk(chunk, process.stdout));
    child.stderr.on('data', (chunk) => handleChunk(chunk, process.stderr));

    let timeoutId;
    let killTimeoutId;
    if (typeof timeoutSeconds === 'number' && timeoutSeconds > 0) {
      timeoutId = setTimeout(() => {
        timedOut = true;
        child.kill('SIGTERM');

        // GUARANTEE: Force-resolve after SIGKILL, don't wait for 'exit'
        killTimeoutId = setTimeout(() => {
          child.kill('SIGKILL');

          // If child still doesn't exit after SIGKILL, force-resolve
          setTimeout(() => {
            if (!resolved) {
              resolved = true;
              if (timeoutId) clearTimeout(timeoutId);
              if (killTimeoutId) clearTimeout(killTimeoutId);
              resolve({
                exitCode: 137,
                signal: 'SIGKILL',
                timedOut: true,
                jobId,
                forced: true,
              });
            }
          }, 2000);
        }, 5000);
      }, (timeoutSeconds + 5) * 1000);
    }

    child.on('error', (error) => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (killTimeoutId) clearTimeout(killTimeoutId);
      resolve({ exitCode: 1, signal: null, timedOut, jobId, error: error.message });
    });

    child.on('exit', (code, signal) => {
      if (resolved) return;
      resolved = true;
      if (timeoutId) clearTimeout(timeoutId);
      if (killTimeoutId) clearTimeout(killTimeoutId);
      resolve({ exitCode: code ?? 1, signal: signal ?? null, timedOut, jobId });
    });
  });
}

async function fetchJson(url, apiKey, options = {}) {
  if (!apiKey) {
    return { ok: false, status: 401, data: { error: 'FIRECRAWL_API_KEY not set' } };
  }

  const res = await fetch(url, {
    ...options,
    headers: {
      Authorization: `Bearer ${apiKey}`,
      ...(options.headers || {}),
    },
  });

  const text = await res.text();
  let data;
  try {
    data = text ? JSON.parse(text) : {};
  } catch {
    data = { raw: text };
  }

  return { ok: res.ok, status: res.status, data };
}

async function dumpStatusAndErrors({ jobId, outputDir, apiKey }) {
  const statusPath = path.join(outputDir, 'status.json');
  const errorsPath = path.join(outputDir, 'errors.json');

  if (!jobId) {
    const payload = { fetchedAt: new Date().toISOString(), error: 'missing job id' };
    writeJson(statusPath, payload);
    writeJson(errorsPath, payload);
    return { statusResponse: null, errorsResponse: null };
  }

  const statusUrl = `${API_BASE}/v2/crawl/${jobId}`;
  const errorsUrl = `${API_BASE}/v2/crawl/${jobId}/errors`;

  const statusResponse = await fetchJson(statusUrl, apiKey);
  const errorsResponse = await fetchJson(errorsUrl, apiKey);

  writeJson(statusPath, { fetchedAt: new Date().toISOString(), jobId, response: statusResponse });
  writeJson(errorsPath, { fetchedAt: new Date().toISOString(), jobId, response: errorsResponse });

  return { statusResponse, errorsResponse };
}

async function cancelCrawl(jobId, apiKey) {
  if (!jobId) return { ok: false, skipped: true };
  const cancelUrl = `${API_BASE}/v2/crawl/${jobId}`;
  const response = await fetchJson(cancelUrl, apiKey, { method: 'DELETE' });
  return { ok: response.ok, response };
}

function getRetryOverrides(cfg) {
  return {
    limit: typeof cfg.limit === 'number' ? Math.min(cfg.limit, 8) : 8,
    maxDepth: typeof cfg.maxDepth === 'number' ? Math.min(cfg.maxDepth, 2) : 2,
    maxConcurrency: 1,
    delayMs: typeof cfg.delayMs === 'number' ? Math.max(cfg.delayMs, 1000) : 1000,
    sitemap: typeof cfg.retrySitemap === 'string' ? cfg.retrySitemap : 'skip',
  };
}

function getStatusValue(statusResponse) {
  return statusResponse?.data?.status ?? statusResponse?.data?.data?.status ?? null;
}

function isStalledStatus(statusValue) {
  return statusValue === 'scraping' || statusValue === 'queued';
}

async function main() {
  const { url, slug, configPath } = parseArgs();

  if (!url || !slug || !ensureValidSlug(slug)) {
    printUsage();
    process.exit(1);
  }

  const outputDir = path.join('raw', 'firecrawl', slug);
  mkdirSync(outputDir, { recursive: true });

  const resolvedConfigPath = configPath ? path.resolve(configPath) : path.resolve('config', 'firecrawl.makler.json');
  const cfg = loadConfig(resolvedConfigPath);
  const startedAt = new Date();
  const configHash = crypto.createHash('sha256').update(JSON.stringify(cfg)).digest('hex');
  const forbiddenSegments = normalizePathPatterns(cfg.excludePaths ?? getDefaultForbiddenSegments(resolvedConfigPath));

  const env = withNpmBin(process.env);

  const attempts = [];
  const jobIds = [];
  let success = false;
  let fallbackNeeded = false;
  let fallbackReason = null;
  let lastExitCode = 1;

  for (let attempt = 1; attempt <= 2; attempt += 1) {
    const overrides = attempt === 2 ? getRetryOverrides(cfg) : {};
    const { firecrawlArgs } = buildCrawlArgs(url, outputDir, cfg, overrides);
    const attemptStarted = new Date();
    const result = await runCrawlAttempt({
      firecrawlArgs,
      env,
      timeoutSeconds: cfg.timeout,
    });
    const attemptFinished = new Date();

    const attemptMeta = {
      index: attempt,
      startedAt: attemptStarted.toISOString(),
      finishedAt: attemptFinished.toISOString(),
      durationMs: attemptFinished.getTime() - attemptStarted.getTime(),
      exitCode: result.exitCode,
      signal: result.signal,
      timedOut: result.timedOut,
      jobId: result.jobId ?? null,
      overrides: Object.keys(overrides).length > 0 ? overrides : null,
    };

    attempts.push(attemptMeta);
    if (result.jobId) jobIds.push(result.jobId);

    if (result.exitCode === 0) {
      success = true;
      lastExitCode = 0;
      break;
    }

    lastExitCode = result.exitCode;

    const { statusResponse, errorsResponse } = await dumpStatusAndErrors({
      jobId: result.jobId,
      outputDir,
      apiKey: process.env.FIRECRAWL_API_KEY,
    });

    const statusValue = getStatusValue(statusResponse);
    attemptMeta.status = statusValue;
    attemptMeta.completed = statusResponse?.data?.completed ?? null;
    attemptMeta.total = statusResponse?.data?.total ?? null;
    attemptMeta.errorsCount = Array.isArray(errorsResponse?.data?.errors) ? errorsResponse.data.errors.length : null;

    const stalled = result.timedOut || isStalledStatus(statusValue);
    fallbackReason = stalled ? 'stalled' : 'failed';
    if (stalled && result.jobId) {
      await cancelCrawl(result.jobId, process.env.FIRECRAWL_API_KEY);
      attemptMeta.cancelled = true;
    }

    if (attempt === 1 && stalled) {
      continue;
    }

    fallbackNeeded = true;
    break;
  }

  const crawlPath = path.join(outputDir, 'crawl.json');
  const statusPath = path.join(outputDir, 'status.json');
  const errorsPath = path.join(outputDir, 'errors.json');
  const violationsPath = path.join(outputDir, 'violations.json');

  if (!success) {
    fallbackNeeded = true;
    if (!fallbackReason) fallbackReason = 'failed';
  }

  const meta = {
    url,
    slug,
    runMode: 'crawl',
    startedAt: startedAt.toISOString(),
    finishedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt.getTime(),
    configPath: resolvedConfigPath,
    configHash,
    timeoutSeconds: cfg.timeout ?? null,
    pollInterval: cfg.pollInterval ?? null,
    jobIds,
    attempts,
    result: success ? 'success' : fallbackNeeded ? 'fallback' : 'failed',
    fallback: fallbackNeeded ? 'scrape' : null,
    fallbackReason,
    artifacts: {
      map: path.join(outputDir, 'map.json'),
      crawl: existsSync(crawlPath) ? crawlPath : null,
      status: existsSync(statusPath) ? statusPath : null,
      errors: existsSync(errorsPath) ? errorsPath : null,
      violations: existsSync(violationsPath) ? violationsPath : null,
    },
  };

  if (!success) {
    writeJson(path.join(outputDir, 'meta.json'), meta);
    process.exit(lastExitCode ?? 1);
  }

  if (!existsSync(crawlPath)) {
    meta.result = 'failed';
    writeJson(path.join(outputDir, 'meta.json'), meta);
    process.exit(1);
  }

  let parsed;
  try {
    parsed = JSON.parse(readFileSync(crawlPath, 'utf8'));
  } catch (error) {
    meta.result = 'failed';
    meta.error = error.message;
    writeJson(path.join(outputDir, 'meta.json'), meta);
    console.error(`Could not read/parse ${crawlPath}: ${error.message}`);
    process.exit(1);
  }

  const pages = collectPageEntries(parsed);
  const urls = collectUrls(parsed);

  const urlViolations = urls.filter((u) => forbiddenSegments.some((seg) => String(u).toLowerCase().includes(seg)));
  if (urlViolations.length > 0) {
    const reasons = urlViolations.map((u) => ({ url: u, reason: 'URL matched forbidden listing pattern' }));
    writeJson(path.join(outputDir, 'meta.json'), { ...meta, result: 'violations', violations: reasons });
    writeViolations(outputDir, reasons);
    process.exit(2);
  }

  const contentViolations = findListingContentViolations(pages, forbiddenSegments);
  if (contentViolations.length > 0) {
    writeJson(path.join(outputDir, 'meta.json'), { ...meta, result: 'violations', violations: contentViolations });
    writeViolations(outputDir, contentViolations);
    process.exit(2);
  }

  writeJson(path.join(outputDir, 'meta.json'), meta);
  process.exit(0);
}

main().catch((error) => {
  console.error(error?.stack || error?.message || error);
  process.exit(1);
});
