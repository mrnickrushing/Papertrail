import styles from '../legal.module.css';
import supportStyles from './support.module.css';

export default function SupportPage() {
  return (
    <div className={styles.page}>

      {/* Nav */}
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navBrand}>
            <img src="/icon.png" alt="FileTrail" className={styles.navIcon} />
            <span className={styles.navName}>FileTrail</span>
          </a>
          <a href="/" className={styles.navBack}>← Back to home</a>
        </div>
      </nav>

      {/* Hero */}
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>💬 Support</div>
          <h1 className={styles.heroTitle}>How can we help?</h1>
          <p className={styles.heroSubtitle}>
            Find answers to common questions, or get in touch — we usually reply within 24 hours.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className={styles.contentWrap}>

        {/* TOC Sidebar */}
        <nav className={styles.toc}>
          <div className={styles.tocTitle}>On this page</div>
          <ul className={styles.tocList}>
            <li><a href="#getting-started">Getting Started</a></li>
            <li><a href="#managing-documents">Managing Documents</a></li>
            <li><a href="#filetrail-pro">FileTrail Pro</a></li>
            <li><a href="#privacy-security">Privacy &amp; Security</a></li>
            <li><a href="#troubleshooting">Troubleshooting</a></li>
            <li><a href="#contact-us">Contact Us</a></li>
          </ul>
        </nav>

        {/* Main Content */}
        <article className={styles.article}>

          {/* Getting Started */}
          <section className={styles.section} id="getting-started">
            <span className={styles.sectionNum}>Getting Started</span>
            <h2 className={styles.sectionTitle}>Getting Started</h2>
            <div className={supportStyles.faqGroup}>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I scan my first document?</div>
                <div className={supportStyles.answer}>Tap the + button on the home screen, then choose "Scan Document". Point your camera at the document and FileTrail will automatically detect edges and capture it. You can add more pages or finish the scan.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Does FileTrail work offline?</div>
                <div className={supportStyles.answer}>Yes — completely. All your documents are stored on your device. You don't need an internet connection to scan, search, or view documents.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I organise documents into folders?</div>
                <div className={supportStyles.answer}>Tap "Folders" in the bottom navigation, then tap the + icon to create a new folder. You can drag documents into folders or assign them during the scan flow.</div>
              </div>
            </div>
          </section>

          {/* Managing Documents */}
          <section className={styles.section} id="managing-documents">
            <span className={styles.sectionNum}>Managing Documents</span>
            <h2 className={styles.sectionTitle}>Managing Documents</h2>
            <div className={supportStyles.faqGroup}>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I rename a document?</div>
                <div className={supportStyles.answer}>Long-press any document to bring up the context menu, then tap "Rename".</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Can I export documents as PDFs?</div>
                <div className={supportStyles.answer}>Yes. Open any document, tap the share icon in the top right, and choose "Export as PDF". You can share it to Files, email, or any other app.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I delete a document?</div>
                <div className={supportStyles.answer}>Long-press the document and tap "Delete", or swipe left on it in list view.</div>
              </div>
            </div>
          </section>

          {/* FileTrail Pro */}
          <section className={styles.section} id="filetrail-pro">
            <span className={styles.sectionNum}>FileTrail Pro</span>
            <h2 className={styles.sectionTitle}>FileTrail Pro</h2>
            <div className={supportStyles.faqGroup}>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>What's included in FileTrail Pro?</div>
                <div className={supportStyles.answer}>Pro unlocks unlimited documents (free tier is limited to 25), folder organisation, cloud backup, and priority support.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I upgrade to Pro?</div>
                <div className={supportStyles.answer}>Tap the ✦ icon in the top right of the home screen, or go to Settings → FileTrail Pro. You'll see the subscription options there.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Can I restore my Pro purchase on a new device?</div>
                <div className={supportStyles.answer}>Yes — tap "Restore Purchases" on the FileTrail Pro screen. Your subscription is tied to your Apple ID and will be restored automatically.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>How do I cancel my subscription?</div>
                <div className={supportStyles.answer}>Subscriptions are managed through Apple. Go to Settings → [Your Name] → Subscriptions on your iPhone to cancel.</div>
              </div>
            </div>
          </section>

          {/* Privacy & Security */}
          <section className={styles.section} id="privacy-security">
            <span className={styles.sectionNum}>Privacy &amp; Security</span>
            <h2 className={styles.sectionTitle}>Privacy &amp; Security</h2>
            <div className={supportStyles.faqGroup}>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Where are my documents stored?</div>
                <div className={supportStyles.answer}>All documents are stored locally on your device in an encrypted container. They never leave your device unless you explicitly use cloud backup.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Does FileTrail read my documents?</div>
                <div className={supportStyles.answer}>No. FileTrail processes everything on-device. We do not have access to your document contents.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>Is cloud backup secure?</div>
                <div className={supportStyles.answer}>Cloud backup (Pro feature) is end-to-end encrypted. We cannot read your backed-up documents.</div>
              </div>
            </div>
          </section>

          {/* Troubleshooting */}
          <section className={styles.section} id="troubleshooting">
            <span className={styles.sectionNum}>Troubleshooting</span>
            <h2 className={styles.sectionTitle}>Troubleshooting</h2>
            <div className={supportStyles.faqGroup}>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>The app crashed — what do I do?</div>
                <div className={supportStyles.answer}>Force-close the app and reopen it. If crashes persist, try restarting your device. If the issue continues, contact us with your device model and iOS version.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>My scan looks blurry.</div>
                <div className={supportStyles.answer}>Make sure the surface is well-lit and hold your phone steady. FileTrail works best with flat documents on a contrasting background. Avoid scanning in low light.</div>
              </div>
              <div className={supportStyles.faqItem}>
                <div className={supportStyles.question}>I can't find a document I scanned.</div>
                <div className={supportStyles.answer}>Try using the search bar at the top of the home screen — FileTrail searches document names and content. Also check if it was moved to a folder.</div>
              </div>
            </div>
          </section>

          {/* Contact Us */}
          <section className={styles.section} id="contact-us">
            <span className={styles.sectionNum}>Contact Us</span>
            <h2 className={styles.sectionTitle}>Contact Us</h2>
            <div className={supportStyles.contactCard}>
              <div className={supportStyles.contactTitle}>Still need help?</div>
              <p className={supportStyles.contactText}>
                Can't find the answer you're looking for? We're here to help. Send us an email and we'll get back to you within 24 hours.
              </p>
              <a href="mailto:support@rushingtechnologies.com" className={supportStyles.contactBtn}>
                Email Support →
              </a>
              <p className={supportStyles.contactNote}>For bug reports, please include your device model and iOS version.</p>
            </div>
          </section>

        </article>
      </div>

      {/* Footer */}
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
          <p className={styles.footerCopy}>© {new Date().getFullYear()} FileTrail. Your documents, your device.</p>
        </div>
      </footer>

    </div>
  );
}
