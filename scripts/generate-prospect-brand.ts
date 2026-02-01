import { execSync } from 'node:child_process';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { brandSchema, type BrandConfig } from '../src/schemas/brand.schema';
import { homeSchema, type HomeConfig } from '../src/schemas/home.schema';
import { extractionSchema, type Extraction } from '../src/schemas/extraction.schema';
import { formatZodError } from '../src/schemas/validation';
import { formatExtractionError } from '../src/schemas/extraction.validation';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, '..');
const BRAND_DIR = path.join(ROOT, 'src', 'data', 'brands');
const PUBLIC_BRAND_DIR = path.join(ROOT, 'public', 'brands');
const EXTRACTIONS_DIR = path.join(ROOT, 'out', 'extractions');

type Json = Record<string, any>;

const isObject = (v: unknown): v is Record<string, unknown> => Boolean(v) && typeof v === 'object' && !Array.isArray(v);

const mergeDeep = <T extends Record<string, unknown>>(base: T, override?: Record<string, unknown>): T => {
  if (!override || !isObject(override)) return base;
  const res = { ...base } as Record<string, unknown>;
  for (const [k, v] of Object.entries(override)) {
    if (Array.isArray(v)) {
      res[k] = v;
      continue;
    }
    if (isObject(v) && isObject(res[k])) {
      res[k] = mergeDeep(res[k] as Record<string, unknown>, v);
      continue;
    }
    res[k] = v;
  }
  return res as T;
};

const ensureDir = async (dir: string) => fs.mkdir(dir, { recursive: true });

const readJson = async (filePath: string) => JSON.parse(await fs.readFile(filePath, 'utf8')) as Json;

const writeJson = async (filePath: string, data: unknown) => {
  await ensureDir(path.dirname(filePath));
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf8');
};

