import styles from './page.module.css';

const FEATURES = [
  {
    icon: '📷',
    title: 'Scanner-clean capture',
    body: 'Scan paperwork from the camera, import PDFs, or save photos. FileTrail cleans the page, stores the original, and makes it readable immediately.',
  },
  {
    icon: '🤖',
    title: 'Autopilot reads the document',
    body: 'Autopilot extracts the person, issuer, due date, expiry date, account numbers, and amount due so the vault becomes actionable instead of passive storage.',
  },
  {
    icon: '⏰',
    title: 'Deadlines surface themselves',
    body: 'Bills due soon, IDs expiring, missing insurance records, and documents that still need review all rise to the top automatically.',
  },
  {
    icon: '👨‍👩‍👧',
    title: 'Built for families',
    body: 'Assign records to the right person and keep licenses, school documents, medical records, and travel papers grouped by the people they belong to.',
  },
  {
    icon: '📧',
    title: 'Email into the vault',
    body: 'Forward statements, school forms, insurance PDFs, and vendor emails straight into FileTrail so your inbox becomes a document intake lane instead of long-term storage.',
  },
  {
    icon: '🔍',
    title: 'Search by what matters',
    body: 'Find documents by content, person, issuer, date, or category. Search stays useful because the metadata is structured, not just dumped into filenames.',
  },
  {
    icon: '☁️',
    title: 'Local first, cloud when you want it',
    body: 'Files live on-device first. Pro adds encrypted sync, cloud backup, share links, and cross-device restore without giving up the local-first model.',
  },
  {
    icon: '🔒',
    title: 'Private by design',
    body: 'Biometric lock, local storage, and explicit sync boundaries keep sensitive paperwork under control. You decide when a file leaves the phone.',
  },
];

const USECASES = [
  { icon: '🪪', title: 'Identity & travel', body: 'Passports, licenses, birth certificates, visas, and travel confirmations tracked by person and expiry date.' },
  { icon: '🏥', title: 'Medical & insurance', body: 'Lab results, insurance cards, EOBs, and prescriptions organized by family member with follow-up reminders.' },
  { icon: '💳', title: 'Bills & subscriptions', body: 'Forward statements from email, track due dates, and keep account numbers where you can actually find them.' },
  { icon: '🎓', title: 'School & life admin', body: 'Enrollment forms, transcripts, vaccine records, and family paperwork routed into one controlled workspace.' },
];

const AUTOPILOT_LANES = [
  { label: 'Due soon', body: 'Bills, premiums, and payments due in the next 30 days.' },
  { label: 'Expiring soon', body: 'IDs, passports, warranties, and policies with approaching end dates.' },
  { label: 'Needs review', body: 'Documents with missing person, issuer, or date information.' },
  { label: 'Missing docs', body: 'Gaps like no insurance card, no medical records, or no ID on file yet.' },
];

const SOCIAL_PROOF = [
  { quote: 'FileTrail stopped being a document drawer and started acting like a real household admin assistant.', name: 'Rachel T.', role: 'Parent of two' },
  { quote: 'Forwarding insurance PDFs from email into the vault is the first time my inbox has actually stayed clean.', name: 'Marcus L.', role: 'Consultant' },
  { quote: 'The person-based filing is what made it click. I can separate my records from my kids’ records without extra work.', name: 'Danielle S.', role: 'Operations lead' },
];

