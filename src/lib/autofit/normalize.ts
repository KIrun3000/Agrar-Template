/**
 * normalize.ts - Data Stabilization & Flag Generation
 *
 * Transforms raw section data into stable, predictable structures with computed metadata flags.
 * Part of the Autofit Layer architecture.
 */

// Import placeholder image for fallback chain
import placeholderObj from '~/assets/images/placeholders/placeholder-objekt.jpg';

// Core Types
export interface ContentSignals {
  hasH1: boolean;                   // Title exists and non-empty
  hasBullets: boolean;              // Contains bullet lists (•, -, *)
  hasMultipleParagraphs: boolean;   // Contains \n\n separators
  paragraphCount: number;           // Estimated paragraph count
}
export interface NormalizedSection {
  key: string;                    // Section identifier (e.g., "seller", "investor")
  data: Record<string, unknown>;  // Stabilized section data with defaults
  meta: SectionMeta;              // Computed metadata flags
}

export interface SectionMeta {
  itemsCount: number;             // Number of items in items[] array
  hasMedia: boolean;              // Has image or video
  textDensity: 'short' | 'normal' | 'long';  // Based on title+subtitle+description length
  isDiscreet?: boolean;           // Explicitly marked as discreet (from section data)
  missingRequired: string[];      // List of missing critical fields
  hasActions: boolean;            // Has CTA actions
  hasMap: boolean;                // Contact-specific: has embedded map
  hasAgent: boolean;              // Contact-specific: has agent info
  columns?: number;               // Grid columns if specified

  // Phase 2 additions
  contentSignals: ContentSignals; // Structured content analysis
  resolvedImageSrc?: string;      // Resolved image URL (with fallback chain)
}

/**
 * Compute content signals for structured content analysis
 */
function computeContentSignals(data: Record<string, unknown>): ContentSignals {
  const title = String(data.title ?? '');
  const items = Array.isArray(data.items) ? data.items : [];

  const allText = [
    title,
    String(data.subtitle ?? ''),
    ...items.map(i => String((i as any)?.description ?? ''))
  ].join(' ');

  return {
    hasH1: title.trim().length > 0,
    hasBullets: /[•\-\*]\s/.test(allText),
    hasMultipleParagraphs: /\n\s*\n/.test(allText),
    paragraphCount: Math.max(1, allText.split(/\n\s*\n/).length),
  };
}

/**
 * Resolve image with fallback chain: section → brand default → generic placeholder
 */
export function resolveImageWithFallback(
  sectionImage: unknown,
  brandDefaultSrc?: string
): string | null {
  // 1. Section image (highest priority)
  if (sectionImage && typeof sectionImage === 'object' && 'src' in sectionImage) {
    return (sectionImage as any).src;
  }

  // 2. Brand default
  if (brandDefaultSrc) {
    return brandDefaultSrc;
  }

  // 3. Generic placeholder (lowest priority)
  return placeholderObj.src;
}

/**
 * Compute metadata flags for a section
 */
function computeMeta(key: string, data: Record<string, unknown>): SectionMeta {
  const items = Array.isArray(data.items) ? data.items : [];
  const actions = Array.isArray(data.actions) ? data.actions : [];

  // Text density calculation
  const textLength = [
    String(data.title ?? ''),
    String(data.subtitle ?? ''),
    String(data.tagline ?? ''),
    items.map(i => String((i as any)?.description ?? '')).join(''),
  ].join('').length;

  const textDensity: 'short' | 'normal' | 'long' =
    textLength < 200 ? 'short' : textLength > 800 ? 'long' : 'normal';

  // Media detection
  const hasMedia = Boolean(
    data.image ||
    data.video ||
    (data.image && typeof data.image === 'object')
  );

  // Missing required fields (section-specific)
  const missingRequired: string[] = [];
  if (key === 'contact') {
    if (!data.title) missingRequired.push('title');
    if (!Array.isArray(data.inputs) || data.inputs.length === 0) {
      missingRequired.push('inputs');
    }
  } else if (['seller', 'investor', 'about'].includes(key)) {
    if (!data.title) missingRequired.push('title');
  }

  // Contact-specific flags
  const info = key === 'contact' ? (data.info as Record<string, unknown> ?? {}) : {};
  const hasMap = Boolean(info?.map && typeof info.map === 'object' && (info.map as any)?.embedUrl);
  const hasAgent = Boolean(info?.agent && typeof info.agent === 'object' && (info.agent as any)?.name);

  // Phase 2: Content signals
  const contentSignals = computeContentSignals(data);

  // Phase 2: Image resolution with fallback chain
  const resolvedImageSrc = resolveImageWithFallback(data.image, undefined);

  // Phase 2: Extract isDiscreet flag if present
  const isDiscreet = typeof data.isDiscreet === 'boolean' ? data.isDiscreet : undefined;

  return {
    itemsCount: items.length,
    hasMedia,
    textDensity,
    missingRequired,
    hasActions: actions.length > 0,
    hasMap,
    hasAgent,
    columns: typeof data.columns === 'number' ? data.columns : undefined,
    // Phase 2 additions
    contentSignals,
    resolvedImageSrc: resolvedImageSrc ?? undefined,
    isDiscreet,
  };
}

