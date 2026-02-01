import { promises as fs } from 'node:fs';
import path from 'node:path';

import { brandSchema } from '../src/schemas/brand.schema';
import { homeSchema } from '../src/schemas/home.schema';
import { formatZodError } from '../src/schemas/validation';

const BRAND_DIR = path.resolve(process.cwd(), 'src/data/brands');
const PUBLIC_DIR = path.resolve(process.cwd(), 'public');

const readJson = async (filePath: string) => {
  const raw = await fs.readFile(filePath, 'utf8');
  return JSON.parse(raw) as unknown;
};

const validateFile = (schema: typeof brandSchema | typeof homeSchema, data: unknown, label: string) => {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new Error(formatZodError(result.error, label));
  }
};

type JsonObject = Record<string, unknown>;

const collectAssetPaths = (brand: JsonObject, home: JsonObject) => {
  const paths: { path: string; field: string }[] = [];

  const pushPath = (p: unknown, field: string) => {
    if (typeof p !== 'string') return;
    if (!p.startsWith('/')) return; // nur lokale Assets prüfen
    paths.push({ path: p, field });
  };

  const logo = (brand.assets as JsonObject | undefined)?.logo as JsonObject | undefined;
  if (logo) {
    pushPath(logo.svg, 'brand.assets.logo.svg');
    pushPath(logo.png, 'brand.assets.logo.png');
  }
  const favicon = (brand.assets as JsonObject | undefined)?.favicon as JsonObject | undefined;
  if (favicon) {
    pushPath(favicon.svg, 'brand.assets.favicon.svg');
    pushPath(favicon.ico, 'brand.assets.favicon.ico');
    pushPath(favicon.appleTouch, 'brand.assets.favicon.appleTouch');
  }
  const ogImage = (brand.assets as JsonObject | undefined)?.ogImage as JsonObject | undefined;
  if (ogImage) {
    pushPath(ogImage.url, 'brand.assets.ogImage.url');
  }

  const hero = home.hero as JsonObject | undefined;
  if (hero) {
    const video = hero.video as JsonObject | undefined;
    if (video?.sources && Array.isArray(video.sources)) {
      video.sources.forEach((source, idx) => pushPath((source as JsonObject).src, `home.hero.video.sources[${idx}].src`));
    }
    const heroImage = hero.image as JsonObject | undefined;
    if (heroImage) pushPath(heroImage.src, 'home.hero.image.src');
  }

  const sections = home.sections as JsonObject | undefined;
  if (sections && typeof sections === 'object') {
    Object.entries(sections).forEach(([sectionKey, value]) => {
      const image = (value as JsonObject)?.image as JsonObject | undefined;
      if (image) pushPath(image.src, `home.sections.${sectionKey}.image.src`);
    });
  }

  return paths;
};

const assertAssetsExist = async (slug: string, brand: JsonObject, home: JsonObject) => {
  const paths = collectAssetPaths(brand, home);
  const errors: string[] = [];

  await Promise.all(
    paths.map(async ({ path: assetPath, field }) => {
      const fsPath = path.join(PUBLIC_DIR, assetPath.replace(/^\//, ''));
      try {
        await fs.access(fsPath);
      } catch {
        errors.push(`Asset fehlt (${slug}): ${field} -> ${assetPath} (erwartet: ${fsPath})`);
      }
    })
  );

  if (errors.length) {
    throw new Error(errors.join('\n'));
  }
};

const main = async () => {
  const entries = await fs.readdir(BRAND_DIR, { withFileTypes: true });
  const errors: string[] = [];

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;
    const brandPath = path.join(BRAND_DIR, slug, 'brand.json');
    const homePath = path.join(BRAND_DIR, slug, 'home.json');

    try {
      const brandJson = await readJson(brandPath);
      validateFile(brandSchema, brandJson, `src/data/brands/${slug}/brand.json`);
      const homeJson = await readJson(homePath);
      validateFile(homeSchema, homeJson, `src/data/brands/${slug}/home.json`);
      await assertAssetsExist(slug, brandJson as JsonObject, homeJson as JsonObject);
    } catch (error) {
      errors.push(error instanceof Error ? error.message : String(error));
    }
  }

  if (errors.length) {
    console.error('❌ Brand-Validierung fehlgeschlagen:\n');
    errors.forEach((message) => {
      console.error(message);
      console.error('');
    });
    process.exit(1);
  }

  console.log(`✅ Alle Brands sind valide (${entries.filter((e) => e.isDirectory()).length})`);
};

main().catch((error) => {
  console.error('❌ Brand-Validierung fehlgeschlagen:', error);
  process.exit(1);
});
