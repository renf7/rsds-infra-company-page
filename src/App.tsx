import { content, type Feature, type Language, type PageContent, type SectionContent } from './content';
import { rememberLanguage, useLanguageRedirect } from './language';
import { AuthControls } from './AuthControls';

export function Header({ page, language, homeNavigation = false, settings = false }: { page: PageContent; language: Language; homeNavigation?: boolean; settings?: boolean }) {
  return <header className="site-header">
    <div className="container header-inner">
      <a className="brand" href={page.home} aria-label={page.homeLabel}>
        <img className="brand-logo" src={settings ? '/logo-icon.png' : page.logo} alt={page.logoAlt} width="56" height="56" />
      </a>
      <nav className="site-nav" aria-label={page.navigationLabel}>
        {page.navigation.map(link => <a key={link.id} className={link.id === 'contact' ? 'nav-cta' : undefined} href={`${homeNavigation || settings ? page.home : ''}#${link.id}`}>{link.label}</a>)}
      </nav>
      <nav className="language-nav" aria-label={page.languageLabel}>
        <a href="/" lang="en" hrefLang="en" data-language-choice="en" aria-current={language === 'en' ? 'page' : undefined} onClick={() => rememberLanguage('en')}>EN</a>
        <a href="/pl/" lang="pl" hrefLang="pl" data-language-choice="pl" aria-current={language === 'pl' ? 'page' : undefined} onClick={() => rememberLanguage('pl')}>PL</a>
      </nav>
      {!homeNavigation && <AuthControls language={language} />}
    </div>
  </header>;
}

function Hero({ page }: { page: PageContent }) {
  return <section id="hero" className="hero"><div className="container">
    <p className="eyebrow">{page.hero.eyebrow}</p>
    <h1>{page.hero.heading}</h1>
    <p className="hero-sub">{page.hero.description}</p>
    <div className="hero-actions">
      <a className="btn btn-primary" href="#contact">{page.hero.primary}</a>
      <a className="btn btn-secondary" href="#services">{page.hero.secondary}</a>
    </div>
  </div></section>;
}

function FeatureGrid({ cards }: { cards: readonly Feature[] }) {
  return <ul className="feature-grid">{cards.map(card => <li className="card" key={card.heading}>
    <h3>{card.heading}</h3><p>{card.description}</p>
  </li>)}</ul>;
}

function CertificationIcon() {
  return <svg className="cert-icon" viewBox="0 0 24 24" width="22" height="22" role="img" aria-hidden="true">
    <circle cx="12" cy="9" r="6" fill="none" stroke="currentColor" strokeWidth="2" />
    <path d="M9 9.5l2 2 4-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    <path d="M8.5 14l-1.5 6 5-2.5 5 2.5-1.5-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
  </svg>;
}

function ContentSection({ section, page }: { section: SectionContent; page: PageContent }) {
  return <section id={section.id} className={section.className}><div className="container">
    <h2>{section.heading}</h2><p className="section-lead">{section.lead}</p>
    {section.id === 'team' && <ul className="certs" aria-label={page.certificatesLabel}>
      {page.certificates.map(certificate => <li className="cert-badge" key={certificate}>
        <CertificationIcon /><span>{certificate}</span>
      </li>)}
    </ul>}
    <FeatureGrid cards={section.cards} />
  </div></section>;
}

function ContactSection({ page }: { page: PageContent }) {
  return <section id="contact" className="section contact"><div className="container">
    <h2>{page.contact.heading}</h2><p className="section-lead">{page.contact.description}</p>
    <a className="btn btn-primary" href="mailto:contact@rsdsoftware.eu">contact@rsdsoftware.eu</a>
  </div></section>;
}

export function Footer({ page, privacyPolicyAvailable = false }: { page: PageContent; privacyPolicyAvailable?: boolean }) {
  return <footer className="site-footer"><div className="container footer-inner">
    <p>© <span id="year">2026</span> RSD Software EU · rsdsoftware.eu</p><p>{page.footer}</p>
    {privacyPolicyAvailable && <a data-privacy-policy-link href="/facebook-privacy-policy">Privacy Policy</a>}
  </div></footer>;
}

export function App({ language, privacyPolicyAvailable = false, settings = false }: { language: Language; privacyPolicyAvailable?: boolean; settings?: boolean }) {
  useLanguageRedirect(language);
  const page = content[language];
  return <>
    <Header page={page} language={language} settings={settings} />
    {settings ? <SettingsPage language={language} /> : <main><Hero page={page} />{page.sections.map(section => <ContentSection key={section.id} section={section} page={page} />)}<ContactSection page={page} /></main>}
    <Footer page={page} privacyPolicyAvailable={privacyPolicyAvailable} />
  </>;
}
