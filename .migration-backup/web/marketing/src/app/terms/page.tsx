import styles from '../legal.module.css';

export const metadata = {
  title: 'Terms of Service — FileTrail',
  description: 'Terms governing your use of FileTrail.',
};

const TOC = [
  { id: 's1',  label: '1. Acceptance of terms' },
  { id: 's2',  label: '2. Description of service' },
  { id: 's3',  label: '3. Your account' },
  { id: 's4',  label: '4. Pro subscription' },
  { id: 's5',  label: '5. Acceptable use' },
  { id: 's6',  label: '6. Your content' },
  { id: 's7',  label: '7. Intellectual property' },
  { id: 's8',  label: '8. Disclaimer of warranties' },
  { id: 's9',  label: '9. Limitation of liability' },
  { id: 's10', label: '10. Indemnification' },
  { id: 's11', label: '11. Termination' },
  { id: 's12', label: '12. Changes to terms' },
  { id: 's13', label: '13. Governing law' },
  { id: 's14', label: '14. Severability' },
  { id: 's15', label: '15. Contact' },
];

export default function TermsOfService() {
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
          <div className={styles.heroBadge}>📋 Legal</div>
          <h1 className={styles.heroTitle}>Terms of Service</h1>
          <p className={styles.heroSubtitle}>
            These terms govern your use of FileTrail, developed and operated by
            Rushing Technologies. By using FileTrail, you agree to these terms.
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
            By installing or using FileTrail you agree to be bound by these Terms of Service
            and our <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use the app.
          </p>

          <div className={styles.section} id="s1">
            <span className={styles.sectionNum}>Section 1</span>
            <h2 className={styles.sectionTitle}>Acceptance of terms</h2>
            <p>By installing or using FileTrail ("the App"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the App.</p>
          </div>

          <div className={styles.section} id="s2">
            <span className={styles.sectionNum}>Section 2</span>
            <h2 className={styles.sectionTitle}>Description of service</h2>
            <p>FileTrail is a document management application that allows you to scan, organise, search, and store documents on your device. A free tier is available with local storage. A Pro subscription tier provides additional features including cloud sync, AI features, and sharing.</p>
          </div>

          <div className={styles.section} id="s3">
            <span className={styles.sectionNum}>Section 3</span>
            <h2 className={styles.sectionTitle}>Your account</h2>
            <p>The free tier requires no account. If you subscribe to Pro, you will create an account with an email address and password. You are responsible for:</p>
            <ul>
              <li>Maintaining the confidentiality of your credentials</li>
              <li>All activity that occurs under your account</li>
              <li>Notifying us immediately of any unauthorised use at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a></li>
            </ul>
          </div>

          <div className={styles.section} id="s4">
            <span className={styles.sectionNum}>Section 4</span>
            <h2 className={styles.sectionTitle}>Pro subscription</h2>
            <p>Pro is a recurring subscription billed at $5.99 per month (or the equivalent in your local currency). By subscribing, you authorise us to charge your payment method on a recurring basis.</p>
            <ul>
              <li><strong>Free trial:</strong> New Pro subscribers receive a 7-day free trial. You will not be charged until the trial ends.</li>
              <li><strong>Cancellation:</strong> You may cancel at any time. Your Pro access continues until the end of the current billing period. No refunds are issued for partial months.</li>
              <li><strong>Price changes:</strong> We may change the Pro price with 30 days' notice. Continued use after the notice period constitutes acceptance.</li>
              <li><strong>Refunds:</strong> Refund requests are handled on a case-by-case basis. Contact <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a> within 14 days of a charge to request a refund.</li>
            </ul>
          </div>

          <div className={styles.section} id="s5">
            <span className={styles.sectionNum}>Section 5</span>
            <h2 className={styles.sectionTitle}>Acceptable use</h2>
            <p>You agree not to use FileTrail to:</p>
            <ul>
              <li>Store or distribute illegal content, including child sexual abuse material</li>
              <li>Violate any applicable laws or regulations</li>
              <li>Infringe the intellectual property rights of others</li>
              <li>Attempt to reverse engineer, decompile, or extract source code from the App</li>
              <li>Use the App to harass, threaten, or harm others</li>
              <li>Attempt to gain unauthorised access to our systems or other users' data</li>
              <li>Use automated tools to scrape or overload our services</li>
            </ul>
          </div>

          <div className={styles.section} id="s6">
            <span className={styles.sectionNum}>Section 6</span>
            <h2 className={styles.sectionTitle}>Your content</h2>
            <p>You retain full ownership of all documents and data you store in FileTrail. By using cloud sync, you grant us a limited, non-exclusive licence to store and transmit your encrypted content solely for the purpose of providing the sync service. We claim no ownership over your documents.</p>
            <p>You are solely responsible for ensuring you have the right to store and use any documents you add to FileTrail.</p>
          </div>

          <div className={styles.section} id="s7">
            <span className={styles.sectionNum}>Section 7</span>
            <h2 className={styles.sectionTitle}>Intellectual property</h2>
            <p>FileTrail and all associated software, design, and branding are owned by Rushing Technologies and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.</p>
          </div>

          <div className={styles.section} id="s8">
            <span className={styles.sectionNum}>Section 8</span>
            <h2 className={styles.sectionTitle}>Disclaimer of warranties</h2>
            <p>FileTrail is provided "as is" without warranties of any kind, express or implied. We do not warrant that the App will be error-free, uninterrupted, or that your data will never be lost. <strong>You are responsible for maintaining your own backups of important documents.</strong></p>
          </div>

          <div className={styles.section} id="s9">
            <span className={styles.sectionNum}>Section 9</span>
            <h2 className={styles.sectionTitle}>Limitation of liability</h2>
            <p>To the maximum extent permitted by law, Rushing Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, arising from your use of FileTrail. Our total liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>
          </div>

          <div className={styles.section} id="s10">
            <span className={styles.sectionNum}>Section 10</span>
            <h2 className={styles.sectionTitle}>Indemnification</h2>
            <p>You agree to indemnify and hold Rushing Technologies harmless from any claims, losses, or damages arising from your use of the App, your violation of these Terms, or your violation of any third-party rights.</p>
          </div>

          <div className={styles.section} id="s11">
            <span className={styles.sectionNum}>Section 11</span>
            <h2 className={styles.sectionTitle}>Termination</h2>
            <p>We may suspend or terminate your account if you violate these Terms. You may terminate your account at any time by deleting the App and contacting us to delete your cloud data. Upon termination, your right to use the App ceases immediately.</p>
          </div>

          <div className={styles.section} id="s12">
            <span className={styles.sectionNum}>Section 12</span>
            <h2 className={styles.sectionTitle}>Changes to terms</h2>
            <p>We may update these Terms from time to time. Material changes will be communicated through the App or by email. Continued use after changes take effect constitutes acceptance. If you do not agree to updated Terms, stop using the App and cancel your subscription.</p>
          </div>

          <div className={styles.section} id="s13">
            <span className={styles.sectionNum}>Section 13</span>
            <h2 className={styles.sectionTitle}>Governing law</h2>
            <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware, and you consent to personal jurisdiction there.</p>
          </div>

          <div className={styles.section} id="s14">
            <span className={styles.sectionNum}>Section 14</span>
            <h2 className={styles.sectionTitle}>Severability</h2>
            <p>If any provision of these Terms is found unenforceable, the remaining provisions will continue in full force and effect.</p>
          </div>

          <div className={styles.section} id="s15">
            <span className={styles.sectionNum}>Section 15</span>
            <h2 className={styles.sectionTitle}>Contact</h2>
            <p>For questions about these Terms, contact Rushing Technologies at <a href="mailto:support@rushingtechnologies.com">support@rushingtechnologies.com</a>.</p>
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
