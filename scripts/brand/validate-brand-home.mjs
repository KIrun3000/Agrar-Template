import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  let slug;
  let brandPath;
  let homePath;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--slug') {
      slug = args[i + 1];
      i += 1;
    } else if (arg === '--brand') {
      brandPath = args[i + 1];
      i += 1;
    } else if (arg === '--home') {
      homePath = args[i + 1];
      i += 1;
    }
  }

  return { slug, brandPath, homePath };
}

function usage() {
  console.error('Usage: node scripts/brand/validate-brand-home.mjs --slug <slug> [--brand path] [--home path]');
}

async function loadSchemas() {
  await import('tsx/esm');
  const { brandSchema } = await import('../../src/schemas/brand.schema.ts');
  const { homeSchema } = await import('../../src/schemas/home.schema.ts');
  return { brandSchema, homeSchema };
}

async function main() {
  const { slug, brandPath, homePath } = parseArgs();
  if (!slug && !(brandPath && homePath)) {
    usage();
    process.exit(1);
  }

  const resolvedBrand = path.resolve(brandPath || path.join(__dirname, '../../src/data/brands', slug, 'brand.json'));
  const resolvedHome = path.resolve(homePath || path.join(__dirname, '../../src/data/brands', slug, 'home.json'));

  let brand;
  let home;
  try {
    brand = JSON.parse(readFileSync(resolvedBrand, 'utf8'));
    home = JSON.parse(readFileSync(resolvedHome, 'utf8'));
  } catch (error) {
    console.error(`Failed to read brand/home JSON: ${error.message}`);
    process.exit(1);
  }

  let schemas;
  try {
    schemas = await loadSchemas();
  } catch (error) {
    console.error(`Failed to load schemas via tsx/esm: ${error.message}`);
    process.exit(1);
  }

  try {
    schemas.brandSchema.parse(brand);
    schemas.homeSchema.parse(home);
  } catch (error) {
    console.error('Validation failed:', error.errors ?? error.message);
    process.exit(1);
  }

  console.log('Validation OK:', resolvedBrand, resolvedHome);
}

main().catch((error) => {
  console.error('Validation failed:', error.message);
  process.exit(1);
});
