import styles from '../legal.module.css';

export const metadata = {
  title: 'Terms of Service — PaperTrail',
  description: 'Terms governing your use of PaperTrail.',
};

export default function TermsOfService() {
  return (
    <div className={styles.page}>
      <div className={styles.inner}>
        <a href="/" className={styles.back}>← Back to PaperTrail</a>
        <h1 className={styles.title}>Terms of Service</h1>
        <p className={styles.updated}>Last updated: June 3, 2026</p>

        <p className={styles.intro}>
          These Terms of Service govern your use of PaperTrail, developed and operated by Rushing Technologies. By downloading or using PaperTrail, you agree to these terms.
        </p>

        <h2>1. Acceptance of terms</h2>
        <p>By installing or using PaperTrail ("the App"), you agree to be bound by these Terms of Service and our Privacy Policy. If you do not agree, do not use the App.</p>

        <h2>2. Description of service</h2>
        <p>PaperTrail is a document management application that allows you to scan, organise, search, and store documents on your device. A free tier is available with local storage. A Pro subscription tier provides additional features including cloud sync, AI features, and sharing.</p>

        <h2>3. Your account</h2>
        <p>The free tier requires no account. If you subscribe to Pro, you will create an account with an email address and password. You are responsible for:</p>
        <ul>
          <li>Maintaining the confidentiality of your credentials</li>
          <li>All activity that occurs under your account</li>
          <li>Notifying us immediately of any unauthorised use at <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a></li>
        </ul>

        <h2>4. Pro subscription</h2>
        <p>Pro is a recurring subscription billed at $5.99 per month (or the equivalent in your local currency). By subscribing, you authorise us to charge your payment method on a recurring basis.</p>
        <ul>
          <li><strong>Free trial:</strong> New Pro subscribers receive a 7-day free trial. You will not be charged until the trial ends.</li>
          <li><strong>Cancellation:</strong> You may cancel at any time. Your Pro access continues until the end of the current billing period. No refunds are issued for partial months.</li>
          <li><strong>Price changes:</strong> We may change the Pro price with 30 days' notice. Continued use after the notice period constitutes acceptance.</li>
          <li><strong>Refunds:</strong> Refund requests are handled on a case-by-case basis. Contact <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a> within 14 days of a charge to request a refund.</li>
        </ul>

        <h2>5. Acceptable use</h2>
        <p>You agree not to use PaperTrail to:</p>
        <ul>
          <li>Store or distribute illegal content, including child sexual abuse material</li>
          <li>Violate any applicable laws or regulations</li>
          <li>Infringe the intellectual property rights of others</li>
          <li>Attempt to reverse engineer, decompile, or extract source code from the App</li>
          <li>Use the App to harass, threaten, or harm others</li>
          <li>Attempt to gain unauthorised access to our systems or other users' data</li>
          <li>Use automated tools to scrape or overload our services</li>
        </ul>

        <h2>6. Your content</h2>
        <p>You retain full ownership of all documents and data you store in PaperTrail. By using cloud sync, you grant us a limited, non-exclusive licence to store and transmit your encrypted content solely for the purpose of providing the sync service. We claim no ownership over your documents.</p>
        <p>You are solely responsible for ensuring you have the right to store and use any documents you add to PaperTrail.</p>

        <h2>7. Intellectual property</h2>
        <p>PaperTrail and all associated software, design, and branding are owned by Rushing Technologies and protected by intellectual property laws. You may not copy, modify, distribute, or create derivative works without our written permission.</p>

        <h2>8. Disclaimer of warranties</h2>
        <p>PaperTrail is provided "as is" without warranties of any kind, express or implied. We do not warrant that the App will be error-free, uninterrupted, or that your data will never be lost. <strong>You are responsible for maintaining your own backups of important documents.</strong></p>

        <h2>9. Limitation of liability</h2>
        <p>To the maximum extent permitted by law, Rushing Technologies shall not be liable for any indirect, incidental, special, consequential, or punitive damages, including loss of data, arising from your use of PaperTrail. Our total liability to you for any claim shall not exceed the amount you paid us in the 12 months preceding the claim.</p>

        <h2>10. Indemnification</h2>
        <p>You agree to indemnify and hold Rushing Technologies harmless from any claims, losses, or damages arising from your use of the App, your violation of these Terms, or your violation of any third-party rights.</p>

        <h2>11. Termination</h2>
        <p>We may suspend or terminate your account if you violate these Terms. You may terminate your account at any time by deleting the App and contacting us to delete your cloud data. Upon termination, your right to use the App ceases immediately.</p>

        <h2>12. Changes to terms</h2>
        <p>We may update these Terms from time to time. Material changes will be communicated through the App or by email. Continued use after changes take effect constitutes acceptance. If you do not agree to updated Terms, stop using the App and cancel your subscription.</p>

        <h2>13. Governing law</h2>
        <p>These Terms are governed by the laws of the State of Delaware, United States, without regard to conflict of law principles. Any disputes shall be resolved in the courts of Delaware, and you consent to personal jurisdiction there.</p>

        <h2>14. Severability</h2>
        <p>If any provision of these Terms is found unenforceable, the remaining provisions will continue in full force and effect.</p>

        <h2>15. Contact</h2>
        <p>For questions about these Terms, contact Rushing Technologies at <a href="mailto:admin@rushingtechnologies.com">admin@rushingtechnologies.com</a>.</p>
      </div>
    </div>
  );
}
