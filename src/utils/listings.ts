import type { Angebot } from '~/data/angebote';

export type ListingCategory =
  | 'wald'
  | 'acker'
  | 'gruenland'
  | 'hofstelle'
  | 'jagd'
  | 'teich_fischerei'
  | 'sonderkulturen'
  | 'naturschutz_ausgleich'
  | 'gemischt';

export type ListingPriceKind = 'sale' | 'lease' | 'request';

export interface Listing {
  id: string;
  slug: string;
  title: string;
  status: string;
  bundesland: string;
  region?: string;
  category: ListingCategory;
  typeLabel: string;
  areaHa: number;
  areaAckerHa?: number;
  areaWaldHa?: number;
  areaGruenHa?: number;
  image?: string;
  imageAlt?: string;
  priceText?: string;
  priceValue?: number | null;
  priceKind?: ListingPriceKind;
  ackerzahl?: number;
  gruenlandzahl?: number;
  emz?: number;
  wasserhaushalt?: string;
  baumarten?: string;
  vorratM3Ha?: number;
  alter?: string;
  gebaeude?: string;
  betriebTyp?: string;
  jagdRahmen?: string;
  jagdpachtBis?: string;
  wasserflaecheHa?: number;
  wasserrecht?: string;
  kultur?: string;
  bewaesserung?: string;
  naturschutzStatus?: string;
  schutzFlags?: string[];
  mixLabel?: string;
}

export interface ListingCardProps {
  listing: Listing;
  variant?: 'highlight' | 'data';
  secondaryCtaHref?: string;
  secondaryCtaLabel?: string;
  showSecondaryCta?: boolean;
}

const CATEGORY_LABELS: Record<ListingCategory, string> = {
  wald: 'Wald',
  acker: 'Acker',
  gruenland: 'Grünland',
  hofstelle: 'Hofstelle',
  jagd: 'Jagd',
  teich_fischerei: 'Teich/Fischerei',
  sonderkulturen: 'Sonderkulturen',
  naturschutz_ausgleich: 'Naturschutz/Ausgleich',
  gemischt: 'Gemischt',
};

const STATUS_TONES: Record<string, 'neutral' | 'success' | 'warning' | 'muted'> = {
  Neu: 'success',
  Reserviert: 'warning',
  Verfügbar: 'success',
  Verkauft: 'muted',
};

export const formatAreaHa = (area: number): string => {
  return `${area.toLocaleString('de-DE', { minimumFractionDigits: 1, maximumFractionDigits: 1 })} ha`;
};

export const formatEUR = (value: number): string => {
  return value.toLocaleString('de-DE', { maximumFractionDigits: 0 });
};

export const parseEuroValue = (text?: string): number | null => {
  if (!text) return null;
  const match = text.match(/(\d{1,3}(?:[.\s]\d{3})+|\d+)(?:,(\d+))?/);
  if (!match) return null;
  const whole = match[1].replace(/[.\s]/g, '');
  const decimal = match[2] ? `.${match[2]}` : '';
  const value = Number(`${whole}${decimal}`);
  return Number.isFinite(value) ? value : null;
};

export const formatPrice = (listing: Listing): { label: string; value: string; kind: ListingPriceKind } => {
  const kind = listing.priceKind ?? 'sale';
  const value = listing.priceValue;
  if (kind === 'lease') {
    if (value) {
      return { label: 'Pacht', value: `${formatEUR(value)} €/Jahr`, kind: 'lease' };
    }
    return { label: 'Pacht', value: 'auf Anfrage', kind: 'request' };
  }
  if (kind === 'request' || !value) {
    return { label: 'Kaufpreis', value: 'auf Anfrage', kind: 'request' };
  }
  return { label: 'Kaufpreis', value: `${formatEUR(value)} €`, kind: 'sale' };
};

export const computeEuroPerHa = (listing: Listing): string | null => {
  if (!listing.priceValue || !listing.areaHa) return null;
  const value = listing.priceValue / listing.areaHa;
  if (!Number.isFinite(value)) return null;
  return `≈ ${formatEUR(Math.round(value))} €/ha`;
};

export const getCategoryChip = (listing: Listing): { label: string; key: string } => {
  return { label: CATEGORY_LABELS[listing.category] ?? listing.category, key: listing.category };
};

export const getStatusBadge = (listing: Listing): { label: string; tone: 'neutral' | 'success' | 'warning' | 'muted' } => {
  return { label: listing.status, tone: STATUS_TONES[listing.status] ?? 'neutral' };
};

