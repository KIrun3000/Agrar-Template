import { getPermalink, getBlogPermalink, getAsset } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Startseite',
      href: getPermalink('/', 'home'),
    },
    {
      text: 'Angebote',
      href: getPermalink('/angebote'),
    },
    {
      text: 'Regionen',
      href: getPermalink('/regionen'),
    },
    {
      text: 'Länder',
      href: getPermalink('/laender'),
    },
    {
      text: 'Für Verkäufer',
      href: getPermalink('/verkaeufer'),
    },
    {
      text: 'Für Investoren',
      href: getPermalink('/investoren'),
    },
    {
      text: 'Über uns',
      href: getPermalink('/ueber-uns'),
    },
    {
      text: 'Kontakt',
      href: getPermalink('/kontakt'),
    },
  ],
  actions: [{ text: 'Exposé anfragen', href: getPermalink('/kontakt') }],
};

export const footerData = {
  links: [
    {
      title: 'Navigation',
      links: [
        { text: 'Startseite', href: getPermalink('/', 'home') },
        { text: 'Angebote', href: getPermalink('/angebote') },
        { text: 'Regionen', href: getPermalink('/regionen') },
        { text: 'Länder', href: getPermalink('/laender') },
        { text: 'Für Verkäufer', href: getPermalink('/verkaeufer') },
        { text: 'Für Investoren', href: getPermalink('/investoren') },
      ],
    },
    {
      title: 'Ressourcen',
      links: [
        { text: 'Über uns', href: getPermalink('/ueber-uns') },
        { text: 'Kontakt', href: getPermalink('/kontakt') },
        { text: 'Blog', href: getBlogPermalink() },
        { text: 'RSS', href: getAsset('/rss.xml') },
      ],
    },
    {
      title: 'Rechtliches',
      links: [
        { text: 'Datenschutz', href: getPermalink('/privacy') },
        { text: 'Nutzungsbedingungen', href: getPermalink('/terms') },
      ],
    },
  ],
  secondaryLinks: [
    { text: 'Terms', href: getPermalink('/terms') },
    { text: 'Privacy Policy', href: getPermalink('/privacy') },
  ],
  socialLinks: [
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
  ],
  footNote: `
    Muster Agrarimmobilien · Ihr Spezialist für Agrarflächen seit über 15 Jahren.
  `,
};
