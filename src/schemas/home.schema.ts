import { z } from 'zod';

const actionSchema = z
  .object({
    text: z.string().optional(),
    label: z.string().optional(),
    href: z.string().optional(),
    variant: z.string().optional(),
    icon: z.string().optional(),
  })
  .passthrough();

const heroActionSchema = z
  .object({
    text: z.string().optional(),
    label: z.string().optional(),
    href: z.string().min(1, 'href ist erforderlich'),
    variant: z.enum(['primary', 'secondary', 'tertiary']),
    icon: z.string().optional(),
  })
  .passthrough();

const imageSchema = z
  .object({
    src: z.string(),
    alt: z.string().optional(),
    width: z.number().int().positive().optional(),
    height: z.number().int().positive().optional(),
  })
  .passthrough();

const heroVideoSchema = z
  .object({
    poster: z.string().optional(),
    sources: z
      .array(
        z
          .object({
            src: z.string(),
            type: z.string().optional(),
          })
          .passthrough()
      )
      .optional(),
  })
  .passthrough();

const heroSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    actions: z.array(heroActionSchema).optional(),
    video: heroVideoSchema.optional(),
    overlay: z
      .object({
        light: z.string().optional(),
        dark: z.string().optional(),
      })
      .optional(),
  })
  .passthrough();

const highlightsSchema = z
  .object({
    eyebrow: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    source: z.enum(['angebote', 'custom']).optional(),
    pageSize: z.number().int().positive().optional(),
    cta: z
      .object({
        label: z.string().optional(),
        href: z.string().optional(),
      })
      .optional(),
    items: z.array(z.record(z.unknown())).optional(),
    // Phase 3: Highlights variants
    variant: z.enum(['default', 'few', 'many', 'discreet', 'no-image']).optional(),
    discreet: z.boolean().optional(), // Enable discreet marketing mode
  })
  .passthrough();

const sectionSchema = z
  .object({
    id: z.string().optional(),
    title: z.string().optional(),
    subtitle: z.string().optional(),
    tagline: z.string().optional(),
    columns: z.number().int().positive().optional(),
    image: imageSchema.optional(),
    items: z.array(z.unknown()).optional(),
    actions: z.array(actionSchema).optional(),

    // Phase 2: Manual variant override (optional)
    variant: z.enum([
      'default',
      'hidden',
      'longform',
      'compact',
      'grid',
      'grid-2',
      'grid-4',
      'minimal'
    ]).optional(),

    // Phase 2: Discreet flag (optional)
    isDiscreet: z.boolean().optional(),
  })
  .passthrough();

const contactMapSchema = z
  .object({
    label: z.string().optional(),
    embedUrl: z.string().url(),
    referrerPolicy: z.string().optional(),
  })
  .passthrough();

const contactAgentSchema = z
  .object({
    name: z.string(),
    role: z.string().optional(),
    image: imageSchema.optional(),
  })
  .passthrough();

const contactInfoSchema = z
  .object({
    label: z.string().optional(),
    firma: z.string().optional(),
    ansprechpartner: z.string().optional(),
    antwortzeit: z.string().optional(),
    hinweis: z.string().optional(),
    email: z.string().email().optional(),
    phone: z.string().optional(),
    addressLine: z.string().optional(),
    agent: contactAgentSchema.optional(),
    map: contactMapSchema.optional(),
  })
  .passthrough();

const contactSchema = sectionSchema
  .extend({
    inputs: z
      .array(
        z
          .object({
            label: z.string(),
            name: z.string().regex(/^[a-zA-Z][a-zA-Z0-9_]*$/, 'name muss mit Buchstabe beginnen, nur A-Z,0-9,_'),
            type: z.enum(['text', 'email', 'tel', 'url', 'textarea', 'select']).optional(),
            options: z
              .array(
                z
                  .object({
                    label: z.string(),
                    value: z.string(),
                  })
                  .passthrough()
              )
              .optional(),
          })
          .passthrough()
          .superRefine((val, ctx) => {
            if (val.type === 'select' && (!val.options || val.options.length === 0)) {
              ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: 'select benötigt options[] mit {label,value}',
              });
            }
          })
      )
      .optional(),
    textarea: z.record(z.unknown()).optional(),
    button: z.union([z.string(), z.record(z.unknown())]).optional(),
    info: contactInfoSchema.optional(),
  })
  .passthrough();

export const homeSchema = z
  .object({
    metadata: z
      .object({
        title: z.string().optional(),
        description: z.string().optional(),
        ignoreTitleTemplate: z.boolean().optional(),
      })
      .passthrough()
      .optional(),
    hero: heroSchema.optional(),
    highlights: highlightsSchema.optional(),
    sectionsOrder: z.array(z.string()).optional().default([]),
    sections: z
      .object({
        seller: sectionSchema.optional(),
        investor: sectionSchema.optional(),
        stats: sectionSchema.optional(),
        regions: sectionSchema.optional(),
        services: sectionSchema.optional(),
        about: sectionSchema.optional(),
        cta: sectionSchema.optional(),
        contact: contactSchema.optional(),
      })
      .passthrough()
      .optional(),
  })
  .passthrough();

export type HomeConfig = z.infer<typeof homeSchema>;
