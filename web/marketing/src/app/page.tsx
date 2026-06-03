import styles from './page.module.css';

const FEATURES = [
  {
    icon: '🗂️',
    title: 'Local-first storage',
    body: 'Every document lives on your device. No account required, no cloud fees, no privacy trade-offs.',
  },
  {
    icon: '🔍',
    title: 'Full-text search',
    body: 'OCR extracts text from every scan. Search by title, tag, category, vendor, or content — instantly.',
  },
  {
    icon: '📁',
    title: 'Smart organisation',
    body: 'Folders, tags, and auto-detected categories keep receipts, contracts, IDs, and warranties in their place.',
  },
  {
    icon: '🔒',
    title: 'Biometric lock',
    body: 'Face ID or Touch ID protects your vault. Nothing leaves your phone unless you choose to share it.',
  },
  {
    icon: '☁️',
    title: 'Cloud sync (Pro)',
    body: 'Upgrade to Pro for encrypted cloud backup and sync across all your devices.',
  },
  {
    icon: '⚡',
    title: 'Works offline',
    body: 'Capture, organise, and search without any internet connection — always.',
  },
];

const PRICING = [
  {
    name: 'Free',
    price: '$0',
    period: 'forever',
    features: [
      'Unlimited local documents',
      'Full-text OCR search',
      'Folders & tags',
      'Biometric lock',
      'PDF & image support',
    ],
    cta: 'Download free',
    ctaHref: '#download',
    highlight: false,
  },
  {
    name: 'Pro',
    price: '$2.99',
    period: '/month',
    features: [
      'Everything in Free',
      'Encrypted cloud sync',
      'Multi-device access',
      'Priority OCR processing',
      'Email-to-vault',
      'Shareable document links',
    ],
    cta: 'Start free trial',
    ctaHref: '#download',
    highlight: true,
  },
];

export default function Home() {
  return (
    <div className={styles.page}>
      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <img src="/icon.png" alt="PaperTrail" className={styles.navIcon} />
            <span className={styles.navName}>PaperTrail</span>
          </div>
          <a href="#download" className={styles.navCta}>Download</a>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroContent}>
          <img src="/icon.png" alt="PaperTrail" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>
            Your documents,<br />
            <span className={styles.heroAccent}>your device.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            Scan, organise, and search all your important documents — locally, privately, and offline.
            No account. No cloud. No compromises.
          </p>
          <div className={styles.heroCtas} id="download">
            <a href="#" className={styles.ctaPrimary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/>
              </svg>
              App Store
            </a>
            <a href="#" className={styles.ctaSecondary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
                <path d="M3.18 23.76C3.56 24.1 4.06 24.14 4.59 23.85L15.93 17.4L12.27 13.73L3.18 23.76M.32 1.53C.12 1.9 0 2.35 0 2.9V21.1C0 21.65.12 22.1.34 22.46L.43 22.55L11.54 11.44V11.23L.43 .15.32 1.53M19.69 10.43L15.93 8.22L12.04 12.11L15.93 15.99L19.69 13.78C20.76 13.16 20.76 10.84 19.69 10.43M4.59.15C4.06-.14 3.56-.1 3.18.24L12.04 9.12L15.93 5.23L4.59.15Z"/>
              </svg>
              Google Play
            </a>
          </div>
          <p className={styles.heroNote}>Free forever · No account needed</p>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Everything you need. Nothing you don't.</h2>
          <div className={styles.featureGrid}>
            {FEATURES.map((f) => (
              <div key={f.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{f.icon}</span>
                <h3 className={styles.featureTitle}>{f.title}</h3>
                <p className={styles.featureBody}>{f.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Three taps to organised.</h2>
          <div className={styles.steps}>
            {[
              { n: '1', title: 'Scan or import', body: 'Point your camera at any document, or import a PDF from your files.' },
              { n: '2', title: 'Auto-categorise', body: 'OCR reads the text. PaperTrail suggests the category, tags, and date.' },
              { n: '3', title: 'Find anything', body: 'Search by any word in the document, or browse by folder, tag, or category.' },
            ].map((step) => (
              <div key={step.n} className={styles.step}>
                <div className={styles.stepNum}>{step.n}</div>
                <div>
                  <h3 className={styles.stepTitle}>{step.title}</h3>
                  <p className={styles.stepBody}>{step.body}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Simple pricing.</h2>
          <p className={styles.sectionSubtitle}>Start free. Upgrade when you're ready.</p>
          <div className={styles.pricingGrid}>
            {PRICING.map((plan) => (
              <div key={plan.name} className={`${styles.pricingCard} ${plan.highlight ? styles.pricingCardHighlight : ''}`}>
                {plan.highlight && <div className={styles.pricingBadge}>Most popular</div>}
                <div className={styles.pricingName}>{plan.name}</div>
                <div className={styles.pricingPrice}>
                  {plan.price}<span className={styles.pricingPeriod}>{plan.period}</span>
                </div>
                <ul className={styles.pricingFeatures}>
                  {plan.features.map((f) => (
                    <li key={f} className={styles.pricingFeature}>
                      <span className={styles.pricingCheck}>✓</span> {f}
                    </li>
                  ))}
                </ul>
                <a href={plan.ctaHref} className={plan.highlight ? styles.ctaPrimary : styles.ctaOutline}>
                  {plan.cta}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Privacy callout */}
      <section className={styles.privacy}>
        <div className={styles.sectionInner}>
          <div className={styles.privacyCard}>
            <span className={styles.privacyIcon}>🔒</span>
            <h2 className={styles.privacyTitle}>Private by design.</h2>
            <p className={styles.privacyBody}>
              PaperTrail is built on a local-first architecture. Your documents never touch our servers unless
              you explicitly turn on cloud sync. We don't collect, sell, or share your data. Ever.
            </p>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src="/icon.png" alt="PaperTrail" className={styles.footerIcon} />
            <span>PaperTrail</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@papertrail.app">Support</a>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} PaperTrail. All rights reserved.</p>
        </div>
      </footer>
    </div>
  );
}
