# Phase 3: Variant Expansion & Registry Typing

**Date**: 2026-01-28
**Status**: 📋 Planning
**Prerequisites**: ✅ Phase 2 Complete, ✅ Quick Wins Complete

## Overview

Phase 3 extends the autofit layer with additional high-ROI variants and type-safe registry improvements. Focus areas:
1. **Highlights/Listings variants** (few, many, discreet, no-image)
2. **Hero variants** (media-first, text-only, video)
3. **Features responsive variants** (automatic responsive column detection)
4. **Registry typing** (typed transformers per section)

## A) Variant Expansion

### Priority 1: Highlights/Listings Variants (Highest ROI)

**Current State**: Single hardcoded highlights section in index.astro (lines 144-341)

**Problem**:
- All brands use identical highlights layout (3-4 cards)
- No adaptation for:
  - Few listings (1-2 items) - wastes space
  - Many listings (8+ items) - needs pagination/grid
  - Discreet marketing - no highlights section at all
  - No-image listings - broken cards if images missing

**Proposed Variants**:

1. **`few`** (1-2 listings)
   - Larger cards (hero-style)
   - 1-2 column layout (not 3)
   - More prominent CTAs
   - Centered alignment

2. **`many`** (8+ listings)
   - 4-column grid (desktop)
   - Compact cards
   - Pagination controls
   - "View All" CTA prominent

3. **`discreet`** (0 listings or discreet flag)
   - Hidden highlights section
   - Subtle mention: "Weitere Objekte auf Anfrage"
   - No visual listings
   - Direct to contact CTA

4. **`no-image`** (listings without images)
   - List-style layout (not cards)
   - Focus on text content (title, location, area)
   - Compact spacing
   - Icon-based differentiation

**Selection Rules**:
```typescript
function selectHighlightsVariant(highlights: Record<string, any>, listings: any[]): VariantRule {
  const listingCount = listings.length;
  const isDiscreet = highlights.discreet === true;
  const hasImages = listings.some(l => l.image?.src);

  // Discreet if explicitly set or no listings
  if (isDiscreet || listingCount === 0) {
    return { variant: 'discreet', reason: 'Discreet marketing or no listings' };
  }

  // Few listings (1-2)
  if (listingCount <= 2) {
    return { variant: 'few', reason: 'Few listings, use prominent layout' };
  }

  // Many listings (8+)
  if (listingCount >= 8) {
    return { variant: 'many', reason: 'Many listings, use grid with pagination' };
  }

  // No images detected
  if (!hasImages) {
    return { variant: 'no-image', reason: 'No listing images, use list layout' };
  }

  // Default (3-6 listings with images)
  return { variant: 'default', reason: 'Standard highlights layout' };
}
```

**Implementation**:
1. Create `src/lib/autofit/highlights.ts` - Highlights-specific normalization and rules
2. Create variant components:
   - `src/components/Highlights/HighlightsFew.astro`
   - `src/components/Highlights/HighlightsMany.astro`
   - `src/components/Highlights/HighlightsDiscreet.astro`
   - `src/components/Highlights/HighlightsNoImage.astro`
3. Update `index.astro` to use highlights autofit pipeline
4. Add `highlights.discreet` to home.schema.ts (optional boolean)

**Schema Addition**:
```typescript
highlights: z.object({
  eyebrow: z.string().optional(),
  title: z.string().optional(),
  subtitle: z.string().optional(),
  pageSize: z.number().int().positive().optional(),
  cta: z.object({
    label: z.string(),
    href: z.string(),
  }).optional(),
  source: z.string().optional(),
  discreet: z.boolean().optional(), // NEW: Enable discreet variant
}).optional(),
```

---

### Priority 2: Hero Variants

**Current State**: Single hero section with video/image support (index.astro lines 85-142)

**Problem**:
- Always shows media first (visual hero)
- No text-only option for discreet brands
- No adaptation for video vs. image content
- Fixed overlay gradient

**Proposed Variants**:

1. **`media-first`** (current default)
   - Large media (image or video)
   - Overlay with title/subtitle
   - Actions below

2. **`text-only`**
   - No media
   - Large typography
   - Clean background (gradient or solid)
   - Prominent CTAs

3. **`video`** (video-optimized)
   - Autoplay video background
   - Muted by default
   - Play/pause controls
   - Fallback to poster image

4. **`discreet`**
   - Minimal design
   - Small tagline
   - Subtle CTA
   - Professional tone