export const getCoreChipsByCategory = (listing: Listing): Array<{ label: string; value: string }> => {
  const chips: Array<{ label: string; value: string }> = [];
  switch (listing.category) {
    case 'wald': {
      const baumarten = listing.baumarten || 'Mischwald';
      chips.push({ label: 'Baumarten', value: baumarten });
      if (listing.vorratM3Ha) {
        chips.push({ label: 'Vorrat', value: `${listing.vorratM3Ha} m³/ha` });
      } else if (listing.alter) {
        chips.push({ label: 'Alter', value: listing.alter });
      }
      break;
    }
    case 'acker': {
      if (listing.ackerzahl) {
        chips.push({ label: 'Ackerzahl', value: String(listing.ackerzahl) });
      }
      if (listing.emz) {
        chips.push({ label: 'EMZ', value: String(listing.emz) });
      }
      break;
    }
    case 'gruenland': {
      if (listing.gruenlandzahl) {
        chips.push({ label: 'Grünlandzahl', value: String(listing.gruenlandzahl) });
      }
      if (listing.wasserhaushalt) {
        chips.push({ label: 'Wasserhaushalt', value: listing.wasserhaushalt });
      }
      break;
    }
    case 'hofstelle': {
      if (listing.gebaeude) {
        chips.push({ label: 'Gebäude', value: listing.gebaeude });
      }
      if (listing.betriebTyp) {
        chips.push({ label: 'Betriebstyp', value: listing.betriebTyp });
      }
      break;
    }
    case 'jagd': {
      if (listing.jagdRahmen) {
        chips.push({ label: 'Jagd', value: listing.jagdRahmen });
      }
      if (listing.jagdpachtBis) {
        chips.push({ label: 'Jagdpacht', value: `bis ${listing.jagdpachtBis}` });
      }
      break;
    }
    case 'teich_fischerei': {
      if (listing.wasserflaecheHa) {
        chips.push({ label: 'Wasserfläche', value: formatAreaHa(listing.wasserflaecheHa) });
      }
      if (listing.wasserrecht) {
        chips.push({ label: 'Wasserrecht', value: listing.wasserrecht });
      }
      break;
    }
    case 'sonderkulturen': {
      if (listing.kultur) {
        chips.push({ label: 'Kultur', value: listing.kultur });
      }
      if (listing.bewaesserung) {
        chips.push({ label: 'Bewässerung', value: listing.bewaesserung });
      }
      break;
    }
    case 'naturschutz_ausgleich': {
      if (listing.naturschutzStatus) {
        chips.push({ label: 'Status', value: listing.naturschutzStatus });
      }
      if (listing.schutzFlags && listing.schutzFlags.length > 0) {
        chips.push({ label: 'Schutz', value: listing.schutzFlags[0] });
      }
      break;
    }
    case 'gemischt': {
      if (listing.mixLabel) {
        chips.push({ label: 'Mix', value: listing.mixLabel });
      }
      if (listing.ackerzahl) {
        chips.push({ label: 'Ackerzahl', value: String(listing.ackerzahl) });
      } else if (listing.baumarten) {
        chips.push({ label: 'Baumarten', value: listing.baumarten });
      }
      break;
    }
    default:
      break;
  }
  return chips.slice(0, 2);
};

const CATEGORY_MAP: Record<Angebot['typ'], ListingCategory> = {
  'Wald / Forstfläche': 'wald',
  Ackerland: 'acker',
  'Grünland / Weide': 'gruenland',
  'Landwirtschaftlicher Betrieb / Hofstelle': 'hofstelle',
  'Jagd / Eigenjagd / Jagdgenossenschaft': 'jagd',
  'Teich / Fischerei / Gewässerflächen': 'teich_fischerei',
  Sonderkulturen: 'sonderkulturen',
  'Naturschutz-/Öko-/Ausgleichs-/Stilllegungsflächen': 'naturschutz_ausgleich',
  'Gemischtobjekte (Wald + Acker + Gebäude)': 'gemischt',
};

const extractBaumarten = (text: string): string | undefined => {
  if (text.includes('misch')) return 'Mischwald';
  if (text.includes('kiefer') || text.includes('fichte') || text.includes('nadel')) return 'Nadel';
  if (text.includes('laub') || text.includes('buche') || text.includes('eiche')) return 'Laub';
  return undefined;
};

