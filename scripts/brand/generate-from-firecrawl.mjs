import { readFileSync, writeFileSync, mkdirSync, existsSync, readdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { getDefaultForbiddenSegments } from '../lib/config-utils.mjs';
import { parseMarkdownSections, extractFirstParagraph, cleanMarkdown, extractListItems } from '../lib/markdown-parser.mjs';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function parseArgs() {
  const args = process.argv.slice(2);
  let slug;
  let input;
  let outDir;
  let dryRun = false;

  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '--slug') {
      slug = args[i + 1];
      i += 1;
    } else if (arg === '--input') {
      input = args[i + 1];
      i += 1;
    } else if (arg === '--out') {
      outDir = args[i + 1];
      i += 1;
    } else if (arg === '--dry-run') {
      dryRun = true;
    }
  }

  return { slug, input, outDir, dryRun };
}

function ensureValidSlug(slug) {
  return slug && !slug.includes('..') && !slug.includes('/') && !path.isAbsolute(slug);
}

function usage() {
  console.error('Usage: node scripts/brand/generate-from-firecrawl.mjs --slug <slug> [--input raw/firecrawl/<slug>/crawl.json] [--out src/data/brands/<slug>/] [--dry-run]');
}

function readJsonSafe(filePath, fallback) {
  try {
    return JSON.parse(readFileSync(filePath, 'utf8'));
  } catch {
    return fallback;
  }
}

function ensureDir(dir) {
  mkdirSync(dir, { recursive: true });
}

function collectPages(data) {
  if (!data) return [];
  if (Array.isArray(data.pages)) return data.pages;
  if (Array.isArray(data.data)) return data.data;
  if (Array.isArray(data)) return data;
  return [];
}

function normalizeUrl(url) {
  if (!url) return null;
  try {
    const u = new URL(url);
    const normalizedPath = u.pathname.endsWith('/') && u.pathname !== '/' ? u.pathname.slice(0, -1) : u.pathname;
    return `${u.protocol}//${u.host}${normalizedPath || '/'}`;
  } catch {
    return String(url);
  }
}

function loadScrapePages(slug) {
  const scrapeDir = path.resolve('raw', 'firecrawl', slug, 'scrape');
  if (!existsSync(scrapeDir)) return [];

  return readdirSync(scrapeDir)
    .filter((file) => file.endsWith('.json'))
    .map((file) => readJsonSafe(path.join(scrapeDir, file), null))
    .filter(Boolean)
    .map((page) => {
      const url = page?.url || page?.metadata?.url || page?.metadata?.sourceURL;
      return { ...page, url };
    })
    .filter((page) => typeof page.url === 'string');
}

function mergeScrapeOverrides(basePages, scrapePages) {
  const byUrl = new Map();
  basePages.forEach((page, idx) => {
    const key = normalizeUrl(page.url);
    if (key) byUrl.set(key, { page, idx });
  });

  scrapePages.forEach((scrapePage) => {
    const key = normalizeUrl(scrapePage.url);
    if (!key) return;
    const hit = byUrl.get(key);
    const merged = {
      ...(hit?.page || {}),
      ...scrapePage,
      metadata: { ...(hit?.page?.metadata || {}), ...(scrapePage.metadata || {}) },
    };

    if (hit) {
      basePages[hit.idx] = merged;
    } else {
      basePages.push(merged);
    }
  });

  return basePages;
}

function normalizeForbidden(list) {
  return (list || getDefaultForbiddenSegments()).map((p) => String(p).toLowerCase());
}