**Selection Rules**:
```typescript
function selectHeroVariant(hero: Record<string, any>): VariantRule {
  const hasVideo = hero.video?.sources?.length > 0;
  const hasImage = hero.image?.src;
  const isDiscreet = hero.discreet === true;

  // Discreet override
  if (isDiscreet) {
    return { variant: 'discreet', reason: 'Discreet hero requested' };
  }

  // Video variant
  if (hasVideo) {
    return { variant: 'video', reason: 'Video background available' };
  }

  // Text-only if no media
  if (!hasImage && !hasVideo) {
    return { variant: 'text-only', reason: 'No hero media available' };
  }

  // Default: media-first
  return { variant: 'media-first', reason: 'Standard hero with media' };
}
```

**Implementation**:
1. Create `src/lib/autofit/hero.ts` - Hero-specific normalization and rules
2. Create variant components:
   - `src/components/Hero/HeroMediaFirst.astro` (rename existing Hero.astro)
   - `src/components/Hero/HeroTextOnly.astro`
   - `src/components/Hero/HeroVideo.astro`
   - `src/components/Hero/HeroDiscreet.astro`
3. Update `index.astro` to use hero autofit pipeline
4. Add `hero.discreet` to home.schema.ts

---

### Priority 3: Features Responsive Variants

**Current State**: Static column counts (grid-2, grid-4) based on explicit config

**Problem**:
- No automatic responsive detection
- Mobile breakpoints not considered
- Item count doesn't auto-adjust columns
- No masonry/staggered layouts

**Proposed Enhancement**:
Instead of new variants, enhance existing Features2 component with **responsive column detection**:

```typescript
function computeResponsiveColumns(itemsCount: number, explicitColumns?: number): {
  sm: number;  // mobile
  md: number;  // tablet
  lg: number;  // desktop
} {
  // Explicit override
  if (explicitColumns) {
    return {
      sm: Math.min(explicitColumns, 1),
      md: Math.min(explicitColumns, 2),
      lg: explicitColumns,
    };
  }

  // Auto-detect based on item count
  if (itemsCount <= 2) {
    return { sm: 1, md: 2, lg: 2 };
  } else if (itemsCount <= 4) {
    return { sm: 1, md: 2, lg: 2 };
  } else if (itemsCount <= 6) {
    return { sm: 1, md: 2, lg: 3 };
  } else {
    return { sm: 1, md: 2, lg: 4 };
  }
}
```

**Implementation**:
1. Add `computeResponsiveColumns()` to normalize.ts
2. Update Features2 transformer to pass responsive columns
3. Update Features2.astro to use responsive grid classes
4. No new variants needed (enhancement to existing component)

---

## B) Registry Typing

**Current State**: Generic `Record<string, unknown>` for transformed props

**Problem**:
- No type safety for widget props
- Transformer functions can return incorrect props
- Runtime errors if props mismatch
- No IDE autocomplete for widget props

**Proposed Solution**: Typed transformers per section

### Step 1: Define Widget Prop Types

Create `src/lib/autofit/widget-props.ts`:

```typescript
// Content widget props (seller, investor, about)
export interface ContentProps {
  id?: string;
  tagline?: string;
  title?: string;
  subtitle?: string;
  items?: Array<{
    title?: string;
    description?: string;
    icon?: string;
    callToAction?: { text: string; href: string };
  }>;
  image?: {
    src: string;
    alt: string;
    width?: number;
    height?: number;
  };
  isReversed?: boolean;
}

// Stats widget props
export interface StatsProps {
  id?: string;
  stats: Array<{
    title?: string;
    amount?: string;
    icon?: string;
  }>;
}

// Features2 widget props (regions, services)
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
    callToAction?: { text: string; href: string };
  }>;
}

// CallToAction widget props
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

// Contact widget props
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
```

### Step 2: Update WidgetMapping Type

```typescript
export interface WidgetMapping<TProps = Record<string, unknown>> {
  component: ComponentPath;
  propsTransform?: (section: NormalizedSection) => TProps;
  requiresSlots?: string[];
}

export type VariantRegistry<TProps = Record<string, unknown>> = {
  [variant in VariantKey]?: WidgetMapping<TProps>;
};

export type SectionRegistry = {
  seller: VariantRegistry<ContentProps>;
  investor: VariantRegistry<ContentProps>;
  stats: VariantRegistry<StatsProps>;
  regions: VariantRegistry<Features2Props>;
  services: VariantRegistry<Features2Props>;
  about: VariantRegistry<ContentProps>;
  cta: VariantRegistry<CallToActionProps>;
  contact: VariantRegistry<ContactProps>;
};
```

### Step 3: Update Transformer Functions