export default function Home() {
  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <div className={styles.navBrand}>
            <img src="/icon.png" alt="FileTrail" className={styles.navIcon} />
            <span className={styles.navName}>FileTrail</span>
          </div>
          <div className={styles.navLinks}>
            <a href="#features">Features</a>
            <a href="#autopilot">Autopilot</a>
            <a href="#pricing">Pricing</a>
            <a href="#download" className={styles.navCta}>Get the app</a>
          </div>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroGlow2} />
        <div className={styles.heroContent}>
          <div className={styles.heroBadge}>📄 FileTrail + Autopilot</div>
          <img src="/icon.png" alt="FileTrail" className={styles.heroIcon} />
          <h1 className={styles.heroTitle}>
            Your life documents,<br />
            <span className={styles.heroAccent}>finally under control.</span>
          </h1>
          <p className={styles.heroSubtitle}>
            FileTrail stores the paperwork. Autopilot reads it, extracts what matters,
            flags deadlines, and tells you what needs attention next.
          </p>
          <div className={styles.heroCtas} id="download">
            <a href="#" className={styles.ctaPrimary}>Download for iOS</a>
            <a href="#" className={styles.ctaSecondary}>Download for Android</a>
          </div>
          <p className={styles.heroNote}>Account-based sync · Local-first vault · Email intake · Family organization</p>
        </div>

        <div className={styles.heroStats}>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>1</span><span className={styles.heroStatLabel}>vault for the family</span></div>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>4</span><span className={styles.heroStatLabel}>autopilot lanes</span></div>
          <div className={styles.heroStat}><span className={styles.heroStatNum}>∞</span><span className={styles.heroStatLabel}>searchable records</span></div>
        </div>
      </section>

      <section className={styles.painSection}>
        <div className={styles.sectionInner}>
          <div className={styles.painGrid}>
            <div className={styles.painCard}>
              <div className={styles.painTitle}>What breaks today</div>
              <ul className={styles.painList}>
                {[
                  'Due dates live inside PDFs nobody reopens.',
                  'Kids’ records, medical docs, and travel papers end up mixed together.',
                  'Important files are trapped across inboxes, camera rolls, and random folders.',
                  'You can store the file, but you still have to remember what action it implies.',
                ].map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
            <div className={styles.painArrow}>→</div>
            <div className={styles.solutionCard}>
              <div className={styles.solutionTitle}>What FileTrail does instead</div>
              <ul className={styles.solutionList}>
                {[
                  'Stores every document in one secure vault.',
                  'Extracts the person, issuer, dates, and identifiers automatically.',
                  'Surfaces due-soon and expiring-soon items before they bite you.',
                  'Turns email into a document intake lane instead of a second archive.',
                ].map((item) => <li key={item}>• {item}</li>)}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.usecases}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Built for real life admin.</h2>
          <p className={styles.sectionSubtitle}>Not generic cloud storage. Not another dead scanner app.</p>
          <div className={styles.usecaseGrid}>
            {USECASES.map((item) => (
              <div key={item.title} className={styles.usecaseCard}>
                <span className={styles.usecaseIcon}>{item.icon}</span>
                <h3 className={styles.usecaseTitle}>{item.title}</h3>
                <p className={styles.usecaseBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.features} id="features">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Document storage plus an intelligence layer.</h2>
          <p className={styles.sectionSubtitle}>The vault handles capture and storage. Autopilot handles extraction, reminders, and next actions.</p>
          <div className={styles.featureGrid}>
            {FEATURES.map((item) => (
              <div key={item.title} className={styles.featureCard}>
                <span className={styles.featureIcon}>{item.icon}</span>
                <h3 className={styles.featureTitle}>{item.title}</h3>
                <p className={styles.featureBody}>{item.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.howItWorks} id="autopilot">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>How Autopilot works inside FileTrail.</h2>
          <div className={styles.steps}>
            {[
              { n: '1', title: 'Capture or forward', body: 'Scan a document, import a file, or forward an email attachment into your vault.' },
              { n: '2', title: 'Extract the facts', body: 'Autopilot reads the person, document type, issuer, due dates, expiry dates, account numbers, and amount due.' },
              { n: '3', title: 'Surface the action', body: 'The Autopilot tab groups what is due soon, expiring soon, missing, or still needs review.' },
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
          <div className={styles.featureGrid} style={{ marginTop: 40 }}>
            {AUTOPILOT_LANES.map((lane) => (
              <div key={lane.label} className={styles.featureCard}>
                <h3 className={styles.featureTitle}>{lane.label}</h3>
                <p className={styles.featureBody}>{lane.body}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.social}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>The right shape for a breakout product.</h2>
          <div className={styles.quoteGrid}>
            {SOCIAL_PROOF.map((quote) => (
              <div key={quote.name} className={styles.quoteCard}>
                <div className={styles.quoteStars}>★★★★★</div>
                <p className={styles.quoteText}>"{quote.quote}"</p>
                <div className={styles.quoteMeta}>
                  <span className={styles.quoteName}>{quote.name}</span>
                  <span className={styles.quoteRole}>{quote.role}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.pricing} id="pricing">
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Simple pricing, clear upgrade path.</h2>
          <p className={styles.sectionSubtitle}>Use FileTrail as a vault for free. Upgrade when you want sync, AI depth, and email-driven workflows.</p>
          <div className={styles.pricingGrid}>
            <div className={styles.pricingCard}>
              <div className={styles.pricingName}>Free</div>
              <div className={styles.pricingPriceRow}>
                <span className={styles.pricingPrice}>$0</span>
                <span className={styles.pricingPeriod}>forever</span>
              </div>
              <p className={styles.pricingTagline}>A strong local-first filing cabinet.</p>
              <ul className={styles.pricingFeatures}>
                {[
                  'Document capture and imports',
                  'OCR search',
                  'Folders, tags, favorites',
                  'Autopilot preview fields on saved docs',
                  'Local-only vault access',
                  'Export and share',
                ].map((item) => <li key={item}><span className={styles.check}>✓</span>{item}</li>)}
              </ul>
              <a href="#download" className={styles.ctaOutline}>Download free</a>
            </div>

            <div className={`${styles.pricingCard} ${styles.pricingCardPro}`}>
              <div className={styles.proBadge}>Best fit</div>
              <div className={styles.pricingName}>Pro</div>
              <div className={styles.pricingPriceRow}>
                <span className={styles.pricingPrice}>$5.99</span>
                <span className={styles.pricingPeriod}>/month</span>
              </div>
              <p className={styles.pricingTagline}>Where FileTrail becomes a life-admin system.</p>
              <ul className={styles.pricingFeatures}>
                {[
                  'Encrypted sync and restore',
                  'Autopilot dashboard and action lanes',
                  'AI extraction for dates, issuers, and identifiers',
                  'Email-to-vault forwarding',
                  'Share links and cloud recovery',
                  'Family-focused organization',
                ].map((item) => <li key={item}><span className={styles.checkPro}>✓</span>{item}</li>)}
              </ul>
              <a href="#download" className={styles.ctaPrimary}>Start with Pro</a>
              <p className={styles.pricingNote}>Sync, AI extraction, and email intake are the real upgrade drivers.</p>
            </div>
          </div>
          <div className={styles.valueAnchor}>
            FileTrail stores the paperwork. Autopilot turns it into reminders, timelines, and next actions.
          </div>
        </div>
      </section>

      <section className={styles.privacy}>
        <div className={styles.sectionInner}>
          <div className={styles.privacyCard}>
            <span className={styles.privacyIcon}>🔒</span>
            <h2 className={styles.privacyTitle}>Your records stay under your control.</h2>
            <p className={styles.privacyBody}>
              FileTrail stays local-first. Documents live on the device first, then sync only when you enable cloud workflows.
              That makes the vault fast, private, and usable even when the network is unavailable.
            </p>
            <div className={styles.privacyBadges}>
              <div className={styles.privacyBadge}>🏠 Local-first vault</div>
              <div className={styles.privacyBadge}>🔐 Encrypted sync</div>
              <div className={styles.privacyBadge}>👤 Person-based organization</div>
              <div className={styles.privacyBadge}>📧 Optional email intake</div>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.finalCta}>
        <div className={styles.sectionInner}>
          <div className={styles.finalCtaCard}>
            <div className={styles.finalCtaGlow} />
            <img src="/icon.png" alt="FileTrail" className={styles.finalCtaIcon} />
            <h2 className={styles.finalCtaTitle}>Turn FileTrail into the command center for life paperwork.</h2>
            <p className={styles.finalCtaBody}>
              Capture the document once. Let Autopilot tell you what it means, when it matters, and what to do next.
            </p>
            <div className={styles.heroCtas}>
              <a href="#" className={styles.ctaPrimary}>Download for iOS</a>
              <a href="#" className={styles.ctaSecondary}>Download for Android</a>
            </div>
          </div>
        </div>
      </section>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src="/icon.png" alt="FileTrail" className={styles.footerIcon} />
            <span>FileTrail</span>
          </div>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy Policy</a>
            <a href="/terms">Terms of Service</a>
            <a href="/support">Support</a>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} FileTrail. Document vault plus Autopilot.</p>
        </div>
      </footer>
    </div>
  );
}
