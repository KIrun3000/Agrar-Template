import path from 'node:path';

/**
 * Enriches an environment object with npm global bin directory in PATH.
 * Ensures that globally installed npm packages (like firecrawl-cli) can be found.
 *
 * @param {object} env - Base environment object (defaults to process.env)
 * @returns {object} Enriched environment with npm-global/bin in PATH
 */
export function withNpmBin(env = {}) {
  const enriched = { ...env };
  const npmGlobalBin = path.join(process.env.HOME ?? '', '.npm-global', 'bin');
  if (!enriched.PATH?.includes(npmGlobalBin)) {
    enriched.PATH = [npmGlobalBin, enriched.PATH || process.env.PATH]
      .filter(Boolean)
      .join(path.delimiter);
  }
  return enriched;
}