/**
 * Defensive text clamping to prevent layout blowups
 */
function clampText(text: unknown, maxLength: number): string {
  const str = String(text ?? '');
  if (str.length <= maxLength) return str;
  console.warn(`[Normalize] Text truncated from ${str.length} to ${maxLength} chars`);
  return str.slice(0, maxLength) + '...';
}

/**
 * Sanitize HTML: strip all tags, keep only plain text
 * (Only if we detect HTML-like content in legacy data)
 */
function sanitizeToPlainText(text: unknown): string {
  const str = String(text ?? '');
  // If contains HTML tags, strip them
  if (/<[^>]+>/.test(str)) {
    console.warn('[Normalize] HTML detected in text field, stripping tags');
    return str.replace(/<[^>]+>/g, '').replace(/\s+/g, ' ').trim();
  }
  return str;
}

/**
 * Normalize a single section with defensive defaults
 */
export function normalizeSection(
  key: string,
  rawData: Record<string, unknown> | undefined
): NormalizedSection {
  // Deep clone to avoid mutations
  const data = rawData ? JSON.parse(JSON.stringify(rawData)) : {};

  // Apply defensive defaults with length clamps
  const normalized = {
    ...data, // Preserve all other fields (before sanitized overrides)
    id: data.id ?? key,
    title: clampText(sanitizeToPlainText(data.title), 120), // Max 120 chars for titles
    subtitle: clampText(sanitizeToPlainText(data.subtitle), 240), // Max 240 chars for subtitles
    tagline: clampText(sanitizeToPlainText(data.tagline), 80), // Max 80 chars for taglines
    items: Array.isArray(data.items) ? data.items.map((item: any) => ({
      ...item,
      title: item?.title ? clampText(sanitizeToPlainText(item.title), 100) : item?.title,
      description: item?.description ? clampText(item.description, 600) : item?.description, // Keep formatting chars like \n
    })) : [],
    actions: Array.isArray(data.actions) ? data.actions : [],
    columns: typeof data.columns === 'number' ? data.columns : undefined,
    image: data.image ?? null,
  };

  // Generate meta flags
  const meta = computeMeta(key, normalized);

  return { key, data: normalized, meta };
}

/**
 * Helper: Normalize image to ensure consistent structure
 */
export function normalizeImage(
  image: unknown,
  fallbackSrc?: string
): Record<string, unknown> | null {
  // String HTML passthrough
  if (typeof image === 'string') {
    return { html: image };
  }

  // Object with src
  if (image && typeof image === 'object' && 'src' in image) {
    return {
      src: (image as any).src,
      alt: (image as any).alt ?? '',
      width: (image as any).width ?? 1200,
      height: (image as any).height ?? 800,
    };
  }

  // Fallback
  if (fallbackSrc) {
    return { src: fallbackSrc, alt: '', width: 1200, height: 800 };
  }

  return null;
}

/**
 * Batch normalization for all sections
 */
export function normalizeSections(
  sectionsData: Record<string, unknown> | undefined
): Map<string, NormalizedSection> {
  const normalized = new Map<string, NormalizedSection>();
  const knownSections = [
    'seller', 'investor', 'stats', 'regions',
    'services', 'about', 'cta', 'contact'
  ];

  knownSections.forEach(key => {
    const rawData = sectionsData?.[key] as Record<string, unknown> | undefined;
    normalized.set(key, normalizeSection(key, rawData));
  });

  return normalized;
}
