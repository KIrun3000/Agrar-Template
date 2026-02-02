export type BrandConfig = {
  name?: string;
  colors?: {
    light?: Record<string, string | number | null | undefined>;
    dark?: Record<string, string | number | null | undefined>;
  };
  typography?: {
    sans?: string;
    serif?: string;
    heading?: string;
  };
  assets?: {
    logo?: { svg?: string | null; png?: string | null };
    favicon?: { ico?: string | null; svg?: string | null; appleTouch?: string | null; maskColor?: string | null };
    ogImage?: { url?: string | null; width?: number | null; height?: number | null };
  };
  ui?: {
    radius?: Record<string, string | number | null | undefined>;
    shadow?: Record<string, string | null | undefined>;
  };
  evidence?: Record<string, unknown>;
};

export type HomeConfig = Record<string, unknown> & {
  metadata?: Record<string, unknown>;
  hero?: Record<string, unknown>;
  highlights?: Record<string, unknown>;
  sections?: Record<string, unknown>;
};

const brandModules = import.meta.glob('../data/brands/*/brand.json', { eager: true, import: 'default' });
const homeModules = import.meta.glob('../data/brands/*/home.json', { eager: true, import: 'default' });

const resolveSlug = () => {
  // Access env statically to satisfy Vite/Astro (no dynamic import.meta.env access)
  const envSlug = typeof import.meta !== 'undefined' ? import.meta.env.BRAND_SLUG : undefined;
  const processSlug = typeof process !== 'undefined' ? process.env.BRAND_SLUG : undefined;
  const slug = envSlug ?? processSlug;
  return slug && slug.trim().length > 0 ? slug.trim() : '_default';
};

const getBySlug = <T extends unknown>(modules: Record<string, unknown>, slug: string, fileName: string) => {
  const key = `../data/brands/${slug}/${fileName}`;
  const fallback = `../data/brands/_default/${fileName}`;
  return (modules[key] as T | undefined) ?? (modules[fallback] as T | undefined);
};

export const getActiveBrand = () => {
  const slug = resolveSlug();
  const brand = getBySlug<BrandConfig>(brandModules, slug, 'brand.json') ?? {};
  const home = getBySlug<HomeConfig>(homeModules, slug, 'home.json') ?? {};

  return { slug, brand, home };
};