function findListingViolations(crawlData, forbiddenSegments) {
  const pages = collectPages(crawlData);
  const reasons = [];
  const strongKeyword = /(objektnr|objekt-nr|energieausweis|expos[eé]|kaufpreis|kaltmiete|warmmiete|provision|wohnfl(ä|a)che|zimmer)/i;
  const contentKeyword = /(preis|miete|grundst(ü|u)ck|wohnfl(ä|a)che|m²|m2)/i;
  const pricePattern = /(€|eur)\s?\d[\d\.\s,]*/i;

  const urls = [];
  const walk = (node) => {
    if (!node || typeof node === 'string' || typeof node === 'number' || typeof node === 'boolean') return;
    if (Array.isArray(node)) {
      node.forEach(walk);
      return;
    }
    if (typeof node === 'object') {
      if (typeof node.url === 'string') urls.push(node.url);
      Object.values(node).forEach(walk);
    }
  };
  walk(crawlData);

  const urlViolations = urls.filter((u) => forbiddenSegments.some((seg) => String(u).toLowerCase().includes(seg)));
  urlViolations.forEach((url) => reasons.push({ url, reason: 'URL matched forbidden listing pattern' }));

  pages.forEach((page) => {
    const content = [page?.content, page?.markdown, page?.html, page?.text, page?.raw, page?.metadata?.description]
      .filter((v) => typeof v === 'string')
      .join('\n');
    const hitStrong = content && strongKeyword.test(content);
    const hitContent = content && contentKeyword.test(content) && pricePattern.test(content);
    if (hitStrong || hitContent) {
      reasons.push({
        url: page?.url ?? 'unknown',
        reason: hitStrong
          ? 'Content looked like a listing (listing field keyword)'
          : 'Content looked like a listing (price + listing keyword)',
      });
    }
  });

  return reasons;
}

function extractImageCandidates(pages) {
  const images = new Set();
  const regexMd = /!\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
  const regexImg = /<img[^>]*src=["']([^"'>\s]+)["'][^>]*>/gi;

  pages.forEach((page) => {
    const fromArrays = [page?.images, page?.metadata?.images]
      .flat()
      .filter(Boolean)
      .flat();
    fromArrays.forEach((src) => images.add(String(src)));

    const fromOg = page?.metadata?.ogImage?.url;
    if (fromOg) images.add(String(fromOg));

    const blobs = [page?.markdown, page?.content, page?.html, page?.text].filter((v) => typeof v === 'string');
    blobs.forEach((blob) => {
      let match;
      while ((match = regexMd.exec(blob))) {
        images.add(match[1]);
      }
      while ((match = regexImg.exec(blob))) {
        images.add(match[1]);
      }
    });
  });

  return Array.from(images);
}

function pickLogo(images) {
  if (!images.length) return { svg: null, png: null };
  const sorted = images.slice().sort((a, b) => a.length - b.length);
  const logoPrefer = sorted.filter((src) => src.toLowerCase().includes('logo'));
  const candidates = logoPrefer.length ? logoPrefer : sorted;

  const svg = candidates.find((src) => src.toLowerCase().endsWith('.svg')) ?? null;
  const png = candidates.find((src) => src.toLowerCase().match(/\.(png|webp)$/)) ?? null;
  return { svg, png };
}

function pickHomepage(pages) {
  if (!pages.length) return undefined;
  const scored = pages
    .map((page) => {
      const url = typeof page?.url === 'string' ? page.url : '';
      const score = url.split('/').filter(Boolean).length;
      return { page, score };
    })
    .sort((a, b) => a.score - b.score);
  return scored[0]?.page;
}

