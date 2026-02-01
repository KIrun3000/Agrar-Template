# Section/Variant System Documentation

## Overview

The Section/Variant system (also known as the "Autofit Layer") is a flexible, extensible architecture for managing homepage sections in the Astro template. It provides:

- **Dynamic section ordering** via `sectionsOrder` field in `home.json`
- **Variant selection** based on content characteristics (text density, media presence, item count)
- **Backward compatibility** - existing brands continue working without changes
- **Type safety** - Full TypeScript support with Zod validation
- **Extensibility** - Easy to add new sections and variants

## Architecture

The system consists of 4 core modules in `src/lib/autofit/`:

### 1. normalize.ts - Data Stabilization

**Purpose**: Transforms raw section data into predictable structures with computed metadata.

**Key Functions**:
- `normalizeSection(key, rawData)` - Normalizes a single section
- `normalizeSections(sectionsData)` - Batch normalize all sections

**Output**: `NormalizedSection` with:
- `key` - Section identifier (e.g., "seller", "investor")
- `data` - Stabilized data with defensive defaults
- `meta` - Computed flags:
  - `itemsCount` - Number of items in array
  - `hasMedia` - Has image or video
  - `textDensity` - 'short' | 'normal' | 'long'
  - `missingRequired` - List of missing critical fields
  - `hasActions` - Has CTA buttons
  - `hasMap`, `hasAgent` - Contact-specific flags
  - `columns` - Grid column count

### 2. rules.ts - Variant Selection

**Purpose**: Determines which variant to use based on normalized data.

**Key Functions**:
- `selectVariant(section)` - Returns variant rule for a section
- `selectVariants(sections)` - Batch variant selection

**Variant Types**:
- `'default'` - Standard rendering (Phase 1: active)
- `'hidden'` - Skip rendering (Phase 1: active)
- `'longform'` - Extended text layout (Phase 1: scaffolded)
- `'compact'` - Minimal spacing (Phase 1: scaffolded)
- `'media-first'` - Image-emphasized (Phase 1: scaffolded)
- `'grid-2'`, `'grid-4'` - Grid overrides (Phase 1: scaffolded)

**Phase 1 Rules**:
- Hidden if missing required fields
- Hidden if stats has 0 items
- Hidden if section has no content (no title, media, or items)
- All other sections → 'default'

### 3. registry.ts - Component Mapping

**Purpose**: Maps section keys + variants to Astro widget components.

**Key Functions**:
- `getWidgetMapping(key, variant)` - Lookup component mapping
- `getWidgetProps(section, mapping)` - Transform props for widget

**Registry Structure**:
```typescript
{
  seller: {
    default: {
      component: '~/components/widgets/Content.astro',
      propsTransform: (section) => ({ ... })
    }
  },
  // ... other sections
}
```

**Current Mappings**:
- `seller`, `investor`, `about` → `Content.astro`
- `stats` → `Stats.astro`
- `regions`, `services` → `Features2.astro`
- `cta` → `CallToAction.astro`
- `contact` → `Contact.astro` (with info slot)

### 4. legacy.ts - Backward Compatibility

**Purpose**: Maintains current section order as default fallback.

**Key Constants**:
- `LEGACY_SECTIONS_ORDER` - Hardcoded order from old implementation
- `getEffectiveSectionsOrder(sectionsOrder?)` - Returns custom or legacy order
- `filterExistingSections(order, data)` - Filter to only existing sections

**Legacy Order**:
```javascript
['seller', 'investor', 'stats', 'regions', 'services', 'about', 'cta', 'contact']
```

## Using sectionsOrder

### Basic Usage

Add the `sectionsOrder` field to your `home.json`:

```json
{
  "metadata": { ... },
  "hero": { ... },
  "highlights": { ... },
  "sectionsOrder": ["stats", "about", "seller", "investor", "regions", "services", "cta", "contact"],
  "sections": {
    "seller": { ... },
    "investor": { ... },
    // ... other sections
  }
}
```

**Key Points**:
- Field is optional - brands without it use legacy order
- Only section keys in `sections` object are rendered
- Unknown keys are filtered out (no crash)
- Empty array `[]` falls back to legacy order

### Examples

**Reverse Order**:
```json
{
  "sectionsOrder": ["contact", "cta", "about", "services", "regions", "stats", "investor", "seller"]
}
```

