import styles from './page.module.css';

const FEATURES = [
  {
    icon: '📷',
    title: 'Scan anything in seconds',
    body: 'Point your camera and tap. PaperTrail captures receipts, contracts, IDs, warranties, and letters — then reads every word with on-device OCR automatically.',
  },
  {
    icon: '🔍',
    title: 'Find it in under 3 seconds',
    body: 'Search by any word inside any document. "dentist invoice march" surfaces it instantly. No folders required — though we have those too.',
  },
  {
    icon: '🗂️',
    title: 'Auto-organises itself',
    body: 'PaperTrail detects receipts, contracts, IDs, tax docs, and warranties automatically. Everything lands in the right place without you lifting a finger.',
  },
  {
    icon: '🔒',
    title: 'Fort Knox on your phone',
    body: 'Face ID or Touch ID locks your vault. Your documents never touch a server unless you choose cloud sync. Even then — encrypted end-to-end.',
  },
  {
    icon: '💾',
    title: 'Works 100% offline',
    body: 'No Wi-Fi? No problem. Capture, organise, search, and export even on a plane. Everything lives on your device first, cloud second.',
  },
  {
    icon: '📤',
    title: 'Share & export effortlessly',
    body: 'Send a single document or export your entire vault as a ZIP. Time-limited share links let you send docs to accountants without email attachments.',
  },
  {
    icon: '🤖',
    title: 'AI that actually helps',
    body: 'Pro AI reads your receipts and pulls out totals, dates, and vendors. Natural-language search means you can ask "find my car insurance from last year" and actually get it.',
  },
  {
    icon: '📧',
    title: 'Email-to-vault',
    body: 'Forward any email to your personal @papertrail.app address and the attachment lands straight in your vault. No more digging through Gmail for that invoice.',
  },
];

const SOCIAL_PROOF = [
  { quote: "I used to spend 20 minutes hunting for receipts at tax time. Now it takes 20 seconds.", name: "Sarah K.", role: "Freelance designer" },
  { quote: "Finally deleted the 'IMPORTANT DOCS' folder on my desktop that I never maintained.", name: "James R.", role: "Small business owner" },
  { quote: "The OCR search is genuinely magic. Found a 3-year-old warranty in seconds.", name: "Priya M.", role: "Product manager" },
];