function toParagraphs(markdown = '') {
  return markdown
    .split(/\n{2,}/)
    .map((p) => p.replace(/[#>*_`]/g, '').trim())
    .filter(Boolean);
}

function extractHeadings(markdown = '') {
  const headings = [];
  const lines = markdown.split(/\n/);
  lines.forEach((line) => {
    const match = /^(#{1,6})\s*(.+)/.exec(line.trim());
    if (match) headings.push(match[2].trim());
  });
  return headings;
}

function extractContact(pages) {
  const emailRegex = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
  const phoneRegex = /(\+?\d[\d\s\/-]{6,})/;
  const addressHints = /(straße|str\.|platz|allee|weg|gasse|platz)/i;

  const contactPages = pages.filter((p) => (p?.url && /kontakt|contact|impressum|about/.test(String(p.url).toLowerCase())) || p?.metadata?.title);

  let email;
  let phone;
  let addressLine;

  for (const page of contactPages) {
    const text = [page?.markdown, page?.content, page?.html, page?.text, page?.raw].filter((v) => typeof v === 'string').join('\n');
    if (!email) {
      const match = emailRegex.exec(text);
      if (match) email = match[0];
    }
    if (!phone) {
      const match = phoneRegex.exec(text.replace(/[^+\d\s\/-]/g, ' '));
      if (match) phone = match[0].trim();
    }
    if (!addressLine) {
      const lines = text.split(/\n|<br\s*\/?\>/i).map((l) => l.trim());
      const hit = lines.find((l) => addressHints.test(l) && /\d/.test(l));
      if (hit) addressLine = hit;
    }
  }

  return { email, phone, addressLine };
}

function loadDefaultBrandHome() {
  const defaultBrand = readJsonSafe(path.resolve(__dirname, '../../src/data/brands/_default/brand.json'), {});
  const defaultHome = readJsonSafe(path.resolve(__dirname, '../../src/data/brands/_default/home.json'), {});
  return { defaultBrand, defaultHome };
}

function deepClone(obj) {
  return JSON.parse(JSON.stringify(obj));
}

function buildBrand(pages, defaultBrand, evidenceNotes) {
  const brand = deepClone(defaultBrand || {});
  const homepage = pickHomepage(pages) || {};

  const titleCandidate = homepage?.metadata?.title || homepage?.title;
  if (titleCandidate) brand.name = titleCandidate;

  // Extract tagline from meta description or first H1 subtitle
  const metaDesc = homepage?.metadata?.description;
  const markdown = [homepage?.markdown, homepage?.content, homepage?.text].find((v) => typeof v === 'string') || '';
  // Use H1 section body (not full markdown) to avoid heading text leaking into description
  const homeSections = parseMarkdownSections(markdown);
  const h1Body = homeSections.find((s) => s.level === 1)?.content || markdown;
  const firstParagraph = extractFirstParagraph(h1Body);

  if (metaDesc) {
    brand.tagline = metaDesc.length <= 160 ? metaDesc : metaDesc.substring(0, 157) + '…';
    evidenceNotes.push('Tagline extracted from meta description.');
  } else if (firstParagraph) {
    brand.tagline = firstParagraph.length <= 160 ? firstParagraph : firstParagraph.substring(0, 157) + '…';
    evidenceNotes.push('Tagline extracted from first paragraph (no meta description).');
  }

  // Extract description from homepage content (longer, up to 500 chars)
  if (firstParagraph) {
    brand.description = firstParagraph.length <= 500 ? firstParagraph : firstParagraph.substring(0, 497) + '…';
    evidenceNotes.push('Description extracted from homepage content.');
  }

  const images = extractImageCandidates(pages);
  const logo = pickLogo(images);
  brand.assets = brand.assets || {};
  brand.assets.logo = brand.assets.logo || { svg: null, png: null };
  if (logo.svg) brand.assets.logo.svg = logo.svg;
  if (logo.png) brand.assets.logo.png = logo.png;

  brand.colors = deepClone(defaultBrand?.colors ?? brand.colors ?? null);
  evidenceNotes.push('Colors copied from _default (no palette detected).');

  brand.typography = deepClone(defaultBrand?.typography ?? brand.typography ?? null);
  evidenceNotes.push('Typography copied from _default (no fonts detected).');

  brand.evidence = brand.evidence || {};
  if (evidenceNotes.length) {
    brand.evidence.firecrawl = evidenceNotes;
  }

  return brand;
}

function safeText(text) {
  if (!text) return undefined;
  const sanitized = text.replace(/\s+/g, ' ').trim();
  return sanitized || undefined;
}

// --- Section classification & content extraction ---

// Keywords mapped to section types for classification
const SECTION_KEYWORDS = {
  about: [/kompetent/i, /betreuung/i, /über uns/i, /unternehmen/i, /philosophi/i, /team/i, /erfahrun/i, /seit /i],
  seller: [/kaufen und verkaufen/i, /für verkäufer/i, /verkauf/i, /eigentümer/i, /vermittlung/i],
  investor: [/sale.and.lease/i, /investor/i, /anleger/i, /rendite/i, /liquidität/i],
  services: [/leistungen/i, /produktvielfalt/i, /pachten/i, /verpachten/i, /service/i],
  regions: [/region/i, /standort/i, /bundesland/i],
  stats: [/referenz/i, /erfolg/i, /bilanz/i, /track record/i],
  cta: [/kontakt/i, /anfrage/i, /sprechen wir/i, /interesse/i],
};

function classifySectionType(heading, content) {
  const text = (heading + ' ' + (content || '')).toLowerCase();
  for (const [type, patterns] of Object.entries(SECTION_KEYWORDS)) {
    if (patterns.some((re) => re.test(text))) {
      return type;
    }
  }
  return null; // unclassified
}

// Extract regions from listing URLs found in markdown
function extractRegionsFromPages(pages) {
  const regionMap = new Map();
  const urlPattern = /\(https?:\/\/[^)]+\)/g;
  const regionKeywords = {
    'Sachsen-Anhalt': [/s-a/i, /sachsen.anhalt/i],
    'Mecklenburg-Vorpommern': [/\bmv\b/i, /klein nemerow/i, /katerbow/i, /mecklenburg/i],
    'Niedersachsen': [/lindern.*oldb/i, /diepholz/i, /stavern/i, /bippen/i, /aschendorf/i, /twist/i, /sulingen/i, /vechta/i],
    'Emsland / Nordrhein-Westfalen': [/meppen/i, /lingen/i, /artland/i],
  };

  pages.forEach((page) => {
    const md = [page?.markdown, page?.content, page?.text].filter((v) => typeof v === 'string').join('\n');
    // Extract H3 headings that look like listings (contain "ha" and "verkaufen")
    const listingHeadings = md.match(/###\s+\[?([^\](\n]+)/g) || [];
    listingHeadings.forEach((h) => {
      const text = h.replace(/^###\s+\[?/, '');
      if (!/\d/.test(text) || !/verkaufen|pacht/i.test(text)) return;
      for (const [region, patterns] of Object.entries(regionKeywords)) {
        if (patterns.some((re) => re.test(text))) {
          if (!regionMap.has(region)) regionMap.set(region, []);
          regionMap.get(region).push(text.replace(/\]$/, '').trim());
        }
      }
    });
  });

  return Array.from(regionMap.entries()).map(([region, examples]) => ({
    title: region,
    description: `Überregionale Vermittlung in ${region} – z.B. ${examples[0]}`,
    icon: 'flat-color-icons:approval',
  }));
}

// Extract product types from the bullet list in "Produktvielfalt" section
function extractProductTypes(content) {
  const items = extractListItems(content);
  if (items.length > 0) return items;

  // Fallback: known Limbeck product categories if list extraction fails
  return [];
}

function buildHome(pages, defaultHome, slug) {
  const homepage = pickHomepage(pages) || {};
  const markdown = [homepage?.markdown, homepage?.content, homepage?.text].find((v) => typeof v === 'string') || '';
  const sections = parseMarkdownSections(markdown);

  const home = deepClone(defaultHome || {});

  // --- Metadata ---
  home.metadata = home.metadata || {};
  home.metadata.title = safeText(homepage?.metadata?.title || home.metadata.title);
  home.metadata.description = safeText(homepage?.metadata?.description || home.metadata.description);

  // --- Hero: from H1 + first paragraph ---
  const h1Section = sections.find((s) => s.level === 1);
  const heroTitle = h1Section ? cleanMarkdown(h1Section.heading) : home.hero?.title || `Makler ${slug}`;
  const heroSubtitle = h1Section ? extractFirstParagraph(h1Section.content) : '';

  home.hero = home.hero || {};
  home.hero.title = safeText(heroTitle);
  home.hero.subtitle = safeText(heroSubtitle || home.hero.subtitle || 'Spezialisierte Immobilien- und Agrarberatung.');

  // --- Highlights: extract from intro / brand promise ---
  const introText = h1Section ? cleanMarkdown(h1Section.content) : '';
  const introSentences = introText.split(/[.!]\s+/).filter((s) => s.trim().length > 20);
  home.highlights = {
    eyebrow: 'Unsere Stärken',
    title: 'Diskret. Partnerschaftlich. Erfolgsorientiert.',
    subtitle: introSentences.length > 1
      ? introSentences.slice(0, 2).join('. ').replace(/\s+/g, ' ').trim()
      : 'Jahrelange Erfahrung in der Vermittlung von Agrarimmobilien – vom Acker bis zum Betrieb.',
    source: 'custom',
    variant: 'discreet',
    items: [
      { title: 'Diskrete Vermarktung', description: 'Referenzen auf Anfrage. Keine öffentlichen Exposés.' },
      { title: 'Überregionale Expertise', description: 'Netzwerk in Nord- und Ostdeutschland.' },
      { title: 'Individuelle Beratung', description: 'Bewertung, Strategie und Transaktionsbegleitung.' },
    ],
  };

  // --- Classify H2 sections and build content ---
  // Locate H2 sections by heading pattern (heading-first avoids false positives in content)
  const h2Sections = sections.filter((s) => s.level === 2);
  const aboutSection = h2Sections.find((s) => /kompetent|betreuung|über uns/i.test(s.heading));
  const sellerSection = h2Sections.find((s) => /kaufen und verkaufen|für verkäufer/i.test(s.heading));
  const investorSection = h2Sections.find((s) => /sale.and.lease/i.test(s.heading));
  const pachtSection = h2Sections.find((s) => /pachten|verpachten/i.test(s.heading));
  const produktSection = h2Sections.find((s) => /produktvielfalt/i.test(s.heading));
  const referenzSection = h2Sections.find((s) => /referenz|erfolg/i.test(s.heading));
  const ctaSection = h2Sections.find((s) => /kontakt aufnehmen|interesse/i.test(s.heading));

  // --- About ---
  home.sections = home.sections || {};
  if (aboutSection) {
    const aboutText = cleanMarkdown(aboutSection.content);
    home.sections.about = {
      id: 'ueber-uns',
      tagline: 'Unternehmen',
      title: cleanMarkdown(aboutSection.heading),
      subtitle: extractFirstParagraph(aboutSection.content),
      items: [
        {
          title: 'Wertermittlung & Prozess',
          description: aboutText.length > 200
            ? aboutText.substring(0, 500)
            : aboutText,
        },
      ],
      image: {
        src: '/images/stock/stock_ueber-uns.webp',
        alt: 'Kompetente Betreuung',
        width: 2816,
        height: 1536,
      },
    };
  } else {
    home.sections.about = {
      id: 'ueber-uns',
      tagline: 'Unternehmen',
      title: 'Über uns',
      subtitle: 'Wir beraten Eigentümer, Investoren und Betriebe individuell und diskret.',
    };
  }

  // --- Seller ---
  if (sellerSection) {
    const sellerText = cleanMarkdown(sellerSection.content);
    home.sections.seller = {
      id: 'verkaeufer',
      tagline: 'Service',
      title: 'Für Verkäufer',
      subtitle: extractFirstParagraph(sellerSection.content),
      items: [
        {
          title: 'Unsere Leistungen',
          description: sellerText,
        },
      ],
      image: {
        src: '/images/stock/stock_fuer-verkaeufer.webp',
        alt: 'Kaufen und Verkaufen',
        width: 2649,
        height: 1535,
      },
    };
  } else {
    home.sections.seller = {
      id: 'verkaeufer',
      tagline: 'Service',
      title: 'Für Verkäufer',
      subtitle: 'Diskrete Vermittlung, Marktpreiseinschätzung und strukturierte Prozesse.',
    };
  }

  // --- Investor (Sale-and-Lease-Back) ---
  if (investorSection) {
    const investorText = cleanMarkdown(investorSection.content);
    home.sections.investor = {
      id: 'investoren',
      tagline: 'Investment',
      title: cleanMarkdown(investorSection.heading),
      subtitle: extractFirstParagraph(investorSection.content),
      items: [
        {
          title: 'Finanzielle Flexibilität',
          description: investorText,
        },
      ],
      image: {
        src: '/images/stock/stock_fuer-investoren.webp',
        alt: 'Sale-and-Lease-Back',
        width: 2645,
        height: 1534,
      },
      isReversed: true,
    };
  } else {
    home.sections.investor = {
      id: 'investoren',
      tagline: 'Investment',
      title: 'Für Investoren',
      subtitle: 'Kuratiertes Dealflow ohne öffentliche Exposés.',
    };
  }

  // --- Services: combine Pachten + Produktvielfalt ---
  const serviceItems = [];

  if (pachtSection) {
    serviceItems.push({
      title: 'Pachten & Verpachten',
      description: cleanMarkdown(pachtSection.content),
      icon: 'flat-color-icons:advertising',
      callToAction: { text: 'Kontakt aufnehmen', href: '/?utm_source=leistungen#kontakt' },
    });
  }

  if (produktSection) {
    const produktTypes = extractProductTypes(produktSection.content);
    if (produktTypes.length > 0) {
      // Convert bullet list to a single "Produktsortiment" item
      const typeNames = produktTypes.map((t) => t.title).join(', ');
      serviceItems.push({
        title: 'Produktsortiment',
        description: `Wir begleiten Transaktionen für: ${typeNames}`,
        icon: 'flat-color-icons:currency-exchange',
        callToAction: { text: 'Kontakt aufnehmen', href: '/?utm_source=leistungen#kontakt' },
      });
    }

    // Use the main body text of Produktvielfalt as a third service item
    const produktText = cleanMarkdown(produktSection.content);
    const sentences = produktText.split(/[.!]\s+/).filter((s) => s.trim().length > 30);
    if (sentences.length > 0) {
      serviceItems.push({
        title: 'Umfassender Service',
        description: sentences.slice(0, 2).join('. ').trim() + (sentences.length > 2 ? '.' : ''),
        icon: 'flat-color-icons:business-contact',
        callToAction: { text: 'Kontakt aufnehmen', href: '/?utm_source=leistungen#kontakt' },
      });
    }
  }

  // Fallback if no service content was extracted
  if (serviceItems.length === 0) {
    serviceItems.push(
      { title: 'Bewertung', description: 'Fundierte Wertermittlung auf Basis von Marktdaten und Standortanalyse.', icon: 'flat-color-icons:currency-exchange' },
      { title: 'Vermittlung', description: 'Diskrete Ansprache passender Käufer und Investoren.', icon: 'flat-color-icons:advertising' },
      { title: 'Begleitung', description: 'Koordination vom Mandat bis zum Notartermin.', icon: 'flat-color-icons:business-contact' },
    );
  }

  home.sections.services = {
    id: 'leistungen',
    tagline: 'Leistungen',
    title: 'Unsere Leistungen',
    subtitle: produktSection
      ? extractFirstParagraph(produktSection.content)
      : 'Wir begleiten Transaktionen diskret und strukturiert – von der ersten Bewertung bis zum erfolgreichen Abschluss.',
    columns: 3,
    items: serviceItems,
  };

  // --- Regions: extracted from listing URLs ---
  const regions = extractRegionsFromPages(pages);
  if (regions.length > 0) {
    home.sections.regions = {
      id: 'regionen',
      tagline: 'Regionen & Länder',
      title: 'Unsere Regionen',
      subtitle: 'Überregionale Vermittlung von Agrarimmobilien in Nord- und Ostdeutschland.',
      columns: 3,
      items: regions,
    };
  } else {
    home.sections.regions = {
      id: 'regionen',
      tagline: 'Regionen & Länder',
      title: 'Unsere Regionen',
      subtitle: 'Fokus auf die Kernregionen des Kunden.',
      items: [
        { title: 'Nord- und Ostdeutschland', description: 'Überregionale Vermittlung von Agrarflächen und Betrieben.', icon: 'flat-color-icons:approval' },
      ],
    };
  }

  // --- Stats: from Referenzen section ---
  if (referenzSection) {
    home.sections.stats = {
      id: 'trust',
      title: 'Unsere Bilanz',
      items: [
        { title: 'Erfolgreiche Vermittlungen', amount: '2024/25' },
        { title: 'Produkte', amount: '7+' },
        { title: 'Regionen', amount: regions.length > 0 ? String(regions.length) : '4' },
        { title: 'Antwortzeit', amount: '< 48h' },
      ],
    };
  } else {
    home.sections.stats = {
      id: 'trust',
      title: 'Unsere Bilanz',
      items: [
        { title: 'Produkte', amount: '7+' },
        { title: 'Regionen', amount: regions.length > 0 ? String(regions.length) : '4' },
        { title: 'Antwortzeit', amount: '< 48h' },
        { title: 'Erfahrung', amount: 'seit 2008' },
      ],
    };
  }

  // --- CTA ---
  const ctaTitle = ctaSection
    ? cleanMarkdown(ctaSection.heading)
    : 'Interesse? Lassen Sie uns sprechen.';
  home.sections.cta = {
    id: 'cta',
    title: ctaTitle,
    subtitle: 'Kontaktieren Sie uns für ein unverbindliches Erstgespräch oder fordern Sie weitere Informationen an.',
    actions: [
      { variant: 'primary', text: 'Kontakt aufnehmen', href: '/#kontakt' },
      { variant: 'secondary', text: 'Mehr erfahren', href: '/#ueber-uns' },
    ],
  };

  // --- Contact ---
  const contact = extractContact(pages);
  home.sections.contact = {
    id: 'kontakt',
    tagline: 'Kontakt aufnehmen',
    title: 'Kontakt aufnehmen',
    subtitle: 'Sie haben Fragen zu einem Objekt oder möchten eine Ersteinschätzung? Wir melden uns innerhalb von 48 Stunden.',
    inputs: [
      { label: 'Name', name: 'name', type: 'text' },
      { label: 'E-Mail', name: 'email', type: 'email' },
      { label: 'Telefon', name: 'phone', type: 'tel' },
    ],
    textarea: { label: 'Nachricht', name: 'message' },
    button: 'Anfrage senden',
    info: {
      label: 'Kontaktinfos',
      antwortzeit: '< 48h',
      email: contact.email || undefined,
      phone: contact.phone || undefined,
      addressLine: contact.addressLine || undefined,
    },
  };

  return home;
}

function writeViolations(violationsPath, reasons) {
  ensureDir(path.dirname(violationsPath));
  writeFileSync(violationsPath, JSON.stringify({ reasons }, null, 2));
  console.error(`Listing policy violated. Details: ${violationsPath}`);
}

function main() {
  const { slug, input, outDir, dryRun } = parseArgs();
  if (!ensureValidSlug(slug)) {
    usage();
    process.exit(1);
  }

  const inputPath = input ? path.resolve(input) : path.resolve('raw', 'firecrawl', slug, 'crawl.json');
  const outputDir = outDir ? path.resolve(outDir) : path.resolve('src', 'data', 'brands', slug);
  const violationsPath = path.resolve('raw', 'firecrawl', slug, 'violations.json');

  const configFile = path.resolve('config', 'firecrawl.makler.json');
  const configFallback = existsSync(configFile) ? readJsonSafe(configFile, {}) : {};
  const scrapePages = loadScrapePages(slug);

  let crawlData = null;
  if (existsSync(inputPath)) {
    crawlData = readJsonSafe(inputPath, null);
    if (!crawlData && scrapePages.length === 0) {
      console.error(`Could not parse crawl data from ${inputPath}`);
      process.exit(1);
    }
  }

  if (!crawlData && scrapePages.length === 0) {
    console.error(`No crawl.json or scrape fallback found for slug: ${slug}`);
    process.exit(1);
  }

  if (!crawlData) {
    crawlData = { data: scrapePages, config: { excludePaths: configFallback.excludePaths } };
  }

  const forbidden = normalizeForbidden(
    crawlData?.config?.excludePaths || configFallback.excludePaths || getDefaultForbiddenSegments(configFile)
  );
  let pages = collectPages(crawlData);

  if (scrapePages.length > 0) {
    pages = mergeScrapeOverrides(pages, scrapePages);
    crawlData.pages = pages;
  }

  const violations = findListingViolations(crawlData, forbidden);
  if (violations.length > 0) {
    writeViolations(violationsPath, violations);
    process.exit(2);
  }

  const { defaultBrand, defaultHome } = loadDefaultBrandHome();

  const evidence = [];
  const brand = buildBrand(pages, defaultBrand, evidence);
  const home = buildHome(pages, defaultHome, slug);

  if (dryRun) {
    console.log(JSON.stringify({ brand, home }, null, 2));
    return;
  }

  ensureDir(outputDir);
  writeFileSync(path.join(outputDir, 'brand.json'), JSON.stringify(brand, null, 2));
  writeFileSync(path.join(outputDir, 'home.json'), JSON.stringify(home, null, 2));
  console.log(`Generated brand + home at ${outputDir}`);
}

main();