**Minimal Homepage** (only essential sections):
```json
{
  "sectionsOrder": ["seller", "stats", "contact"]
}
```

**Stats First** (highlight trust metrics):
```json
{
  "sectionsOrder": ["stats", "seller", "investor", "regions", "services", "about", "cta", "contact"]
}
```

## Data Flow

```
home.json
    ↓
Load via getActiveBrand()
    ↓
Extract sectionsOrder & sections
    ↓
normalizeSections(sections) → Map<string, NormalizedSection>
    ↓
selectVariants(normalized) → Map<string, VariantRule>
    ↓
getEffectiveSectionsOrder(sectionsOrder) → string[]
    ↓
filterExistingSections(order, sections) → string[]
    ↓
Loop: renderOrder.map(key => <SectionRenderer>)
    ↓
SectionRenderer:
  - Lookup widget mapping
  - Transform props
  - Render widget component
```

## Adding New Sections (Future)

### Step 1: Update Schema

Add section to `src/schemas/home.schema.ts`:

```typescript
export const homeSchema = z.object({
  // ... existing fields
  sections: z.object({
    seller: sectionSchema.optional(),
    // ... existing sections
    testimonials: sectionSchema.optional(), // NEW
  })
});
```

### Step 2: Add to Legacy Order

Update `src/lib/autofit/legacy.ts`:

```typescript
export const LEGACY_SECTIONS_ORDER: string[] = [
  'seller',
  'investor',
  'stats',
  'testimonials', // NEW
  'regions',
  // ... rest
];
```

### Step 3: Add Registry Mapping

Update `src/lib/autofit/registry.ts`:

```typescript
export const SECTION_REGISTRY: SectionRegistry = {
  // ... existing sections
  testimonials: {
    default: {
      component: '~/components/widgets/Testimonials.astro',
      propsTransform: (section) => ({
        id: section.data.id,
        title: section.data.title,
        testimonials: section.data.items ?? [],
      }),
    },
  },
};
```

### Step 4: Add Static Import to SectionRenderer

Update `src/components/SectionRenderer.astro`:

```astro
---
// ... existing imports
import Testimonials from '~/components/widgets/Testimonials.astro';

const componentMap: Record<string, any> = {
  // ... existing mappings
  '~/components/widgets/Testimonials.astro': Testimonials,
};
---
```

### Step 5: Add to Brand Configs

Update `home.json` files with new section:

```json
{
  "sections": {
    "testimonials": {
      "id": "testimonials",
      "title": "What Our Clients Say",
      "items": [
        {
          "quote": "Excellent service...",
          "author": "John Doe",
          "role": "CEO, Company"
        }
      ]
    }
  }
}
```

## Adding New Variants (Future)

### Step 1: Add Variant to VariantKey Type

Update `src/lib/autofit/rules.ts`:

```typescript
export type VariantKey =
  | 'default'
  | 'hidden'
  | 'testimonial-carousel' // NEW
  // ... existing variants
```

### Step 2: Add Selection Rule

Update `selectVariant()` in `rules.ts`:

```typescript
switch (key) {
  case 'testimonials':
    if (meta.itemsCount > 5) {
      return { variant: 'testimonial-carousel', reason: 'Many testimonials' };
    }
    return { variant: 'default' };
  // ... other cases
}
```

### Step 3: Add Registry Mapping

Update `registry.ts`:

```typescript
testimonials: {
  default: {
    component: '~/components/widgets/Testimonials.astro',
    propsTransform: (section) => ({ ... }),
  },
  'testimonial-carousel': {
    component: '~/components/widgets/TestimonialsCarousel.astro',
    propsTransform: (section) => ({ ... }),
  },
},
```

### Step 4: Update SectionRenderer

Add new component import and mapping:

```astro
import TestimonialsCarousel from '~/components/widgets/TestimonialsCarousel.astro';

const componentMap = {
  // ... existing
  '~/components/widgets/TestimonialsCarousel.astro': TestimonialsCarousel,
};
```

## Debugging

### Enable Debug Mode

Set `debug={true}` in `index.astro`:

```astro
{renderOrder.map((sectionKey) => {
  // ... existing code
  return (
    <SectionRenderer
      section={section}
      variant={variantRule.variant}
      debug={true}  {/* ENABLE DEBUG */}
    />
  );
})}
```

