export type Angebot = {
  id: string;
  status: 'Neu' | 'Reserviert' | 'Verkauft';
  bundesland: string;
  regionKurz?: string;
  typ: 'Ackerland' | 'Wald' | 'Acker/Wald' | 'Grünland' | 'Mischfläche' | 'Betrieb' | 'Sonstiges';
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
};

export const ANGEBOTE: Angebot[] = [
  {
    id: 'BB-3251',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Landkreis Schorfheide',
    typ: 'Mischfläche',
    flaecheGesamtHa: 24.3,
    flaecheAckerHa: 21.7,
    flaecheGruenHa: 0.5,
    flaecheWaldHa: 2.09,
    bodenpunkteKern: 40,
    niederschlagMm: 600,
    kaufpreis: null,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    pachtrenditeProzent: undefined,
    pachtBis: 'pachtfrei nach Ernte 2026',
    beschreibungKurz:
      'Arrondierter Grundbesitz mit Acker-, Grünland- und sonstigen Flächen im Landkreis Schorfheide, pachtfrei nach Ernte 2026.',
    beschreibungLang:
      'Ca. 24,3 ha arrondierter Grundbesitz im Landkreis Schorfheide, davon ca. 21,7 ha Ackerfläche, 0,5 ha Grünland und ca. 2,09 ha sonstige Flächen. Pachtfrei nach der Ernte 2026. In der Kernfläche ca. 40 Bodenpunkte, durchschnittlicher Jahresniederschlag ca. 600 mm.',
    slug: 'bb-3251-arrondierter-grundbesitz-schorfheide',
  },
  {
    id: 'BB-3250',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'südöstlich Berlin',
    typ: 'Wald',
    flaecheGesamtHa: 9.75,
    flaecheWaldHa: 9.75,
    kaufpreis: 85000,
    kaufpreisText: 'Kaufpreis: 85.000 €',
    niederschlagMm: 620,
    beschreibungKurz: 'Ca. 9,75 ha Waldfläche in einem Flurstück südöstlich von Berlin mit dominantem Kiefernbestand.',
    beschreibungLang:
      'Ca. 9,75 ha Wald in einem Flurstück südöstlich von Berlin. Holzbestand überwiegend Kiefern. Niederschlag ca. 620 mm pro Jahr. Weitere Details auf Anfrage.',
    slug: 'bb-3250-waldflaeche-suedoestlich-berlin',
  },
  {
    id: 'BB-3247',
    status: 'Reserviert',
    bundesland: 'Brandenburg',
    regionKurz: 'zwischen Brandenburg und Nauen',
    typ: 'Ackerland',
    flaecheGesamtHa: 5.92,
    flaecheAckerHa: 5.92,
    bodenpunkteKern: 40,
    niederschlagMm: 575,
    pachtrenditeProzent: 2.6,
    kaufpreis: 100000,
    kaufpreisText: 'Kaufpreis: 100.000 €',
    beschreibungKurz: '5,92 ha Ackerland in einem Flurstück zwischen Brandenburg und Nauen, mit ca. 40 Bodenpunkten.',
    beschreibungLang:
      '5,92 ha Ackerland in einem Flurstück zwischen Brandenburg und Nauen. In der Kernfläche ca. 40 Bodenpunkte, Niederschläge ca. 575 mm. Aktuell mit einer Pachtrendite von ca. 2,6 %. Weitere Details auf Anfrage.',
    slug: 'bb-3247-ackerland-brandenburg-nauen',
  },
  {
    id: 'MV-3152',
    status: 'Neu',
    bundesland: 'Mecklenburg-Vorpommern',
    regionKurz: 'südl. LK Vorpommern-Greifswald',
    typ: 'Ackerland',
    flaecheGesamtHa: 73,
    flaecheAckerHa: 73,
    bodenpunkteKern: 55,
    kaufpreis: null,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    pachtBis: 'verpachtet bis 2027',
    beschreibungKurz: '73 ha Ackerland in Vorpommern-Greifswald, ca. 45-65 BP, verpachtet bis 2027.',
    beschreibungLang:
      '73 ha zusammenhängende Ackerfläche im Süden des Landkreises Vorpommern-Greifswald. Kernbodenpunkte 45-65, gute Erreichbarkeit, Pachtvertrag bis 2027.',
    slug: 'mv-3152-73ha-ackerland-vorpommern',
  },
  {
    id: 'BB-3169',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Gutshof, Brandenburg',
    typ: 'Betrieb',
    flaecheGesamtHa: 156,
    flaecheAckerHa: 70,
    flaecheWaldHa: 50,
    flaecheGruenHa: 36,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '156 ha Gutshof mit Villa, Acker-/Waldflächen, Pferdehaltung und Jagdmöglichkeiten.',
    beschreibungLang:
      '156 ha Gutshof in Brandenburg mit historischer Villa, Acker- und Waldflächen sowie Möglichkeiten für Pferdehaltung und Jagd. Details und Unterlagen auf Anfrage.',
    slug: 'bb-3169-gutshof-brandenburg',
  },
  {
    id: 'RO-2100',
    status: 'Neu',
    bundesland: 'Rumänien',
    regionKurz: 'Schwarzerde-Standort',
    typ: 'Betrieb',
    flaecheGesamtHa: 2100,
    flaecheAckerHa: 2100,
    bodenpunkteKern: 90,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '2.100 ha Ackerbaubetrieb auf Schwarzerde, 80-100 BP, verpachtet.',
    beschreibungLang:
      'Großer Ackerbaubetrieb in Rumänien mit ca. 2.100 ha Schwarzerdeflächen, 80-100 Bodenpunkte. Aktuell verpachtet, moderne Bewirtschaftung, weitere Kennzahlen auf Anfrage.',
    slug: 'ro-ackerland',
  },
  {
    id: 'BB-3223',
    status: 'Neu',
    bundesland: 'Brandenburg',
    regionKurz: 'Brandenburg',
    typ: 'Acker/Wald',
    flaecheGesamtHa: 95,
    flaecheWaldHa: 78,
    flaecheAckerHa: 16,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '95 ha Waldfläche mit ca. 16 ha Acker, Kiefern 20-80 Jahre.',
    beschreibungLang:
      '95 ha Objekt in Brandenburg mit 78 ha Wald (überwiegend Kiefer, 20-80 Jahre) und 16 ha Ackerfläche. Ruhige Lage, jagdliche Nutzung möglich.',
    slug: 'bb-3223-wald-und-acker-brandenburg',
  },
  {
    id: 'ST-3254',
    status: 'Neu',
    bundesland: 'Sachsen-Anhalt',
    regionKurz: 'östlich Magdeburg',
    typ: 'Ackerland',
    flaecheGesamtHa: 65,
    flaecheAckerHa: 65,
    bodenpunkteKern: 45,
    pachtBis: 'verpachtet bis 2026',
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '65 ha Ackerland östlich Magdeburg, ca. 45 BP, verpachtet bis 2026.',
    beschreibungLang:
      'Zusammenhängende 65 ha Ackerflächen östlich von Magdeburg, ca. 45 Bodenpunkte, laufender Pachtvertrag bis 2026.',
    slug: 'st-3254-ackerland-magdeburg',
  },
  {
    id: 'SH-3238',
    status: 'Neu',
    bundesland: 'Schleswig-Holstein',
    regionKurz: 'Fehmarn',
    typ: 'Ackerland',
    flaecheGesamtHa: 8,
    flaecheAckerHa: 8,
    bodenpunkteKern: 65,
    kaufpreisText: 'Kaufpreis auf Anfrage',
    beschreibungKurz: '8 ha Ackerland auf Fehmarn mit 1.055 m² Ostseestrand.',
    beschreibungLang:
      'Seltene 8 ha Ackerfläche auf Fehmarn, ca. 65+ BP, inklusive 1.055 m² Ostseestrandabschnitt. Verfügbarkeit und Konditionen auf Anfrage.',
    slug: 'sh-3238-ackerland-fehmarn',
  },
];