const USECASES = [
  { icon: '🧾', title: 'Tax season', body: 'Every receipt, invoice, and statement — searchable, sorted, and ready to hand to your accountant in one ZIP.' },
  { icon: '🏠', title: 'Home & car', body: 'Warranties, insurance policies, service records. Know exactly when things expire before they do.' },
  { icon: '🏥', title: 'Medical records', body: 'Lab results, prescriptions, insurance cards. Locked behind biometrics and always on you.' },
  { icon: '💼', title: 'Business docs', body: 'Contracts, NDAs, invoices. Share a time-limited link instead of emailing sensitive files.' },
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
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#pricing">Pricing</a>
            <a href="#download" className={styles.navCta}>Download free</a>
          </div>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>📱 Free on iOS &amp; Android</div>
          <img src="/icon.png" alt="PaperTrail" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>
            Stop losing<br />
            <span className={styles.heroAccent}>important documents.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            PaperTrail turns your phone into a secure, searchable filing cabinet.
            Scan, organise, and find any document in seconds — even offline, even without an account.
          </p>
          <div className={styles.heroCtas} id="download">
            <a href="#" className={styles.ctaPrimary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
              Download for iOS
            </a>
            <a href="#" className={styles.ctaSecondary}>
              <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76C3.56 24.1 4.06 24.14 4.59 23.85L15.93 17.4L12.27 13.73L3.18 23.76M.32 1.53C.12 1.9 0 2.35 0 2.9V21.1C0 21.65.12 22.1.34 22.46L.43 22.55L11.54 11.44V11.23L.43.15.32 1.53M19.69 10.43L15.93 8.22L12.04 12.11L15.93 15.99L19.69 13.78C20.76 13.16 20.76 10.84 19.69 10.43M4.59.15C4.06-.14 3.56-.1 3.18.24L12.04 9.12L15.93 5.23L4.59.15Z"/></svg>
              Download for Android
            </a>
          </div>
          <p className={styles.heroNote}>Free forever · No account · No cloud required</p>
        </div>

        {/* Floating stat pills */}
        <div className={styles.heroStats}>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>3 sec</span><span className={styles.heroStatLabel}>avg search time</span></div>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>100%</span><span className={styles.heroStatLabel}>offline capable</span></div>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>0</span><span className={styles.heroStatLabel}>accounts needed</span></div>
        </div>
      </section>

      {/* Pain → Solution */}
      <section className={styles.painSection}>
        <div className={styles.sectionInner}>
          <div className={styles.painGrid}>
            <div className={styles.painCard}>
              <div className={styles.painTitle}>Sound familiar?</div>
              <ul className={styles.painList}>
                {[
                  '😤 Can\'t find that warranty when something breaks',
                  '📧 Hunting through emails for a PDF from 2 years ago',
                  '🗃️ Boxes of paper "just in case"',
                  '😰 Panic at tax time finding receipts',
                  '📁 A "DOCS" folder that\'s become a graveyard',
                ].map(p => <li key={p}>{p}</li>)}
              </ul>
            </div>
            <div className={styles.painArrow}>→</div>
            <div className={styles.solutionCard}>
              <div className={styles.solutionTitle}>PaperTrail fixes this.</div>
              <ul className={styles.solutionList}>
                {[
                  '✅ Every document scanned and searchable in seconds',
                  '✅ OCR reads the text so you search by content, not filename',
                  '✅ Auto-detects warranties, receipts, IDs — files them correctly',
                  '✅ Tax time = ZIP export, done',
                  '✅ One app. Everything. Always on your phone.',
                ].map(s => <li key={s}>{s}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      {/* Use cases */}
      <section className={styles.usecases}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Built for real life.</h2>
          <p className={styles.sectionSubtitle}>One app for every document you'll ever need to find again.</p>
          <div className={styles.usecaseGrid}>
            {USECASES.map(u => (
              <div key={u.title} className={styles.usecaseCard}>
                <span className={styles.usecaseIcon}>{u.icon}</span>
                <h3 className={styles.usecaseTitle}>{u.title}</h3>
                <p className={styles.usecaseBody}>{u.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Everything you need. Nothing bloated.</h2>
          <p className={styles.sectionSubtitle}>Built from the ground up for speed, privacy, and simplicity.</p>
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

      {/* Social proof */}
      <section className={styles.social}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>People actually use this.</h2>
          <div className={styles.quoteGrid}>
            {SOCIAL_PROOF.map(q => (
              <div key={q.name} className={styles.quoteCard}>
                <div className={styles.quoteStars}>★★★★★</div>
                <p className={styles.quoteText}>"{q.quote}"</p>
                <div className={styles.quoteMeta}>
                  <span className={styles.quoteName}>{q.name}</span>
                  <span className={styles.quoteRole}>{q.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Pricing */}
      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Honest pricing.</h2>
          <p className={styles.sectionSubtitle}>Free forever for the essentials. Pro when you want superpowers.</p>
          <div className={styles.pricingGrid}>

            {/* Free */}
            <div className={styles.pricingCard}>
              <div className={styles.pricingName}>Free</div>
              <div className={styles.pricingPriceRow}>
                <span className={styles.pricingPrice}>$0</span>
                <span className={styles.pricingPeriod}>forever</span>
              </div>
              <p className={styles.pricingTagline}>Everything you need to go paperless.</p>
              <ul className={styles.pricingFeatures}>
                {[
                  'Unlimited local documents',
                  'On-device OCR (full text search)',
                  'Auto-categorisation',
                  'Folders, tags, favorites',
                  'ZIP export',
                  'Biometric lock',
                  'Works completely offline',
                  'No account required — ever',
                ].map(f => <li key={f}><span className={styles.check}>✓</span>{f}</li>)}
              </ul>
              <a href="#download" className={styles.ctaOutline}>Download free</a>
            </div>

            {/* Pro */}
            <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
              <div className={styles.proBadge}>Most popular</div>
              <div className={styles.pricingName}>Pro</div>
              <div className={styles.pricingPriceRow}>
                <span className={styles.pricingPrice}>$5.99</span>
                <span className={styles.pricingPeriod}>/month</span>
              </div>
              <p className={styles.pricingTagline}>For people serious about their documents.</p>
              <ul className={styles.pricingFeatures}>
                {[
                  'Everything in Free',
                  'Encrypted cloud sync',
                  'Access from any device',
                  'Email-to-vault forwarding',
                  'AI auto-naming & categorisation',
                  'AI expiry detection (IDs, warranties)',
                  'Natural-language search',
                  'Time-limited shareable links',
                  'Shared vaults (family / business)',
                  'Spending analytics by vendor',
                  'Priority OCR processing',
                ].map(f => <li key={f}><span className={styles.checkPro}>✓</span>{f}</li>)}
              </ul>
              <a href="#download" className={styles.ctaPrimary}>Start free trial</a>
              <p className={styles.pricingNote}>7-day free trial · Cancel anytime</p>
            </div>

          </div>

          {/* Value anchor */}
          <div className={styles.valueAnchor}>
            💡 That's less than one coffee a month to never lose an important document again.
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className={styles.howItWorks}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Up and running in 60 seconds.</h2>
          <div className={styles.steps}>
            {[
              { n: '1', title: 'Download & open', body: 'No sign-up. No email. No credit card. Just open the app and you\'re ready.' },
              { n: '2', title: 'Scan your first document', body: 'Tap the camera button, point at anything — a receipt, letter, card — and tap capture.' },
              { n: '3', title: 'Search anything', body: 'Type any word that appears in the document. PaperTrail finds it in under 3 seconds.' },
            ].map(step => (
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

      {/* Privacy */}
      <section className={styles.privacy}>
        <div className={styles.sectionInner}>
          <div className={styles.privacyCard}>
            <span className={styles.privacyIcon}>🔒</span>
            <h2 className={styles.privacyTitle}>Your documents belong to you.</h2>
            <p className={styles.privacyBody}>
              PaperTrail is built local-first. Everything lives on your device. No documents touch our servers unless you turn on cloud sync — and even then they're encrypted before they leave your phone. We don't mine your data, sell your information, or read your documents. Ever.
            </p>
            <div className={styles.privacyBadges}>
              <div className={styles.privacyBadge}>🏠 Local-first storage</div>
              <div className={styles.privacyBadge}>🔐 End-to-end encrypted sync</div>
              <div className={styles.privacyBadge}>👁️ Zero data mining</div>
              <div className={styles.privacyBadge}>📵 No account required</div>
            </div>
          </div>
        </div>
      </section>

      {/* Final CTA */}
      <section className={styles.finalCta}>
        <div className={styles.sectionInner}>
          <div className={styles.finalCtaCard}>
            <div className={styles.finalCtaGlow} />
            <img src="/icon.png" alt="PaperTrail" className={styles.finalCtaIcon} />
            <h2 className={styles.finalCtaTitle}>Get your documents under control. Today.</h2>
            <p className={styles.finalCtaBody}>Free forever. No account. Works offline. Takes 60 seconds to set up.</p>
            <div className={styles.heroCtas}>
              <a href="#" className={styles.ctaPrimary}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M18.71 19.5C17.88 20.74 17 21.95 15.66 21.97C14.32 22 13.89 21.18 12.37 21.18C10.84 21.18 10.37 21.95 9.1 22C7.78 22.05 6.8 20.68 5.96 19.47C4.25 17 2.94 12.45 4.7 9.39C5.57 7.87 7.13 6.91 8.82 6.88C10.1 6.86 11.32 7.75 12.11 7.75C12.89 7.75 14.37 6.68 15.92 6.84C16.57 6.87 18.39 7.1 19.56 8.82C19.47 8.88 17.39 10.1 17.41 12.63C17.44 15.65 20.06 16.66 20.09 16.67C20.06 16.74 19.67 18.11 18.71 19.5M13 3.5C13.73 2.67 14.94 2.04 15.94 2C16.07 3.17 15.6 4.35 14.9 5.19C14.21 6.04 13.07 6.7 11.95 6.61C11.8 5.46 12.36 4.26 13 3.5Z"/></svg>
                Download for iOS
              </a>
              <a href="#" className={styles.ctaSecondary}>
                <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor"><path d="M3.18 23.76C3.56 24.1 4.06 24.14 4.59 23.85L15.93 17.4L12.27 13.73L3.18 23.76M.32 1.53C.12 1.9 0 2.35 0 2.9V21.1C0 21.65.12 22.1.34 22.46L.43 22.55L11.54 11.44V11.23L.43.15.32 1.53M19.69 10.43L15.93 8.22L12.04 12.11L15.93 15.99L19.69 13.78C20.76 13.16 20.76 10.84 19.69 10.43M4.59.15C4.06-.14 3.56-.1 3.18.24L12.04 9.12L15.93 5.23L4.59.15Z"/></svg>
                Download for Android
              </a>
            </div>
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
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="mailto:support@papertrail.app">Support</a>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} PaperTrail. Your documents, your device.</p>
        </div>
      </footer>

    </div>
  );
}
