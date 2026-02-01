/**
 * highlights.ts - Highlights Section Autofit Module
 *
 * Normalization and variant selection for highlights/listings section.
 * Part of Phase 3: Highlights variants implementation.
 */

import type { ListingItem, HighlightsProps } from './widget-props';

export type HighlightsVariantKey = 'default' | 'few' | 'many' | 'discreet' | 'no-image';

export interface HighlightsMeta {
  listingCount: number;
  hasImages: boolean;
  isDiscreet: boolean;
  hasCta: boolean;
  pageSize: number;
}

export interface NormalizedHighlights {
  data: HighlightsProps;
  meta: HighlightsMeta;
}

export interface HighlightsVariantRule {
  variant: HighlightsVariantKey;
  reason: string;
}

/**
 * Normalize highlights configuration and compute metadata
 */
export function normalizeHighlights(
  highlightsConfig: Record<string, unknown>,
  listings: ListingItem[]
): NormalizedHighlights {
  const eyebrow = String(highlightsConfig.eyebrow ?? 'Aktuelle Highlights');
  const title = String(highlightsConfig.title ?? 'Aktuelle Highlights');
  const subtitle = String(highlightsConfig.subtitle ?? '');
  const pageSize = typeof highlightsConfig.pageSize === 'number' ? highlightsConfig.pageSize : 4;
  const isDiscreet = highlightsConfig.discreet === true;
  const cta = highlightsConfig.cta as HighlightsProps['cta'] | undefined;

  const hasImages = listings.some((listing) => {
    const img = listing.image;
    return img && typeof img === 'string' && img.length > 0 && !img.includes('placeholder');
  });

  const totalPages = Math.ceil(listings.length / pageSize);
  const hasPager = listings.length > pageSize;

  const data: HighlightsProps = {
    eyebrow,
    title,
    subtitle,
    listings,
    pageSize,
    totalPages,
    hasPager,
    cta,
  };

  const meta: HighlightsMeta = {
    listingCount: listings.length,
    hasImages,
    isDiscreet,
    hasCta: !!cta,
    pageSize,
  };

  return { data, meta };
}

/**
 * Select highlights variant based on content characteristics
 */
export function selectHighlightsVariant(normalized: NormalizedHighlights): HighlightsVariantRule {
  const { meta } = normalized;

  // Discreet if explicitly set or no listings
  if (meta.isDiscreet || meta.listingCount === 0) {
    return {
      variant: 'discreet',
      reason: meta.isDiscreet ? 'Discreet mode enabled' : 'No listings available',
    };
  }

  // Few listings (1-2) - use prominent layout
  if (meta.listingCount <= 2) {
    return {
      variant: 'few',
      reason: 'Few listings (1-2), use hero-style cards',
    };
  }

  // Many listings (8+) - use grid with pagination
  if (meta.listingCount >= 8) {
    return {
      variant: 'many',
      reason: 'Many listings (8+), use compact grid',
    };
  }

  // No images detected - use list layout
  if (!meta.hasImages) {
    return {
      variant: 'no-image',
      reason: 'No listing images, use list layout',
    };
  }

  // Default (3-7 listings with images)
  return {
    variant: 'default',
    reason: 'Standard highlights layout (3-7 listings)',
  };
}

/**
 * Get grid column classes for variant
 */
export function getHighlightsGridClasses(variant: HighlightsVariantKey): string {
  switch (variant) {
    case 'few':
      return 'grid gap-6 sm:gap-8 grid-cols-1 sm:grid-cols-2 max-w-4xl mx-auto';
    case 'many':
      return 'grid gap-4 grid-cols-1 xs:grid-cols-2 md:grid-cols-3 lg:grid-cols-4';
    case 'no-image':
      return 'space-y-3';
    case 'discreet':
      return '';
    case 'default':
    default:
      return 'grid gap-4 sm:gap-5 grid-cols-1 xs:grid-cols-2 lg:grid-cols-4';
  }
}

/**
 * Get listing card variant for highlights variant
 */
export function getListingCardVariant(
  highlightsVariant: HighlightsVariantKey
): 'highlight' | 'hero' | 'compact' | 'list' {
  switch (highlightsVariant) {
    case 'few':
      return 'hero';
    case 'many':
      return 'compact';
    case 'no-image':
      return 'list';
    case 'default':
    default:
      return 'highlight';
  }
}
