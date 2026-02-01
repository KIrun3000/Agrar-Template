/**
 * widget-props.ts - Type-safe Widget Prop Interfaces
 *
 * Defines TypeScript interfaces for all widget component props.
 * Part of Phase 3: Registry Typing enhancement.
 */

/**
 * Content widget props (seller, investor, about sections)
 * Used by: Content.astro, ContentLongform.astro, ContentCompact.astro
 */
export interface ContentProps {
  id?: string;
  tagline?: string;
  title?: string;
  subtitle?: string;
  items?: Array<{
    title?: string;
    description?: string;
    icon?: string;
    callToAction?: {
      text: string;
      href: string;
      icon?: string;
    };
  }>;
  image?: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  isReversed?: boolean;
}

/**
 * Stats widget props (stats section)
 * Used by: Stats.astro
 */
export interface StatsProps {
  id?: string;
  stats: Array<{
    title?: string;
    amount?: string;
    icon?: string;
  }>;
}

/**
 * Features2 widget props (regions, services sections)
 * Used by: Features2.astro, Features2Compact.astro
 */
export interface Features2Props {
  id?: string;
  tagline?: string;
  title?: string;
  subtitle?: string;
  columns?: number;
  items?: Array<{
    title?: string;
    description?: string;
    icon?: string;
    callToAction?: {
      text: string;
      href: string;
      icon?: string;
    };
  }>;
}

/**
 * CallToAction widget props (cta section)
 * Used by: CallToAction.astro, CallToActionMinimal.astro
 */
export interface CallToActionProps {
  id?: string;
  title?: string;
  subtitle?: string;
  tagline?: string;
  actions?: Array<{
    variant: 'primary' | 'secondary' | 'tertiary';
    text: string;
    href: string;
    icon?: string;
  }>;
}

/**
 * Contact widget props (contact section)
 * Used by: Contact.astro, ContactMinimal.astro
 */
export interface ContactProps {
  id?: string;
  tagline?: string;
  title?: string;
  subtitle?: string;
  inputs?: Array<{
    label: string;
    name: string;
    type: string;
    placeholder?: string;
    autocomplete?: string;
  }>;
  textarea?: {
    label: string;
    name: string;
    placeholder?: string;
  };
  button?: string;
}

/**
 * Listing type for highlights/listings sections
 * Used by: HighlightsFew, HighlightsMany, HighlightsNoImage, HighlightsDiscreet
 */
export interface ListingItem {
  id: string;
  slug?: string;
  href?: string;
  title: string;
  status?: string;
  statusTone?: 'default' | 'success' | 'warning' | 'danger';
  category?: string;
  regionLabel?: string;
  image?: string;
  imageAlt?: string;
  metrics?: Array<{
    label: string;
    value: string;
  }>;
  chips?: Array<{
    label: string;
    value: string;
  }>;
}

/**
 * Highlights widget props (highlights section with variants)
 * Used by: HighlightsFew, HighlightsMany, HighlightsDiscreet, HighlightsNoImage
 */
export interface HighlightsProps {
  id?: string;
  eyebrow?: string;
  title?: string;
  subtitle?: string;
  listings: ListingItem[];
  pageSize?: number;
  totalPages?: number;
  hasPager?: boolean;
  cta?: {
    label: string;
    href: string;
  };
}

/**
 * Hero widget props (hero section with variants)
 * Used by: HeroMediaFirst, HeroTextOnly, HeroVideo, HeroDiscreet
 */
export interface HeroProps {
  title?: string;
  subtitle?: string;
  tagline?: string;
  actions?: Array<{
    variant: 'primary' | 'secondary' | 'tertiary';
    text: string;
    href: string;
    icon?: string;
  }>;
  image?: {
    src: string;
    alt?: string;
    width?: number;
    height?: number;
  };
  video?: {
    poster?: string;
    sources: Array<{
      src: string;
      type: string;
    }>;
  };
  overlay?: {
    light: string;
    dark: string;
  };
}
