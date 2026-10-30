import en from './locales/en.json';
import pl from './locales/pl.json';
export type Language = 'en' | 'pl';
export interface Feature { heading: string; description: string }
export interface SectionContent { id: string; className: string; heading: string; lead: string; cards: readonly Feature[] }
export interface PageContent { home: string; homeLabel: string; logo: string; logoAlt: string; navigationLabel: string; languageLabel: string; navigation: readonly { id: string; label: string }[]; hero: { eyebrow: string; heading: string; description: string; primary: string; secondary: string }; sections: readonly SectionContent[]; certificatesLabel: string; certificates: readonly string[]; contact: { heading: string; description: string }; footer: string }
export const content = {en,pl} satisfies Record<Language, PageContent>;