### Debug Output

When enabled, shows for each section:
```
Section Debug: seller | Variant: default
Items: 3 | Media: Yes | Text: normal
```

If missing required fields:
```
Missing: title, inputs
```

### Common Issues

**Section not rendering:**
1. Check if section key in `sectionsOrder` matches key in `sections` object
2. Enable debug mode to see if variant is 'hidden'
3. Check `meta.missingRequired` for missing fields
4. Verify section data exists in `home.json`

**Wrong variant selected:**
1. Check `selectVariant()` logic in `rules.ts`
2. Inspect `meta` flags (itemsCount, hasMedia, textDensity)
3. Add console.log in `selectVariant()` to debug

**Type errors:**
1. Ensure prop transformer in registry matches widget props
2. Check Zod schema matches expected data structure
3. Run `npm run check:astro` for type errors

**Build errors:**
1. Check all widgets are imported in SectionRenderer
2. Verify component paths in registry match actual files
3. Run `npm run validate:brands` to check schema validation

## Testing

### Test Brands

Two test brands are included:

1. **`_test_legacy`** - No `sectionsOrder` field
   - Uses `LEGACY_SECTIONS_ORDER`
   - Should render identically to original implementation

2. **`_test_custom`** - Custom `sectionsOrder`
   - Order: `["stats", "about", "seller", "investor", "regions", "services", "cta", "contact"]`
   - Stats appears first (different from legacy)

### Running Tests

```bash
# Validate all brands
npm run validate:brands

# Type check
npm run check:astro

# Build
npm run build

# Dev server with test brand
echo "BRAND_SLUG=_test_custom" > .env
npm run dev

# Build specific brand
BRAND_SLUG=_test_legacy npm run build
```

### Expected Results

- ✅ All brands validate without errors
- ✅ Build succeeds for all brands
- ✅ Visual output identical for brands without `sectionsOrder`
- ✅ Custom order renders in specified sequence

## Best Practices

### 1. Keep sectionsOrder in Sync

If you add/remove sections in `sections` object, update `sectionsOrder`:

```json
{
  "sectionsOrder": ["seller", "stats", "contact"],
  "sections": {
    "seller": { ... },
    "stats": { ... },
    "contact": { ... }
    // investor, about removed - also remove from sectionsOrder
  }
}
```

### 2. Use Semantic Section Keys

Choose descriptive keys that reflect content:
- ✅ `"seller"`, `"investor"`, `"testimonials"`
- ❌ `"section1"`, `"block_a"`, `"temp"`

### 3. Provide Fallback Data

Always provide title/subtitle fallbacks in section data:

```json
{
  "seller": {
    "title": "For Sellers",  // Required
    "subtitle": "We help you sell",  // Recommended
    "items": []  // Can be empty, but should exist
  }
}
```

### 4. Test Before Deploying

```bash
# Always run these before commit/deploy
npm run validate:brands
npm run check:astro
npm run build
```

### 5. Document Custom Variants

If you add custom variants, document them here with:
- Variant name and purpose
- Selection criteria (what triggers this variant)
- Visual differences from default
- Example configuration

## Future Enhancements

### Variant Overrides

Allow explicit variant selection in `home.json`:

```json
{
  "sectionsOrder": ["seller", "about"],
  "variantOverrides": {
    "about": "longform"
  }
}
```

### Conditional Sections

Show/hide sections based on conditions:

```json
{
  "sections": {
    "stats": {
      "showIf": "items.length > 0"
    }
  }
}
```

### Custom Variants Per Brand

Allow brands to define their own variants:

```json
{
  "customVariants": {
    "seller": {
      "premium": {
        "component": "PremiumContent",
        "when": "brand.tier === 'premium'"
      }
    }
  }
}
```

## Support

For issues or questions:
- Check this documentation
- Review `/Users/lucaingenbleek/.claude/plans/noble-plotting-wand.md` for implementation details
- Enable debug mode in SectionRenderer
- Run validation commands

## Changelog

### Version 1.0.0 (Phase 1)
- Initial implementation of autofit layer
- Added `sectionsOrder` field to home schema
- Implemented normalize, rules, registry, legacy modules
- Created SectionRenderer component
- Refactored index.astro for dynamic rendering
- Added test brands (_test_legacy, _test_custom)
- **Active variants**: `default`, `hidden`
- **Scaffolded variants**: `longform`, `compact`, `media-first`, `grid-2`, `grid-4`

