import { readFileSync } from 'node:fs';
import path from 'node:path';

// Hardcoded fallback if config cannot be loaded
const FALLBACK_FORBIDDEN_SEGMENTS = [
  '/angebote',
  '/angebot',
  '/immobilien',
  '/objekte',
  '/expose',
  '/exposé',
  '/listing',
  '/property',
  '/inserat',
  '/kaufen',
  '/mieten',
];

/**
 * Loads the default Firecrawl configuration.
 * Returns excludePaths from config/firecrawl.makler.json or fallback.
 *
 * @param {string} configPath - Optional path to config file
 * @returns {string[]} Array of forbidden path segments
 */
export function getDefaultForbiddenSegments(configPath) {
  const resolvedPath = configPath || path.join('config', 'firecrawl.makler.json');

  try {
    const raw = readFileSync(resolvedPath, 'utf8');
    const config = JSON.parse(raw);
    if (Array.isArray(config.excludePaths) && config.excludePaths.length > 0) {
      return config.excludePaths;
    }
  } catch {
    // Config file not found or invalid, use fallback
  }

  return FALLBACK_FORBIDDEN_SEGMENTS;
}
