import { getPermalink, getBlogPermalink } from './utils/permalinks';

export const headerData = {
  links: [
    {
      text: 'Angebote',
      href: getPermalink('/angebote'),
    },
    {
      text: 'Immobilie verkaufen',
      href: getPermalink('/verkaeufer'),
    },
    {
      text: 'Gesuche',
      href: getPermalink('/investoren'),
    },
  ],
  actions: [{ text: 'Kontakt', href: getPermalink('/#kontakt') }],
};

export const footerData = {
  links: [
    {
      title: 'Navigation',
      links: [
        { text: 'Startseite', href: getPermalink('/', 'home') },
        { text: 'Angebote', href: getPermalink('/angebote') },
        { text: 'Für Verkäufer', href: getPermalink('/verkaeufer') },
        { text: 'Für Investoren', href: getPermalink('/investoren') },
      ],
    },
    {
      title: 'Ressourcen',
      links: [
        { text: 'Blog', href: getBlogPermalink() },
      ],
    },
  ],
  secondaryLinks: [],
  socialLinks: [
    { ariaLabel: 'LinkedIn', icon: 'tabler:brand-linkedin', href: '#' },
    { ariaLabel: 'Instagram', icon: 'tabler:brand-instagram', href: '#' },
    { ariaLabel: 'Facebook', icon: 'tabler:brand-facebook', href: '#' },
  ],
  footNote: `
    Muster Agrarimmobilien · Ihr Spezialist für Agrarflächen seit über 15 Jahren.
  `,
};
