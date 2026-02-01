/**
 * rules.ts - Variant Selection Logic
 *
 * Determines which variant to use based on normalized section data and metadata flags.
 * Part of the Autofit Layer architecture.
 */

import type { NormalizedSection } from './normalize';

export type VariantKey =
  // Universal
  | 'default'           // Standard rendering (existing widgets)
  | 'hidden'            // Skip rendering

  // Content variants (seller, investor, about)
  | 'longform'          // Extended text, generous spacing
  | 'compact'           // Tight spacing, concise

  // Stats variants
  | 'grid'              // Grid layout (alternative to horizontal)

  // Features variants (regions, services)
  | 'grid-2'            // 2-column grid
  | 'grid-4'            // 4-column grid

  // CTA variants
  | 'minimal';          // Minimal design, no border/shadow

export interface VariantRule {
  variant: VariantKey;
  reason?: string;      // For debugging/logging
}

/**
 * Allowed variants per section (for validation)
 */
const ALLOWED_VARIANTS: Record<string, VariantKey[]> = {
  seller: ['default', 'hidden', 'longform', 'compact'],
  investor: ['default', 'hidden', 'longform', 'compact'],
  about: ['default', 'hidden', 'longform', 'compact'],
  stats: ['default', 'hidden', 'grid'],
  regions: ['default', 'hidden', 'compact', 'grid-2', 'grid-4'],
  services: ['default', 'hidden', 'compact', 'grid-2', 'grid-4'],
  cta: ['default', 'hidden', 'minimal'],
  contact: ['default', 'minimal'], // Contact should NOT be hidden (required section)
};

/**
 * Check if manual override variant is valid for section
 */
function validateManualOverride(key: string, variant: unknown): VariantKey | null {
  if (typeof variant !== 'string') return null;

  const allowed = ALLOWED_VARIANTS[key] || ['default', 'hidden'];
  if (!allowed.includes(variant as VariantKey)) {
    console.warn(
      `[Autofit] Invalid variant '${variant}' for section '${key}'. ` +
      `Allowed: ${allowed.join(', ')}. Falling back to autofit.`
    );
    return null;
  }

  return variant as VariantKey;
}

/**
 * Select variant for a section based on normalized data
 * Precedence: manual override → autofit rules → default
 */
export function selectVariant(
  section: NormalizedSection
): VariantRule {
  const { key, data, meta } = section;

  // PRECEDENCE 1: Manual override (if valid)
  if (data.variant) {
    const validatedVariant = validateManualOverride(key, data.variant);
    if (validatedVariant) {
      return {
        variant: validatedVariant,
        reason: 'Manual override from config'
      };
    }
  }

  // PRECEDENCE 2: Autofit rules (based on content characteristics)
  // UNIVERSAL RULES: Apply to all sections

  // Check if section allows hiding (contact must never be hidden)
  const allowsHidden = ALLOWED_VARIANTS[key]?.includes('hidden') ?? true;

  // 1. HIDDEN RULE: Missing critical required fields (only if hiding allowed)
  if (allowsHidden && meta.missingRequired.length > 0) {
    return {
      variant: 'hidden',
      reason: `Missing required: ${meta.missingRequired.join(', ')}`
    };
  }

  // 2. HIDDEN RULE: Empty sections with no content (only if hiding allowed)
  if (allowsHidden && !meta.hasMedia && meta.itemsCount === 0 && !data.title && !data.subtitle) {
    return {
      variant: 'hidden',
      reason: 'No content to render'
    };
  }

  // SECTION-SPECIFIC RULES (Phase 2 - Active)
  switch (key) {
    // CONTENT SECTIONS (seller, investor, about)
    case 'seller':
    case 'investor':
    case 'about':
      // Longform if long text + multiple items
      if (meta.textDensity === 'long' && meta.itemsCount > 3) {
        return { variant: 'longform', reason: 'Extended content with many items' };
      }

      // Longform if structured content (paragraphs + bullets)
      if (meta.contentSignals.hasMultipleParagraphs && meta.contentSignals.hasBullets) {
        return { variant: 'longform', reason: 'Structured long-form content' };
      }

      // Compact if short text + no media
      if (meta.textDensity === 'short' && !meta.hasMedia) {
        return { variant: 'compact', reason: 'Minimal content, no image' };
      }

      // Default
      return { variant: 'default', reason: 'Standard content layout' };

    // STATS SECTION
    case 'stats':
      // Hidden if no items
      if (meta.itemsCount === 0) {
        return { variant: 'hidden', reason: 'No stats items' };
      }

      // Grid layout if 4+ items
      if (meta.itemsCount >= 4) {
        return { variant: 'grid', reason: 'Better layout for 4+ stats' };
      }

      // Default (horizontal)
      return { variant: 'default', reason: 'Standard horizontal stats' };

    // FEATURES SECTIONS (regions, services)
    case 'regions':
    case 'services':
      // Hidden if no items
      if (meta.itemsCount === 0) {
        return { variant: 'hidden', reason: 'No feature items' };
      }

      // Explicit column override
      if (meta.columns === 2) {
        return { variant: 'grid-2', reason: 'Explicit 2-column' };
      }
      if (meta.columns === 4) {
        return { variant: 'grid-4', reason: 'Explicit 4-column' };
      }

      // Auto-select by item count
      if (meta.itemsCount === 2 || meta.itemsCount === 4) {
        return { variant: 'grid-2', reason: `${meta.itemsCount} items fit 2-col` };
      }
      if (meta.itemsCount >= 8) {
        return { variant: 'grid-4', reason: 'Many items, 4-col grid' };
      }

      // Compact if short + few items
      if (meta.textDensity === 'short' && meta.itemsCount <= 3) {
        return { variant: 'compact', reason: 'Few items, concise text' };
      }

      // Default (3-column)
      return { variant: 'default', reason: 'Standard 3-column grid' };

    // CTA SECTION
    case 'cta':
      // Hidden if no actions + no title
      if (!meta.hasActions && !data.title) {
        return { variant: 'hidden', reason: 'No CTA actions or title' };
      }

      // Minimal if short text + single action
      if (meta.textDensity === 'short' && meta.itemsCount <= 1) {
        return { variant: 'minimal', reason: 'Concise CTA with single action' };
      }

      // Default
      return { variant: 'default', reason: 'Standard CTA with card styling' };

    // CONTACT SECTION
    case 'contact':
      // Minimal if no extra info
      if (!meta.hasAgent && !meta.hasMap) {
        return { variant: 'minimal', reason: 'Simple contact form only' };
      }

      // Default (has agent or map info)
      return { variant: 'default', reason: 'Contact with info panel' };

    default:
      return { variant: 'default' };
  }
}

/**
 * Batch variant selection for all sections
 */
export function selectVariants(
  sections: Map<string, NormalizedSection>
): Map<string, VariantRule> {
  const variants = new Map<string, VariantRule>();
  sections.forEach((section, key) => {
    variants.set(key, selectVariant(section));
  });
  return variants;
}

/**
 * Future: Apply variant overrides from home.json
 * This will allow brands to explicitly override variant selection.
 */
export function applyVariantOverrides(
  variants: Map<string, VariantRule>,
  overrides?: Record<string, VariantKey>
): Map<string, VariantRule> {
  if (!overrides) return variants;

  Object.entries(overrides).forEach(([key, variantKey]) => {
    if (variants.has(key)) {
      variants.set(key, {
        variant: variantKey,
        reason: 'Explicit override from config'
      });
    }
  });

  return variants;
}
