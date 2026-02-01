/**
 * registry.ts - Component Mapping Registry
 *
 * Maps section keys and variants to Astro widget components with prop transformers.
 * Part of the Autofit Layer architecture.
 */

import type { NormalizedSection } from './normalize';
import type { VariantKey } from './rules';

// Component reference type
export type ComponentPath = string; // e.g., '~/components/widgets/Content.astro'

export interface WidgetMapping {
  component: ComponentPath;
  propsTransform?: (section: NormalizedSection) => Record<string, unknown>;
  requiresSlots?: string[];  // e.g., ['info'] for Contact
}

export type VariantRegistry = {
  [variant in VariantKey]?: WidgetMapping;
};

export type SectionRegistry = {
  [sectionKey: string]: VariantRegistry;
};

/**
 * Shared transformer factories (DRY - Don't Repeat Yourself)
 */

// Content transformer (for seller, investor, about)
function createContentTransform(defaultIsReversed: boolean) {
  return (section: NormalizedSection) => ({
    id: section.data.id,
    tagline: section.data.tagline,
    title: section.data.title,
    subtitle: section.data.subtitle,
    items: section.data.items ?? [],
    image: section.data.image,
    isReversed: section.data.isReversed ?? defaultIsReversed,
  });
}

// Features transformer (for regions, services)
function createFeaturesTransform(defaultColumns: number) {
  return (section: NormalizedSection) => ({
    id: section.data.id,
    tagline: section.data.tagline,
    title: section.data.title,
    subtitle: section.data.subtitle,
    columns: typeof defaultColumns === 'number' ? defaultColumns : (section.data.columns ?? 3),
    items: section.data.items ?? [],
  });
}

// Stats transformer
const statsTransform = (section: NormalizedSection) => ({
  id: section.data.id,
  stats: section.data.items ?? section.data.stats ?? [],
});

// CTA transformer
const ctaTransform = (section: NormalizedSection) => ({
  id: section.data.id,
  title: section.data.title,
  subtitle: section.data.subtitle,
  tagline: section.data.tagline,
  actions: section.data.actions ?? [],
});

// Contact transformer
const contactTransform = (section: NormalizedSection) => ({
  id: section.data.id,
  tagline: section.data.tagline,
  title: section.data.title,
  subtitle: section.data.subtitle,
  inputs: section.data.inputs ?? [],
  textarea: section.data.textarea,
  button: section.data.button,
});

/**
 * Main registry mapping sections and variants to components
 */
export const SECTION_REGISTRY: SectionRegistry = {
  seller: {
    default: {
      component: '~/components/widgets/Content.astro',
      propsTransform: createContentTransform(false),
    },
    longform: {
      component: '~/components/widgets/Content/ContentLongform.astro',
      propsTransform: createContentTransform(false),
    },
    compact: {
      component: '~/components/widgets/Content/ContentCompact.astro',
      propsTransform: createContentTransform(false),
    },
  },

  investor: {
    default: {
      component: '~/components/widgets/Content.astro',
      propsTransform: createContentTransform(true), // Default reversed for investor
    },
    longform: {
      component: '~/components/widgets/Content/ContentLongform.astro',
      propsTransform: createContentTransform(true),
    },
    compact: {
      component: '~/components/widgets/Content/ContentCompact.astro',
      propsTransform: createContentTransform(true),
    },
  },

  stats: {
    default: {
      component: '~/components/widgets/Stats.astro',
      propsTransform: statsTransform,
    },
    grid: {
      component: '~/components/widgets/Stats.astro',
      propsTransform: statsTransform,
      // Note: Stats component should handle grid layout internally based on item count
    },
  },

  regions: {
    default: {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(3),
    },
    compact: {
      component: '~/components/widgets/Features2/Features2Compact.astro',
      propsTransform: createFeaturesTransform(3),
    },
    'grid-2': {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(2),
    },
    'grid-4': {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(4),
    },
  },

  services: {
    default: {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(3),
    },
    compact: {
      component: '~/components/widgets/Features2/Features2Compact.astro',
      propsTransform: createFeaturesTransform(3),
    },
    'grid-2': {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(2),
    },
    'grid-4': {
      component: '~/components/widgets/Features2.astro',
      propsTransform: createFeaturesTransform(4),
    },
  },

  about: {
    default: {
      component: '~/components/widgets/Content.astro',
      propsTransform: createContentTransform(false),
    },
    longform: {
      component: '~/components/widgets/Content/ContentLongform.astro',
      propsTransform: createContentTransform(false),
    },
    compact: {
      component: '~/components/widgets/Content/ContentCompact.astro',
      propsTransform: createContentTransform(false),
    },
  },

  cta: {
    default: {
      component: '~/components/widgets/CallToAction.astro',
      propsTransform: ctaTransform,
    },
    minimal: {
      component: '~/components/widgets/CallToAction/CallToActionMinimal.astro',
      propsTransform: ctaTransform,
    },
  },

  contact: {
    default: {
      component: '~/components/widgets/Contact.astro',
      requiresSlots: ['info'],
      propsTransform: contactTransform,
    },
    minimal: {
      component: '~/components/widgets/Contact/ContactMinimal.astro',
      propsTransform: contactTransform,
    },
  },
};

/**
 * Get widget mapping for a section key and variant
 * Returns null if no mapping found (graceful degradation)
 */
export function getWidgetMapping(
  sectionKey: string,
  variant: VariantKey
): WidgetMapping | null {
  const sectionMapping = SECTION_REGISTRY[sectionKey];
  if (!sectionMapping) {
    console.warn(`[Registry] Unknown section key: ${sectionKey}`);
    return null;
  }

  // Try requested variant, fallback to default
  const mapping = sectionMapping[variant] ?? sectionMapping.default;
  if (!mapping) {
    console.warn(`[Registry] No mapping for ${sectionKey}.${variant}`);
    return null;
  }

  return mapping;
}

/**
 * Get transformed props for a widget
 */
export function getWidgetProps(
  section: NormalizedSection,
  mapping: WidgetMapping
): Record<string, unknown> {
  if (mapping.propsTransform) {
    return mapping.propsTransform(section);
  }
  // Fallback: pass normalized data as-is
  return { ...section.data };
}
