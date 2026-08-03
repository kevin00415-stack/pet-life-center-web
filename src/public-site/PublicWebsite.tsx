import { alternateLocale, useTranslation } from '../i18n/translations'
import brandMark from '../assets/brand-mark.webp'
import island from '../assets/home-island-v1.webp'
import { publicSiteContent } from './content'
import './public-website.css'

const anchors = ['mission', 'features', 'journey', 'install', 'faq']
const featureIcons = ['⏰', '📖', '🐾', '📷', '🔒', '🐶']

export default function PublicWebsite() {
  const { locale, changeLocale } = useTranslation()
  const c = publicSiteContent[locale]
  return <div className="public-site">
    <a className="site-skip" href="#main">{c.skip}</a>
    <header className="site-header">
      <a className="site-brand" href="/website" aria-label={c.brand}><img src={brandMark} alt=""/><span>{c.brand}<small>Pet Life Center</small></span></a>
      <nav aria-label={c.navLabel}>{c.nav.map((label, index) => <a key={label} href={`#${anchors[index]}`}>{label}</a>)}</nav>
      <div className="site-actions"><button className="guardian-button guardian-button--secondary" onClick={() => changeLocale(alternateLocale(locale))}>{c.language}</button><a className="guardian-button guardian-button--primary" href="/">{c.app}</a></div>
    </header>
    <main id="main">
      <section className="site-hero"><div><p className="site-eyebrow">{c.eyebrow}</p><h1>{c.title}</h1><p className="site-lead">{c.lead}</p><div className="hero-actions"><a className="guardian-button guardian-button--primary" href="/">{c.primary}</a><a className="guardian-button guardian-button--secondary" href="#privacy">{c.secondary}</a></div><p className="site-trust">✓ {c.trust}</p></div><figure><img src={island} alt={c.imageAlt}/><figcaption>{c.imageCaption}</figcaption></figure></section>
      <section id="mission" className="site-statement"><p className="site-eyebrow">OUR PHILOSOPHY</p><h2>{c.missionTitle}</h2><p>{c.mission}</p></section>
      <section className="site-today"><div><p className="site-eyebrow">GUARDIAN TODAY</p><h2>{c.todayTitle}</h2><p>{c.today}</p></div><div className="today-preview guardian-card"><span>09:30</span><strong>{c.todayPreviewTitle}</strong><p>{c.todayPreviewBody}</p></div></section>
      <section id="features" className="site-section"><p className="site-eyebrow">FEATURES</p><h2>{c.featuresTitle}</h2><div className="feature-grid">{c.featureCards.map(([title, body], index) => <article className="guardian-card" key={title}><span>{featureIcons[index]}</span><h3>{title}</h3><p>{body}</p></article>)}</div></section>
      <section id="journey" className="journey-section"><div><p className="site-eyebrow">CASE JOURNEY</p><h2>{c.journeyTitle}</h2><p>{c.journey}</p></div><ol>{c.journeySteps.map(([title, body]) => <li key={title}><b>{title}</b><span>{body}</span></li>)}</ol></section>
      <section id="install" className="install-section"><p className="site-eyebrow">PWA + CAPACITOR</p><h2>{c.installTitle}</h2><p>{c.install}</p><a className="guardian-button guardian-button--primary" href="/">{c.installCta}</a></section>
      <section id="faq" className="site-section faq-section"><p className="site-eyebrow">FAQ</p><h2>{c.faqTitle}</h2>{c.faq.map(([question, answer]) => <details className="guardian-card" key={question}><summary>{question}</summary><p>{answer}</p></details>)}</section>
      <section className="legal-grid"><article id="privacy" className="guardian-card"><h2>{c.privacyTitle}</h2><p>{c.privacy}</p><a href="#privacy">{c.privacyLink}</a></article><article id="terms" className="guardian-card"><h2>{c.termsTitle}</h2><p>{c.terms}</p><a href="#terms">{c.termsLink}</a></article><article id="contact" className="guardian-card"><h2>{c.contactTitle}</h2><p>{c.contact}</p><a href="mailto:service@mcjcpet.com.tw">service@mcjcpet.com.tw</a></article></section>
    </main>
    <footer className="site-footer"><span>{c.footer}</span><nav><a href="#privacy">{c.privacyLink}</a><a href="#terms">{c.termsLink}</a><a href="#contact">{c.contactLink}</a></nav></footer>
  </div>
}