### Version 2.0.0 (Phase 2) - 2026-01-28
- **Variant Library Implemented**: Created 5 new variant components
  - `Content/ContentLongform.astro` - Extended text with generous spacing
  - `Content/ContentCompact.astro` - Tight spacing for minimal content
  - `Features2/Features2Compact.astro` - Minimal feature cards
  - `CallToAction/CallToActionMinimal.astro` - Simple CTA without card styling
  - `Contact/ContactMinimal.astro` - Form-only contact variant

- **Enhanced Normalization** (normalize.ts):
  - Added `ContentSignals` interface for structured content analysis
    - `hasH1`: Title presence detection
    - `hasBullets`: Bullet list detection (•, -, *)
    - `hasMultipleParagraphs`: Multi-paragraph detection
    - `paragraphCount`: Estimated paragraph count
  - Added `resolveImageWithFallback()` function with 3-level fallback chain
  - Enhanced `SectionMeta` with `contentSignals`, `resolvedImageSrc`

- **Real Autofit Rules** (rules.ts):
  - **Content sections** (seller, investor, about):
    - `longform` if long text + 3+ items OR structured content (paragraphs + bullets)
    - `compact` if short text + no media
  - **Stats section**:
    - `grid` if 4+ items (better layout for many stats)
  - **Features sections** (regions, services):
    - `grid-2` if 2 or 4 items, or explicit columns=2
    - `grid-4` if 8+ items, or explicit columns=4
    - `compact` if short text + ≤3 items
  - **CTA section**:
    - `minimal` if short text + ≤1 action
    - `hidden` if no actions + no title
  - **Contact section**:
    - `minimal` if no agent + no map

- **Manual Variant Overrides**:
  - Added optional `variant` field to section schema
  - Supports all variant types: default, hidden, longform, compact, grid, grid-2, grid-4, minimal
  - Added optional `isDiscreet` boolean field
  - Manual overrides take precedence over autofit logic

- **Debug Mode**:
  - Environment variable `DEBUG_AUTOFIT=true` enables debug output
  - Server-side console logging of variant selection with reasoning
  - Enhanced visual debug panel shows ContentSignals
  - Example output: `[Autofit] seller → longform | Items: 5, Media: Yes, Text: long`

- **Registry Updates**:
  - All sections now have variant mappings
  - Complete prop transformers for all variants
  - Maintains backward compatibility (default variant = existing widget)

- **Test Brand**:
  - Added `_test_variants` brand demonstrating manual overrides
  - Shows all variant types in action
  - Includes autofit logic demonstration

- **Validation Results**:
  - ✅ All 11 brands validate successfully
  - ✅ Build succeeds (5.60s)
  - ✅ Zero TypeScript errors in autofit code
  - ✅ 100% backward compatible

- **Active variants**: `default`, `hidden`, `longform`, `compact`, `grid`, `grid-2`, `grid-4`, `minimal`

## Phase 2 Usage Examples

### Manual Variant Override

Explicitly set a variant for a section in `home.json`:

```json
{
  "sections": {
    "seller": {
      "variant": "longform",
      "title": "For Sellers",
      "subtitle": "Long descriptive text...",
      "items": [...]
    }
  }
}
```

### Autofit Logic (No Override)

Let the system automatically select the variant:

```json
{
  "sections": {
    "seller": {
      "title": "For Sellers",
      "subtitle": "Very long text with multiple paragraphs...\n\n• Bullet point 1\n• Bullet point 2",
      "items": [{}, {}, {}, {}]
    }
  }
}
```

Result: Autofit detects long text + bullets + 4 items → selects `longform` variant

### Debug Mode

Enable debug output to see variant selection reasoning:

```bash
DEBUG_AUTOFIT=true npm run dev
```

Console output:
```
[Autofit] seller → longform (Extended content with many items)
  Items: 4, Media: Yes, Text: long
[Autofit] stats → grid (Better layout for 4+ stats)
  Items: 4, Media: No, Text: short
```

### Testing Variants

Build with the test brand:

```bash
BRAND_SLUG=_test_variants npm run dev
```

Visit `http://localhost:4321` to see all variants in action.