const downloadAsset = async (url: string, destRel: string) => {
  const dest = path.join(PUBLIC_BRAND_DIR, destRel);
  await ensureDir(path.dirname(dest));
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Download failed ${url}: ${res.status} ${res.statusText}`);
  const buffer = Buffer.from(await res.arrayBuffer());
  await fs.writeFile(dest, buffer);
  return `/brands/${destRel.replace(/\\/g, '/')}`;
};

const inferFilename = (url: string, fallback: string) => {
  try {
    const { pathname } = new URL(url);
    const name = pathname.split('/').filter(Boolean).pop();
    if (name) return name;
  } catch {
    // ignore
  }
  return fallback;
};

type Rgb = [number, number, number];

const clamp = (n: number, min = 0, max = 255) => Math.min(max, Math.max(min, n));

const hexToRgb = (hex?: string | null): Rgb | null => {
  if (!hex || typeof hex !== 'string') return null;
  const clean = hex.trim().replace('#', '');
  if (![3, 6].includes(clean.length)) return null;
  const full = clean.length === 3 ? clean.split('').map((c) => c + c).join('') : clean;
  const int = Number.parseInt(full, 16);
  const r = (int >> 16) & 255;
  const g = (int >> 8) & 255;
  const b = int & 255;
  return [r, g, b];
};

const parseTriplet = (value?: string | null): Rgb | null => {
  if (!value || typeof value !== 'string') return null;
  const parts = value.split(/\s+/).map((p) => Number(p));
  if (parts.length !== 3 || parts.some((p) => Number.isNaN(p))) return null;
  return [parts[0], parts[1], parts[2]];
};

const mix = (a: Rgb, b: Rgb, amount: number): Rgb => {
  const t = clamp(amount, 0, 1);
  return [
    clamp(a[0] + (b[0] - a[0]) * t),
    clamp(a[1] + (b[1] - a[1]) * t),
    clamp(a[2] + (b[2] - a[2]) * t),
  ];
};

const tripletString = (rgb: Rgb) => `${Math.round(rgb[0])} ${Math.round(rgb[1])} ${Math.round(rgb[2])}`;

const relativeLuminance = (rgb: Rgb) => {
  const srgb = rgb.map((v) => {
    const c = v / 255;
    return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * srgb[0] + 0.7152 * srgb[1] + 0.0722 * srgb[2];
};

const bestOnColor = (rgb: Rgb): Rgb => {
  const lum = relativeLuminance(rgb);
  return lum > 0.6 ? [15, 23, 42] : [255, 255, 255];
};

const deriveBrandTokens = (
  colors: { primary?: string; accent?: string; bg?: string; text?: string } | undefined,
  defaults: any
) => {
  const primaryHex = colors?.primary;
  const textHex = colors?.text;
  const bgHex = colors?.bg;

  const primaryBase =
    hexToRgb(primaryHex) ?? parseTriplet(defaults?.light?.primary) ?? parseTriplet(defaults?.dark?.primary) ?? [55, 116, 73];
  const textBase = hexToRgb(textHex) ?? parseTriplet(defaults?.light?.textDefault) ?? [20, 24, 23];
  const bgHint = hexToRgb(bgHex) ?? null;

  const white: Rgb = [255, 255, 255];
  const darkBase: Rgb = [3, 6, 32];
  const surfaceDark: Rgb = [15, 23, 42];
  const borderDark: Rgb = [31, 41, 55];
  const cardBorderDark: Rgb = [30, 41, 59];
  const textHeadingDark: Rgb = [247, 248, 248];
  const textDefaultDark: Rgb = [229, 236, 246];
  const textMutedDark: Rgb = [148, 163, 184];

  const accent = mix(primaryBase, white, 0.15);
  const secondary = mix(primaryBase, white, 0.1);
  const bgPage = tripletString(mix(white, bgHint ?? primaryBase, bgHint ? 0.06 : 0.04));
  const surface = tripletString(mix(white, primaryBase, 0.03));
  const card = tripletString(mix(white, primaryBase, 0.035));
  const border = tripletString(mix(primaryBase, [226, 232, 240], 0.65));

  const textHeading = tripletString(textBase);
  const textDefault = tripletString(textBase);
  const textMuted = tripletString(mix(textBase, white, 0.25));

  const ring = tripletString(primaryBase);
  const onPrimary = tripletString(bestOnColor(primaryBase));

  const light = {
    primary: tripletString(primaryBase),
    secondary: tripletString(secondary),
    accent: tripletString(accent),
    textHeading,
    textDefault,
    textMuted,
    textMutedAlpha: 0.66,
    bgPage,
    bgPageDark: tripletString(mix(primaryBase, white, 0.02)),
    surface,
    border,
    ring,
    success: tripletString(primaryBase),
    warning: tripletString(mix([245, 158, 11], primaryBase, 0.2)),
    muted: tripletString(mix(primaryBase, white, 0.5)),
    card,
    cardBorder: border,
    danger: tripletString([220, 38, 38]),
    onPrimary,
    onSecondary: onPrimary,
    onAccent: onPrimary,
  };

  const dark = {
    primary: tripletString(primaryBase),
    secondary: tripletString(secondary),
    accent: tripletString(accent),
    textHeading: tripletString(textHeadingDark),
    textDefault: tripletString(textDefaultDark),
    textMuted: tripletString(textMutedDark),
    textMutedAlpha: 0.66,
    bgPage: tripletString(darkBase),
    bgPageDark: tripletString(darkBase),
    surface: tripletString(surfaceDark),
    border: tripletString(borderDark),
    ring,
    success: tripletString(primaryBase),
    warning: tripletString([245, 158, 11]),
    muted: tripletString(textMutedDark),
    card: tripletString(surfaceDark),
    cardBorder: tripletString(cardBorderDark),
    danger: tripletString([248, 113, 113]),
    onPrimary,
    onSecondary: onPrimary,
    onAccent: onPrimary,
  };

  return { light, dark };
};

const validateBrand = (data: unknown, label: string): BrandConfig => {
  const parsed = brandSchema.safeParse(data);
  if (!parsed.success) throw new Error(formatZodError(parsed.error, label));
  return parsed.data;
};

const validateHome = (data: unknown, label: string): HomeConfig => {
  const parsed = homeSchema.safeParse(data);
  if (!parsed.success) throw new Error(formatZodError(parsed.error, label));
  return parsed.data;
};

const buildFiles = async (slug: string, extraction: Json) => {
  const defaultBrand = validateBrand(
    await readJson(path.join(BRAND_DIR, '_default', 'brand.json')),
    'src/data/brands/_default/brand.json'
  );
  const defaultHome = validateHome(
    await readJson(path.join(BRAND_DIR, '_default', 'home.json')),
    'src/data/brands/_default/home.json'
  );

  const targetBrand: Record<string, unknown> = mergeDeep(defaultBrand, extraction.brand ?? {});
  const targetHome: Record<string, unknown> = mergeDeep(defaultHome, extraction.home ?? {});

  // Map simple brand colors (hex) into full token set for light/dark
  const derivedColors = deriveBrandTokens(extraction.brand?.colors, defaultBrand.colors);
  targetBrand.colors = {
    ...targetBrand.colors,
    ...derivedColors,
    primary: extraction.brand?.colors?.primary ?? (defaultBrand.colors as any)?.primary,
    accent: extraction.brand?.colors?.accent ?? (defaultBrand.colors as any)?.accent,
    bg: extraction.brand?.colors?.bg ?? (defaultBrand.colors as any)?.bg,
    text: extraction.brand?.colors?.text ?? (defaultBrand.colors as any)?.text,
  };

  // Map optional fonts into typography tokens
  if (extraction.brand?.fonts) {
    targetBrand.typography = {
      ...(targetBrand.typography as Json),
      sans: extraction.brand.fonts.body ?? (targetBrand.typography as Json)?.sans,
      serif: extraction.brand.fonts.heading ?? (targetBrand.typography as Json)?.serif,
      heading: extraction.brand.fonts.heading ?? (targetBrand.typography as Json)?.heading,
    };
  }

  // Assets mapping (download if remote)
  const assets: { [key: string]: string | null | undefined } = {};

  const maybeDownload = async (key: string, url?: string | null) => {
    if (!url || typeof url !== 'string' || !/^https?:\/\//i.test(url)) return url ?? null;
    const filename = inferFilename(url, `${key}.asset`);
    const rel = `${slug}/${filename}`;
    return downloadAsset(url, rel);
  };

  // Logo
  const logoUrl = extraction.assets?.logo ?? extraction.brand?.assets?.logoUrl;
  const logoPath = await maybeDownload('logo', logoUrl);
  if (logoPath) {
    targetBrand.assets = targetBrand.assets || {};
    targetBrand.assets.logo = { ...(targetBrand.assets as Json).logo, svg: logoPath };
  }

  // Favicon
  const faviconUrl = extraction.assets?.favicon ?? extraction.brand?.assets?.faviconUrl;
  const faviconPath = await maybeDownload('favicon', faviconUrl);
  if (faviconPath) {
    targetBrand.assets = targetBrand.assets || {};
    targetBrand.assets.favicon = { ...(targetBrand.assets as Json).favicon, svg: faviconPath };
  }

  // OG Image
  const ogUrl = extraction.assets?.ogImage ?? extraction.brand?.assets?.ogImageUrl;
  const ogPath = await maybeDownload('og-image', ogUrl);
  if (ogPath) {
    targetBrand.assets = targetBrand.assets || {};
    targetBrand.assets.ogImage = { ...(targetBrand.assets as Json).ogImage, url: ogPath };
  }

  // Hero media
  const heroImgUrl = extraction.assets?.heroImage ?? extraction.home?.hero?.imageUrl;
  const heroImgPath = await maybeDownload('hero', heroImgUrl);
  if (heroImgPath) {
    targetHome.hero = targetHome.hero || {};
    (targetHome.hero as Json).image = {
      ...(targetHome.hero as Json).image,
      src: heroImgPath,
    };
  }

  // Write files
  const brandOutPath = path.join(BRAND_DIR, slug, 'brand.json');
  const homeOutPath = path.join(BRAND_DIR, slug, 'home.json');

  // Preserve default hero video; allow title/subtitle override
  const defaultHeroVideo = defaultHome.hero?.video;
  if (targetHome.hero) {
    if (extraction.content?.heroTitle) targetHome.hero.title = extraction.content.heroTitle;
    if (extraction.content?.heroSubtitle) targetHome.hero.subtitle = extraction.content.heroSubtitle;
    // never drop default video
    if (defaultHeroVideo) {
      targetHome.hero.video = defaultHeroVideo;
    }
  }

  validateBrand(targetBrand, `generated brand (${slug})`);
  validateHome(targetHome, `generated home (${slug})`);

  await writeJson(brandOutPath, targetBrand);
  await writeJson(homeOutPath, targetHome);
};

const runValidate = () => {
  execSync('npm run validate:brands', { stdio: 'inherit', cwd: ROOT });
};

const normalizeHex = (hex?: string | null) => {
  if (!hex || typeof hex !== 'string') return undefined;
  const m = hex.trim().match(/^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/);
  if (!m) return hex;
  const value = m[1];
  if (value.length === 3) {
    return (
      '#' +
      value
        .split('')
        .map((c) => c + c)
        .join('')
        .toUpperCase()
    );
  }
  return '#' + value.toUpperCase();
};

const normalizeExtraction = (data: Extraction, strict: boolean): Extraction => {
  const normalized = structuredClone(data) as Extraction;
  normalized.meta.sourceUrl = new URL(data.meta.sourceUrl).toString();

  normalized.brand.colors.primary = normalizeHex(data.brand.colors.primary) ?? data.brand.colors.primary;
  if (data.brand.colors.accent) normalized.brand.colors.accent = normalizeHex(data.brand.colors.accent);
  if (data.brand.colors.bg) normalized.brand.colors.bg = normalizeHex(data.brand.colors.bg);
  if (data.brand.colors.text) normalized.brand.colors.text = normalizeHex(data.brand.colors.text);

  if (strict) {
    const hasAsset =
      Boolean(data.brand.logo?.url) || Boolean(data.brand.favicon?.url) || Boolean(data.assets?.heroImage?.url);
    if (!hasAsset) {
      throw new Error('Strict mode: mindestens ein Asset (logo|favicon|heroImage) muss vorhanden sein.');
    }
  }
  return normalized;
};

const main = async () => {
  const args = process.argv.slice(2);
  const slugArg = args.find((a) => a.startsWith('--slug='));
  if (!slugArg) throw new Error('Bitte --slug=<slug> angeben');
  const slug = slugArg.split('=')[1];
  if (!slug) throw new Error('Slug ist leer');

  const inputArg = args.find((a) => a.startsWith('--input='));
  const strict = args.includes('--strict');

  const inputPath = inputArg
    ? path.resolve(inputArg.split('=')[1])
    : path.join(EXTRACTIONS_DIR, slug, 'extraction.json');

  const raw = await readJson(inputPath);
  let extraction: Extraction;
  try {
    extraction = extractionSchema.parse(raw);
  } catch (error) {
    const message = error instanceof Error && 'issues' in error ? formatExtractionError(error as any) : String(error);
    console.error('❌ Extraction ungültig:\n' + message);
    process.exit(1);
  }

  const normalized = normalizeExtraction(extraction, strict);

  await buildFiles(slug, normalized as unknown as Json);
  runValidate();
  console.log(`✅ Prospect brand "${slug}" erstellt und validiert.`);
};

main().catch((err) => {
  console.error('❌ Fehler beim Generieren der Prospect-Brand:', err.message);
  process.exit(1);
});
