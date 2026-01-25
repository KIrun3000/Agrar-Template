export type Angebot = {
  id: string;
  status: 'Neu' | 'Reserviert' | 'Verkauft';
  bundesland: string;
  regionKurz?: string;
  typ:
    | 'Ackerland'
    | 'Wald'
    | 'Acker/Wald'
    | 'Grünland'
    | 'Mischfläche'
    | 'Betrieb'
    | 'Wasser/Teich'
    | 'Jagd'
    | 'Sonderkultur'
    | 'Naturschutz'
    | 'Sonstiges';
  flaecheGesamtHa: number;
  flaecheAckerHa?: number;
  flaecheGruenHa?: number;
  flaecheWaldHa?: number;
  bodenpunkteKern?: number;
  niederschlagMm?: number;
  pachtrenditeProzent?: number;
  pachtBis?: string;
  kaufpreis?: number | null;
  kaufpreisText: string;
  beschreibungKurz: string;
  beschreibungLang: string;
  slug: string;
  image?: string;
};

const IMAGE_ACKER = '/images/stock/acker.webp';
const IMAGE_WALD = '/images/stock/wald.webp';
const IMAGE_WIESE = '/images/stock/wiese.webp';

export const ANGEBOTE: Angebot[] = [
  {
    id: 'DE-1001',
    status: 'Neu',
    bundesland: 'Niedersachsen',
    regionKurz: 'Uelzen · Geestlage',
    typ: 'Ackerland',
    flaecheGesamtHa: 52.4,
    flaecheAckerHa: 52.4,
    bodenpunkteKern: 55,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '52,4 ha arrondiertes Ackerland mit 55 BP in der Uelzener Geest.',
    beschreibungLang:
      'Arrondierter Ackerblock auf lehmigen Sandböden mit ca. 55 Bodenpunkten, gute Zuwegung und Feldrandwege. Geeignet für Marktfruchtbetrieb, pachtfrei.',
    slug: 'de-1001-ackerland-uelzen',
    image: IMAGE_ACKER,
  },
  {
    id: 'DE-1002',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Spreewald',
    typ: 'Wald',
    flaecheGesamtHa: 38.6,
    flaecheWaldHa: 38.6,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '38,6 ha Kiefern-Mischwald im Spreewald, überwiegend 40-70 Jahre.',
    beschreibungLang:
      'Stabiler Mischbestand mit Kiefer und Laubholzanteil, ebene Erschließung, waldbauliche Optionen vorhanden. Jagdliche Mitnutzung möglich.',
    slug: 'de-1002-wald-spreewald',
    image: IMAGE_WALD,
  },
  {
    id: 'DE-1003',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Uckermark',
    typ: 'Acker/Wald',
    flaecheGesamtHa: 64.2,
    flaecheAckerHa: 48.0,
    flaecheWaldHa: 16.2,
    bodenpunkteKern: 52,
    kaufpreisText: 'Kaufpreis: 1.250.000 €',
    beschreibungKurz: '64,2 ha Kombination aus Acker (52 BP) und Wald in der Uckermark.',
    beschreibungLang:
      'Gut erreichbare Gemengelage mit 48 ha Acker und 16,2 ha Kiefernwald. Pachtfrei, leichte Bodenwelle, bereit für Eigenbewirtschaftung oder Verpachtung.',
    slug: 'de-1003-acker-wald-uckermark',
    image: IMAGE_WALD,
  },
  {
    id: 'DE-1004',
    status: 'Reserviert',
    bundesland: 'Bayern',
    regionKurz: 'Allgäu',
    typ: 'Grünland',
    flaecheGesamtHa: 32.8,
    flaecheGruenHa: 32.8,
    kaufpreisText: 'Kaufpreis: 890.000 €',
    beschreibungKurz: '32,8 ha Grünland im Allgäu, arrondiert, leichte Hanglage.',
    beschreibungLang:
      'Produktives Dauergrünland in leichter Südhanglage, gute Wasserführung, Erschließung über Wirtschaftsweg, sofort nutzbar.',
    slug: 'de-1004-gruenland-allgaeu',
    image: IMAGE_WIESE,
  },
  {
    id: 'DE-1005',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Oderbruch',
    typ: 'Mischfläche',
    flaecheGesamtHa: 58.9,
    flaecheAckerHa: 44.0,
    flaecheGruenHa: 8.4,
    flaecheWaldHa: 6.5,
    bodenpunkteKern: 48,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '58,9 ha Mischung aus Acker, Grünland und Wald im Oderbruch.',
    beschreibungLang:
      'Strukturierte Mischfläche mit Drainageanteilen, guter Erschließung und Ausgleichsstreifen. Ideal für Diversifizierung oder Jagdmitnutzung.',
    slug: 'de-1005-mischflaeche-oderbruch',
    image: IMAGE_WIESE,
  },
  {
    id: 'DE-1006',
    status: 'Neu',
    bundesland: 'Niedersachsen',
    regionKurz: 'Heidekreis',
    typ: 'Betrieb',
    flaecheGesamtHa: 96.0,
    flaecheAckerHa: 68.0,
    flaecheGruenHa: 18.0,
    flaecheWaldHa: 10.0,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '96 ha Hofstelle mit Acker-, Grünland- und Waldanteil, Heidekreis.',
    beschreibungLang:
      'Hofstelle mit Wohnhaus, Maschinenhalle und Getreidelager. Flächen arrondiert, teilbewässert, gute Anbindung an B3.',
    slug: 'de-1006-hofstelle-heidekreis',
    image: IMAGE_WIESE,
  },
  {
    id: 'DE-1007',
    status: 'Neu',
    bundesland: 'Mecklenburg-Vorpommern',
    regionKurz: 'Seenplatte',
    typ: 'Wasser/Teich',
    flaecheGesamtHa: 21.5,
    flaecheGruenHa: 4.0,
    flaecheWaldHa: 2.0,
    kaufpreisText: 'Kaufpreis: 420.000 €',
    beschreibungKurz: '21,5 ha Teich- und Wasserfläche mit Zulauf, inkl. Ufergrünland.',
    beschreibungLang:
      'Karpfen-/Mischteiche mit natürlichem Zulauf, Ufergrünland für Pflege- und Pachtoptionen. Wasserrechtliche Erlaubnis vorhanden (DEMO).',
    slug: 'de-1007-teichanlage-seenplatte',
    image: IMAGE_WIESE,
  },
  {
    id: 'DE-1008',
    status: 'Neu',
    bundesland: 'Rheinland-Pfalz',
    regionKurz: 'Pfalz',
    typ: 'Sonderkultur',
    flaecheGesamtHa: 18.2,
    flaecheAckerHa: 18.2,
    kaufpreisText: 'Kaufpreis: 980.000 €',
    beschreibungKurz: '18,2 ha Sonderkultur (Bio-Heidelbeere) mit Beregnung in der Pfalz.',
    beschreibungLang:
      'Junge Sonderkultur mit Frostschutz-Beregnung, Tröpfchenbewässerung und Windschutz. Zertifizierte Bio-Bewirtschaftung (DEMO).',
    slug: 'de-1008-sonderkultur-pfalz',
    image: IMAGE_WIESE,
  },
  {
    id: 'DE-1009',
    status: 'Reserviert',
    bundesland: 'Sachsen-Anhalt',
    regionKurz: 'Elbe-Elster',
    typ: 'Naturschutz',
    flaecheGesamtHa: 52.3,
    flaecheGruenHa: 52.3,
    kaufpreisText: 'Pacht: 3.200 €/Jahr',
    beschreibungKurz: '52,3 ha Ausgleichs- und Stilllegungsfläche in der Elbaue.',
    beschreibungLang:
      'Extensive Grünland-/Ausgleichsfläche in Auenlage, mit Pflegeauflagen und Natura-2000-Bezug. Ideal für Öko-Pool oder Vertragsnaturschutz.',
    slug: 'de-1009-naturschutz-elbe',
    image: IMAGE_WIESE,
  },
];