```typescript
// Content transformer (for seller, investor, about)
function createContentTransform(defaultIsReversed: boolean): (section: NormalizedSection) => ContentProps {
  return (section: NormalizedSection): ContentProps => ({
    id: section.data.id as string | undefined,
    tagline: section.data.tagline as string | undefined,
    title: section.data.title as string | undefined,
    subtitle: section.data.subtitle as string | undefined,
    items: section.data.items as ContentProps['items'],
    image: section.data.image as ContentProps['image'],
    isReversed: (section.data.isReversed as boolean | undefined) ?? defaultIsReversed,
  });
}

// Stats transformer
const statsTransform = (section: NormalizedSection): StatsProps => ({
  id: section.data.id as string | undefined,
  stats: (section.data.items ?? section.data.stats ?? []) as StatsProps['stats'],
});

// Features transformer (for regions, services)
function createFeaturesTransform(defaultColumns: number): (section: NormalizedSection) => Features2Props {
  return (section: NormalizedSection): Features2Props => ({
    id: section.data.id as string | undefined,
    tagline: section.data.tagline as string | undefined,
    title: section.data.title as string | undefined,
    subtitle: section.data.subtitle as string | undefined,
    columns: typeof defaultColumns === 'number' ? defaultColumns : (section.data.columns as number | undefined ?? 3),
    items: section.data.items as Features2Props['items'],
  });
}

// CTA transformer
const ctaTransform = (section: NormalizedSection): CallToActionProps => ({
  id: section.data.id as string | undefined,
  title: section.data.title as string | undefined,
  subtitle: section.data.subtitle as string | undefined,
  tagline: section.data.tagline as string | undefined,
  actions: (section.data.actions ?? []) as CallToActionProps['actions'],
});

// Contact transformer
const contactTransform = (section: NormalizedSection): ContactProps => ({
  id: section.data.id as string | undefined,
  tagline: section.data.tagline as string | undefined,
  title: section.data.title as string | undefined,
  subtitle: section.data.subtitle as string | undefined,
  inputs: (section.data.inputs ?? []) as ContactProps['inputs'],
  textarea: section.data.textarea as ContactProps['textarea'],
  button: section.data.button as string | undefined,
});
```

### Benefits:
- ✅ **Type safety**: TypeScript catches prop mismatches at compile time
- ✅ **IDE autocomplete**: Better developer experience
- ✅ **Self-documenting**: Prop interfaces serve as documentation
- ✅ **Refactoring safety**: Renaming props caught by TypeScript
- ✅ **No runtime cost**: Types erased during compilation

---

## C) Critical Footgun Check: getImage() Usage

### Issue
Astro's `getImage()` is **server-only** and fails if called in client-side contexts:
- Client-side JavaScript
- View transitions
- Hydrated components

### Current Status: ✅ SAFE

**Verification**:
1. ✅ No `getImage()` calls in autofit layer (normalize, rules, registry)
2. ✅ SectionRenderer.astro uses inline `<img>` tags (server-rendered)
3. ✅ No dynamic image processing in client components
4. ✅ All images use imported objects or direct URLs

**Code Check**:
```bash
# Search for getImage() usage
grep -r "getImage" src/lib/autofit/
# Result: No matches ✅

grep -r "getImage" src/components/SectionRenderer.astro
# Result: No matches ✅
```

**Current Image Handling** (SectionRenderer.astro lines 81-88):
```typescript
const buildImageHtml = (image?: any | null, className = '...') => {
  if (!image || typeof image !== 'object') return null;
  const src = image.src;  // ✅ Direct .src property access (safe)
  if (!src || typeof src !== 'string') return null;
  const alt = typeof image.alt === 'string' ? image.alt : '';
  const width = typeof image.width === 'number' ? image.width : 1200;
  const height = typeof image.height === 'number' ? image.height : 800;
  return `<img src="${src}" alt="${alt}" width="${width}" height="${height}" loading="lazy" class="${className}" />`;
};
```

**This is safe because**:
- Uses `.src` property of imported image objects (resolved at build time)
- Returns HTML string (server-side rendering)
- No `getImage()` transformation needed

### Future Guard

If image processing is needed in future, add build-time check:

```typescript
// src/lib/autofit/images.ts (future utility)
import { getImage } from 'astro:assets';

export async function processImage(image: ImageMetadata) {
  // ✅ SAFE: Only called during SSG build
  if (import.meta.env.SSR) {
    return await getImage({ src: image, format: 'webp' });
  }

  // ❌ NEVER REACHED: Client builds don't execute this
  throw new Error('[Autofit] processImage() called in client context');
}
```

---

## Implementation Plan

