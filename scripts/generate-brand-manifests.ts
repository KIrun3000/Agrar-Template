import { promises as fs } from 'node:fs';
import path from 'node:path';

import { brandSchema, type BrandConfig } from '../src/schemas/brand.schema';
import { homeSchema, type HomeConfig } from '../src/schemas/home.schema';
import { formatZodError } from '../src/schemas/validation';

const BRAND_DIR = path.resolve(process.cwd(), 'src/data/brands');
const OUT_DIR = path.resolve(process.cwd(), 'out/brands');

type JsonObject = Record<string, unknown>;

const readJson = async (filePath: string) => JSON.parse(await fs.readFile(filePath, 'utf8')) as JsonObject;

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  Boolean(value) && typeof value === 'object' && !Array.isArray(value);

const mergeDeep = <T extends Record<string, unknown>>(base: T, override: Record<string, unknown> = {}): T => {
  const result = { ...base } as T;
  if (!isPlainObject(override)) return result;

  Object.entries(override).forEach(([key, value]) => {
    if (Array.isArray(value)) {
      (result as Record<string, unknown>)[key] = value;
      return;
    }
    if (isPlainObject(value) && isPlainObject(result[key] as Record<string, unknown>)) {
      (result as Record<string, unknown>)[key] = mergeDeep(result[key] as Record<string, unknown>, value);
      return;
    }
    (result as Record<string, unknown>)[key] = value;
  });
  return result;
};

const parseOrThrow = <T>(schema: typeof brandSchema | typeof homeSchema, data: unknown, label: string): T => {
  const parsed = schema.safeParse(data);
  if (!parsed.success) throw new Error(formatZodError(parsed.error, label));
  return parsed.data as T;
};

const loadConfig = async (slug: string, file: 'brand' | 'home') => {
  const filePath = path.join(BRAND_DIR, slug, `${file}.json`);
  return readJson(filePath);
};

const ensureDir = async (dir: string) => fs.mkdir(dir, { recursive: true });

const writeManifest = async (slug: string, name: 'brand' | 'home', data: unknown) => {
  const dir = path.join(OUT_DIR, slug);
  await ensureDir(dir);
  const meta = {
    slug,
    generatedAt: new Date().toISOString(),
    source: 'merge(default + override)',
    notes: 'arrays replace',
  };
  const output = { meta, data };
  await fs.writeFile(path.join(dir, `resolved-${name}.json`), JSON.stringify(output, null, 2), 'utf8');
};

const main = async () => {
  const entries = await fs.readdir(BRAND_DIR, { withFileTypes: true });

  const defaultBrandRaw = await loadConfig('_default', 'brand');
  const defaultHomeRaw = await loadConfig('_default', 'home');

  const defaultBrand = parseOrThrow<BrandConfig>(brandSchema, defaultBrandRaw, 'src/data/brands/_default/brand.json');
  const defaultHome = parseOrThrow<HomeConfig>(homeSchema, defaultHomeRaw, 'src/data/brands/_default/home.json');

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    const slug = entry.name;

    const brandRaw = await loadConfig(slug, 'brand');
    const homeRaw = await loadConfig(slug, 'home');

    const brandParsed = parseOrThrow<BrandConfig>(brandSchema, brandRaw, `src/data/brands/${slug}/brand.json`);
    const homeParsed = parseOrThrow<HomeConfig>(homeSchema, homeRaw, `src/data/brands/${slug}/home.json`);

    const resolvedBrand = mergeDeep(defaultBrand, slug === '_default' ? {} : brandParsed);
    const resolvedHome = mergeDeep(defaultHome, slug === '_default' ? {} : homeParsed);

    await writeManifest(slug, 'brand', resolvedBrand);
    await writeManifest(slug, 'home', resolvedHome);
  }

  console.log('✅ Brand-Manifests erzeugt unter out/brands/*');
};

main().catch((error) => {
  console.error('❌ Fehler beim Generieren der Manifests:', error);
  process.exit(1);
});
