import styles from '../legal.module.css';

export const metadata = {
  title: 'Privacy Policy — FileTrail',
  description: 'How FileTrail handles your data.',
};

const TOC = [
  { id: 's1',  label: '1. Who we are' },
  { id: 's2',  label: '2. Data on your device' },
  { id: 's3',  label: '3. Free tier data' },
  { id: 's4',  label: '4. Pro tier data' },
  { id: 's5',  label: '5. Analytics' },
  { id: 's6',  label: '6. Push notifications' },
  { id: 's7',  label: '7. Cookies & tracking' },
  { id: 's8',  label: '8. Third-party services' },
  { id: 's9',  label: '9. Data retention' },
  { id: 's10', label: '10. Your rights' },
  { id: 's11', label: "11. Children's privacy" },
  { id: 's12', label: '12. Security' },
  { id: 's13', label: '13. Changes to this policy' },
  { id: 's14', label: '14. Contact' },
];

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>

      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navBrand}>
            <img src="/icon.png" alt="FileTrail" className={styles.navIcon} />
            <span className={styles.navName}>FileTrail</span>
          </a>
          <a href="/" className={styles.navBack}>← Back to home</a>
        </div>
      </nav>

      <div className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>🔒 Privacy First</div>
          <h1 className={styles.heroTitle}>Privacy Policy</h1>
          <p className={styles.heroSubtitle}>
            Your documents belong to you. Here's exactly what data we collect,
            what we don't, and how we protect your privacy.
          </p>
          <span className={styles.heroUpdated}>Last updated: June 3, 2026</span>
        </div>
      </div>

      <div className={styles.contentWrap}>

        <aside className={styles.toc}>
          <p className={styles.tocTitle}>Contents</p>
          <ul className={styles.tocList}>
            {TOC.map((item) => (
              <li key={item.id}><a href={`#${item.id}`}>{item.label}</a></li>
            ))}
          </ul>
        </aside>

        <article className={styles.article}>

          <p className={styles.lead}>
            FileTrail stores your documents <strong>on your device</strong>. We do not
            collect, read, or sell your documents. If you don't enable cloud sync, your data
            never leaves your phone. Full stop.
          </p>

          <div className={styles.section} id="s1">
            <span className={styles.sectionNum}>Section 1</span>
            <h2 className={styles.sectionTitle}>Who we are</h2>
            <p>FileTrail is developed and operated by Rushing Technologies. For privacy-related questions, contact us at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
          </div>

          <div className={styles.section} id="s2">
            <span className={styles.sectionNum}>Section 2</span>
            <h2 className={styles.sectionTitle}>Data stored locally on your device</h2>
            <p>The following is stored exclusively on your device and never transmitted to our servers unless you explicitly enable cloud sync:</p>
            <ul>
              <li>Document files (images, PDFs)</li>
              <li>Document metadata (title, category, tags, dates)</li>
              <li>OCR-extracted text</li>
              <li>Folders and organisational structure</li>
              <li>App settings and preferences</li>
            </ul>
          </div>

          <div className={styles.section} id="s3">
            <span className={styles.sectionNum}>Section 3</span>
            <h2 className={styles.sectionTitle}>Data we collect — Free tier</h2>
            <p>On the free tier with no account, we collect <strong>nothing</strong>. The app functions entirely offline with no data transmitted to us.</p>
            <p>If you use features that require a network connection (such as AI suggestions), we may receive the minimum data necessary to perform that specific function. We do not retain this data beyond the duration of the request.</p>
          </div>

          <div className={styles.section} id="s4">
            <span className={styles.sectionNum}>Section 4</span>
            <h2 className={styles.sectionTitle}>Data we collect — Pro tier with cloud sync</h2>
            <p>When you enable Pro cloud sync, we store the following on our servers in encrypted form:</p>
            <ul>
              <li><strong>Account credentials</strong> — email address and a hashed password. We never store passwords in plain text.</li>
              <li><strong>Encrypted document data</strong> — your documents are encrypted on your device before upload. We cannot read the contents of your documents.</li>
              <li><strong>Sync metadata</strong> — timestamps and sync version numbers required to keep your devices in sync.</li>
              <li><strong>Billing information</strong> — handled entirely by our payment processor (Stripe). We never see or store your full card details.</li>
            </ul>
          </div>

          <div className={styles.section} id="s5">
            <span className={styles.sectionNum}>Section 5</span>
            <h2 className={styles.sectionTitle}>Analytics</h2>
            <p>We collect anonymised, aggregated analytics to understand how the app is used — for example, which features are most popular. These events contain no personally identifiable information and no document content. You can opt out of analytics in the app's Settings screen at any time.</p>
            <p>Analytics data we may collect includes: app opened, feature used, error type. We do not track your location, contacts, or any data outside the app.</p>
          </div>

          <div className={styles.section} id="s6">
            <span className={styles.sectionNum}>Section 6</span>
            <h2 className={styles.sectionTitle}>Push notifications</h2>
            <p>If you enable notifications, your device's push token is stored on our servers solely to deliver notifications you have requested (such as backup reminders). You can revoke notification permission at any time through your device settings.</p>
          </div>

          <div className={styles.section} id="s7">
            <span className={styles.sectionNum}>Section 7</span>
            <h2 className={styles.sectionTitle}>Cookies and tracking</h2>
            <p>The FileTrail mobile app does not use cookies. This website uses no third-party tracking scripts. We do not use Google Analytics, Facebook Pixel, or any advertising trackers.</p>
          </div>

          <div className={styles.section} id="s8">
            <span className={styles.sectionNum}>Section 8</span>
            <h2 className={styles.sectionTitle}>Third-party services</h2>
            <p>We use the following third-party services:</p>
            <ul>
              <li><strong>Stripe</strong> — payment processing for Pro subscriptions. Subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
              <li><strong>Apple / Google</strong> — app distribution and in-app purchases. Subject to their respective privacy policies.</li>
              <li><strong>Railway</strong> — cloud infrastructure for the sync backend. Data is stored within Railway's infrastructure.</li>
            </ul>
            <p>We do not sell or share your data with advertisers, data brokers, or any other third parties.</p>
          </div>

          <div className={styles.section} id="s9">
            <span className={styles.sectionNum}>Section 9</span>
            <h2 className={styles.sectionTitle}>Data retention</h2>
            <p>Local data is retained on your device until you delete it or uninstall the app. Cloud sync data is retained while your Pro subscription is active. After cancellation, your cloud data is deleted within 90 days. You can request immediate deletion at any time by contacting us.</p>
          </div>

          <div className={styles.section} id="s10">
            <span className={styles.sectionNum}>Section 10</span>
            <h2 className={styles.sectionTitle}>Your rights</h2>
            <p>Depending on your location, you may have rights under GDPR, CCPA, or other privacy laws including:</p>
            <ul>
              <li>The right to access the data we hold about you</li>
              <li>The right to delete your account and all associated data</li>
              <li>The right to export your data in a portable format</li>
              <li>The right to opt out of analytics</li>
            </ul>
            <p>To exercise any of these rights, contact us at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
          </div>

          <div className={styles.section} id="s11">
            <span className={styles.sectionNum}>Section 11</span>
            <h2 className={styles.sectionTitle}>Children's privacy</h2>
            <p>FileTrail is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>
          </div>

          <div className={styles.section} id="s12">
            <span className={styles.sectionNum}>Section 12</span>
            <h2 className={styles.sectionTitle}>Security</h2>
            <p>We take security seriously. Local documents are protected by your device's security (including biometric lock). Cloud sync data is encrypted end-to-end before leaving your device. Our backend infrastructure is protected with industry-standard security practices. Despite these measures, no system is perfectly secure — we encourage you to use a strong PIN and enable biometric lock.</p>
          </div>

          <div className={styles.section} id="s13">
            <span className={styles.sectionNum}>Section 13</span>
            <h2 className={styles.sectionTitle}>Changes to this policy</h2>
            <p>We may update this policy from time to time. We will notify you of material changes through the app or by email if you have an account. Continued use of the app after changes constitutes acceptance of the updated policy.</p>
          </div>

          <div className={styles.section} id="s14">
            <span className={styles.sectionNum}>Section 14</span>
            <h2 className={styles.sectionTitle}>Contact</h2>
            <p>Questions about this privacy policy? Contact Rushing Technologies at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
          </div>

        </article>
      </div>

      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerBrand}>
            <img src="/icon.png" alt="" className={styles.footerIcon} />
            FileTrail
          </div>
          <div className={styles.footerLinks}>
            <a href="/privacy">Privacy</a>
            <a href="/terms">Terms</a>
            <a href="mailto:support@rushingtechnologies.com">Support</a>
          </div>
          <p className={styles.footerCopy}>© {new Date().getFullYear()} Rushing Technologies. All rights reserved.</p>
        </div>
      </footer>

    </div>
  );
}