### Phase 3A: Highlights Variants (Week 1)
1. **Day 1-2**: Highlights autofit module
   - Create `src/lib/autofit/highlights.ts`
   - Define HighlightsMeta interface
   - Implement `normalizeHighlights()`
   - Implement `selectHighlightsVariant()`

2. **Day 3-4**: Variant components
   - Create HighlightsFew.astro
   - Create HighlightsMany.astro
   - Create HighlightsDiscreet.astro
   - Create HighlightsNoImage.astro

3. **Day 5**: Integration
   - Update home.schema.ts (add highlights.discreet)
   - Refactor index.astro to use highlights pipeline
   - Test with all 11 brands

### Phase 3B: Hero Variants (Week 2)
1. **Day 1-2**: Hero autofit module
   - Create `src/lib/autofit/hero.ts`
   - Define HeroMeta interface
   - Implement `normalizeHero()`
   - Implement `selectHeroVariant()`

2. **Day 3-4**: Variant components
   - Rename Hero.astro → HeroMediaFirst.astro
   - Create HeroTextOnly.astro
   - Create HeroVideo.astro
   - Create HeroDiscreet.astro

3. **Day 5**: Integration
   - Update home.schema.ts (add hero.discreet)
   - Refactor index.astro to use hero pipeline
   - Test with all 11 brands

### Phase 3C: Registry Typing (Week 3)
1. **Day 1**: Define prop types
   - Create `src/lib/autofit/widget-props.ts`
   - Define all widget prop interfaces

2. **Day 2-3**: Update registry
   - Update WidgetMapping type with generics
   - Update SectionRegistry type
   - Update transformer function signatures

3. **Day 4-5**: Testing and refinement
   - Fix TypeScript errors
   - Verify all 11 brands build
   - Update documentation

### Phase 3D: Features Enhancement (Week 4)
1. **Day 1-2**: Responsive column logic
   - Add `computeResponsiveColumns()` to normalize.ts
   - Update Features2 transformer

2. **Day 3-4**: Component updates
   - Update Features2.astro with responsive grid classes
   - Test on mobile/tablet/desktop

3. **Day 5**: Documentation and testing
   - Update docs/sections-variants.md
   - Test all 11 brands
   - Visual regression testing

---

## Success Criteria

Phase 3 complete when:

### Functionality
- ✅ Highlights section adapts to listing count (few/many/discreet/no-image)
- ✅ Hero section adapts to media type (media-first/text-only/video/discreet)
- ✅ Features use responsive columns automatically
- ✅ All transformers are type-safe

### Quality
- ✅ All 11 brands validate without errors
- ✅ Build succeeds in <6 seconds
- ✅ Zero TypeScript errors
- ✅ No visual regressions

### Documentation
- ✅ Updated docs/sections-variants.md with new variants
- ✅ Added docs/highlights-variants.md guide
- ✅ Added docs/hero-variants.md guide
- ✅ Updated docs/registry-typing.md

### Testing
- ✅ Manual test: Create test brand with each variant
- ✅ Regression test: Existing brands unchanged
- ✅ Debug mode: Variant audit shows new selections

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Highlights refactoring breaks existing layout | Keep current code as 'default' variant, only add new variants |
| Hero variants too complex | Start with media-first/text-only only, defer video/discreet |
| Registry typing causes TypeScript errors | Use gradual typing (add `as` casts initially, refine later) |
| Features responsive breaks on mobile | Test on real devices, add media query debugging |
| Performance regression | Monitor build times, keep under 6 seconds |
| Schema changes break validation | All new fields optional, backward compatible |

---

## Out of Scope (Future)

- Custom section types defined in brand configs
- Visual variant editor UI
- A/B testing integration
- Dynamic variant switching (client-side)
- Variant preview mode
- Internationalization variants
- Print-specific variants

---

## Notes

- **Backward compatibility**: All new variants are additions, not replacements
- **Performance**: No runtime overhead, all variant selection at build time
- **Type safety**: Gradual adoption, no breaking changes
- **Testing**: Extensive validation with all 11 existing brands
- **Documentation**: User-facing guides for each new variant family

---

## Approval Required

Before starting Phase 3 implementation, confirm:

1. ☐ Highlights variants scope approved (few/many/discreet/no-image)
2. ☐ Hero variants scope approved (media-first/text-only/video/discreet)
3. ☐ Registry typing approach approved (generic types + prop interfaces)
4. ☐ Features responsive enhancement approved (auto-columns)
5. ☐ Timeline acceptable (4 weeks)
6. ☐ Risk mitigation strategy approved

**Next Step**: User approval + select highest priority subset if timeline needs adjustment.
