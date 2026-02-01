/**
 * legacy.ts - Backward Compatibility Layer
 *
 * Maintains current hardcoded section order as default fallback.
 * Ensures brands without sectionsOrder field render identically to current implementation.
 */

/**
 * Legacy section order from current index.astro implementation.
 * Used when home.sectionsOrder is not specified.
 *
 * This represents the hardcoded rendering sequence:
 * 1. Hero (handled separately)
 * 2. Highlights (handled separately - custom inline)
 * 3-10. Sections from home.sections
 */
export const LEGACY_SECTIONS_ORDER: string[] = [
  'seller',     // Content (reverse=false)
  'investor',   // Content (reverse=true)
  'stats',      // Stats
  'regions',    // Features2 (columns=3)
  'services',   // Features2 (columns=3)
  'about',      // Content
  'cta',        // CallToAction
  'contact',    // Contact (with info slot)
];

/**
 * Get effective section order with fallback chain:
 * 1. home.sectionsOrder (if provided and valid)
 * 2. LEGACY_SECTIONS_ORDER (fallback)
 */
export function getEffectiveSectionsOrder(
  sectionsOrder?: string[] | null
): string[] {
  // Use provided order if it's a non-empty array
  if (Array.isArray(sectionsOrder) && sectionsOrder.length > 0) {
    return sectionsOrder;
  }

  // Fallback to legacy order
  return [...LEGACY_SECTIONS_ORDER];
}

/**
 * Validate section keys against known sections
 */
export function validateSectionKeys(
  order: string[],
  availableSections: Set<string>
): { valid: string[]; invalid: string[] } {
  const valid: string[] = [];
  const invalid: string[] = [];

  order.forEach(key => {
    if (availableSections.has(key)) {
      valid.push(key);
    } else {
      invalid.push(key);
    }
  });

  return { valid, invalid };
}

/**
 * Filter section order to only include keys that exist in home.sections
 */
export function filterExistingSections(
  order: string[],
  sectionsData: Record<string, unknown> | undefined
): string[] {
  if (!sectionsData) return [];

  const availableKeys = new Set(Object.keys(sectionsData));
  return order.filter(key => availableKeys.has(key));
}