const extractJagdRahmen = (text: string): string | undefined => {
  if (text.includes('eigenjagd')) return 'Eigenjagd';
  if (text.includes('jagdgenossenschaft')) return 'Genossenschaft';
  return undefined;
};

const extractKultur = (text: string): string | undefined => {
  if (text.includes('wein')) return 'Wein';
  if (text.includes('hopfen')) return 'Hopfen';
  if (text.includes('baumschule')) return 'Baumschule';
  if (text.includes('energieholz')) return 'Energieholz';
  if (text.includes('obst') || text.includes('heidelbeere')) return 'Obst';
  return undefined;
};

const extractSchutzFlags = (text: string): string[] => {
  const flags: string[] = [];
  if (text.includes('natura')) flags.push('Natura 2000');
  if (text.includes('wasserschutz')) flags.push('Wasserschutzgebiet');
  if (text.includes('naturschutz') || text.includes('nsg') || text.includes('lsg')) flags.push('NSG/LSG');
  return flags;
};

const buildMixLabel = (angebot: Angebot): string | undefined => {
  const parts: string[] = [];
  if (angebot.flaecheWaldHa) parts.push(`${formatAreaHa(angebot.flaecheWaldHa)} Wald`);
  if (angebot.flaecheAckerHa) parts.push(`${formatAreaHa(angebot.flaecheAckerHa)} Acker`);
  if (angebot.flaecheGruenHa) parts.push(`${formatAreaHa(angebot.flaecheGruenHa)} Grünland`);
  if (!parts.length) return undefined;
  return parts.join(' · ');
};

export const mapAngebotToListing = (angebot: Angebot, imageFallback?: string): Listing => {
  const text = `${angebot.beschreibungKurz} ${angebot.beschreibungLang}`.toLowerCase();
  const category = CATEGORY_MAP[angebot.typ] ?? 'acker';
  const priceValue = parseEuroValue(angebot.kaufpreisText);
  const isLease = angebot.kaufpreisText.toLowerCase().includes('pacht');
  const isRequest = angebot.kaufpreisText.toLowerCase().includes('anfrage');
  const priceKind: ListingPriceKind = isRequest ? 'request' : isLease ? 'lease' : 'sale';

  const listing: Listing = {
    id: angebot.id,
    slug: angebot.slug,
    title: angebot.beschreibungKurz,
    status: angebot.status,
    bundesland: angebot.bundesland,
    region: angebot.regionKurz,
    category,
    typeLabel: angebot.typ,
    areaHa: angebot.flaecheGesamtHa,
    areaAckerHa: angebot.flaecheAckerHa,
    areaGruenHa: angebot.flaecheGruenHa,
    areaWaldHa: angebot.flaecheWaldHa,
    image: angebot.image || imageFallback,
    imageAlt: angebot.beschreibungKurz,
    priceText: angebot.kaufpreisText,
    priceValue,
    priceKind,
    ackerzahl: angebot.bodenpunkteKern ?? undefined,
    gruenlandzahl: category === 'gruenland' ? angebot.bodenpunkteKern ?? undefined : undefined,
    baumarten: category === 'wald' || category === 'gemischt' ? extractBaumarten(text) : undefined,
    jagdRahmen: category === 'jagd' ? extractJagdRahmen(text) : undefined,
    jagdpachtBis: angebot.pachtBis,
    wasserflaecheHa: category === 'teich_fischerei' ? angebot.flaecheGesamtHa : undefined,
    wasserrecht: category === 'teich_fischerei' ? (text.includes('wasserrecht') ? 'vorhanden' : 'unklar') : undefined,
    kultur: category === 'sonderkulturen' ? extractKultur(text) : undefined,
    bewaesserung:
      category === 'sonderkulturen'
        ? text.includes('beregnung') || text.includes('bewässerung') || text.includes('tröpf') || text.includes('tröpf')
          ? 'ja'
          : 'unklar'
        : undefined,
    naturschutzStatus:
      category === 'naturschutz_ausgleich'
        ? text.includes('ausgleich') || text.includes('stilllegung')
          ? 'Ausgleich/Stilllegung'
          : 'Naturschutz'
        : undefined,
    schutzFlags: category === 'naturschutz_ausgleich' ? extractSchutzFlags(text) : undefined,
    mixLabel: category === 'gemischt' ? buildMixLabel(angebot) : undefined,
  };

  return listing;
};
