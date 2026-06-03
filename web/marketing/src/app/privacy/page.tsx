import styles from '../legal.module.css';

export const metadata = {
  title: 'Privacy Policy — PaperTrail',
  description: 'How PaperTrail handles your data.',
};

export default function PrivacyPolicy() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>← Back to PaperTrail</a>
        <h1 className={styles.title}>Privacy Policy</h1>
        <p className={styles.updated}>Last updated: June 3, 2026</p>

        <p className={styles.intro}>
          PaperTrail is built on a simple principle: your documents belong to you. This policy explains exactly what data we collect, what we don't, and how we protect your privacy.
        </p>

        <h2>The short version</h2>
        <p>PaperTrail stores your documents <strong>on your device</strong>. We do not collect, read, or sell your documents. If you don't enable cloud sync, your data never leaves your phone. Full stop.</p>

        <h2>1. Who we are</h2>
        <p>PaperTrail is developed and operated by Rushing Technologies. For privacy-related questions, contact us at <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a>.</p>

        <h2>2. Data stored locally on your device</h2>
        <p>The following is stored exclusively on your device and never transmitted to our servers unless you explicitly enable cloud sync:</p>
        <ul>
          <li>Document files (images, PDFs)</li>
          <li>Document metadata (title, category, tags, dates)</li>
          <li>OCR-extracted text</li>
          <li>Folders and organisational structure</li>
          <li>App settings and preferences</li>
        </ul>

        <h2>3. Data we collect (Free tier)</h2>
        <p>On the free tier with no account, we collect <strong>nothing</strong>. The app functions entirely offline with no data transmitted to us.</p>
        <p>If you use features that require a network connection (such as AI suggestions), we may receive the minimum data necessary to perform that specific function. We do not retain this data beyond the duration of the request.</p>

        <h2>4. Data we collect (Pro tier with cloud sync)</h2>
        <p>When you enable Pro cloud sync, we store the following on our servers in encrypted form:</p>
        <ul>
          <li><strong>Account credentials</strong> — email address and a hashed password. We never store passwords in plain text.</li>
          <li><strong>Encrypted document data</strong> — your documents are encrypted on your device before upload. We cannot read the contents of your documents.</li>
          <li><strong>Sync metadata</strong> — timestamps and sync version numbers required to keep your devices in sync.</li>
          <li><strong>Billing information</strong> — handled entirely by our payment processor (Stripe). We never see or store your full card details.</li>
        </ul>

        <h2>5. Analytics</h2>
        <p>We collect anonymised, aggregated analytics to understand how the app is used — for example, which features are most popular. These events contain no personally identifiable information and no document content. You can opt out of analytics in the app's Settings screen at any time.</p>
        <p>Analytics data we may collect includes: app opened, feature used, error type. We do not track your location, contacts, or any data outside the app.</p>

        <h2>6. Push notifications</h2>
        <p>If you enable notifications, your device's push token is stored on our servers solely to deliver notifications you have requested (such as backup reminders). You can revoke notification permission at any time through your device settings.</p>

        <h2>7. Cookies and tracking</h2>
        <p>The PaperTrail mobile app does not use cookies. This website uses no third-party tracking scripts. We do not use Google Analytics, Facebook Pixel, or any advertising trackers.</p>

        <h2>8. Third-party services</h2>
        <p>We use the following third-party services:</p>
        <ul>
          <li><strong>Stripe</strong> — payment processing for Pro subscriptions. Subject to <a href="https://stripe.com/privacy" target="_blank" rel="noopener noreferrer">Stripe's Privacy Policy</a>.</li>
          <li><strong>Apple / Google</strong> — app distribution and in-app purchases. Subject to their respective privacy policies.</li>
          <li><strong>Railway</strong> — cloud infrastructure for the sync backend. Data is stored within Railway's infrastructure.</li>
        </ul>
        <p>We do not sell or share your data with advertisers, data brokers, or any other third parties.</p>

        <h2>9. Data retention</h2>
        <p>Local data is retained on your device until you delete it or uninstall the app. Cloud sync data is retained while your Pro subscription is active. After cancellation, your cloud data is deleted within 90 days. You can request immediate deletion at any time by contacting us.</p>

        <h2>10. Your rights</h2>
        <p>Depending on your location, you may have rights under GDPR, CCPA, or other privacy laws including:</p>
        <ul>
          <li>The right to access the data we hold about you</li>
          <li>The right to delete your account and all associated data</li>
          <li>The right to export your data in a portable format</li>
          <li>The right to opt out of analytics</li>
        </ul>
        <p>To exercise any of these rights, contact us at <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a>.</p>

        <h2>11. Children's privacy</h2>
        <p>PaperTrail is not directed at children under 13. We do not knowingly collect personal information from children. If you believe a child has provided us with personal information, please contact us and we will delete it promptly.</p>

        <h2>12. Security</h2>
        <p>We take security seriously. Local documents are protected by your device's security (including biometric lock). Cloud sync data is encrypted end-to-end before leaving your device. Our backend infrastructure is protected with industry-standard security practices. Despite these measures, no system is perfectly secure — we encourage you to use a strong PIN and enable biometric lock.</p>

        <h2>13. Changes to this policy</h2>
        <p>We may update this policy from time to time. We will notify you of material changes through the app or by email if you have an account. Continued use of the app after changes constitutes acceptance of the updated policy.</p>

        <h2>14. Contact</h2>
        <p>Questions about this privacy policy? Contact Rushing Technologies at <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a>.</p>
      </div>
    </div>
  );
}
