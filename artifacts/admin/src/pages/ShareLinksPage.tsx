import { useEffect, useState } from 'react';
import { getShareLinks, type ShareLinkSummary } from '@/lib/api';
import styles from './ShareLinksPage.module.css';

export default function ShareLinksPage() {
  const [shareLinks, setShareLinks] = useState<ShareLinkSummary[] | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    getShareLinks().then(d => setShareLinks(d.shareLinks)).catch(e => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 className={styles.pageTitle}>Share Links</h1>
      <p className={styles.pageSubtitle}>Share links are created through <code>/v1/share-links</code> and resolved by the public marketing route at <code>/share/[token]</code>.</p>
      {error && <div className={styles.error}>{error}</div>}
      {shareLinks && (
        <div className={styles.docList}>
          <h2 className={styles.sectionTitle}>Share links ({shareLinks.length})</h2>
          <p className={styles.sectionHint}>Active and expired links are shown below.</p>
          {shareLinks.length === 0 && <p className={styles.empty}>No share links created yet.</p>}
          {shareLinks.map((link) => (
            <div key={link.token} className={styles.docRow}>
              <div className={styles.docMeta}>
                <span className={styles.docTitle}>{link.title}</span>
                <span className={styles.docId}>{link.documentId}</span>
              </div>
              <div className={styles.linkMeta}>
                <span className={link.expired ? styles.linkStateExpired : styles.linkStateActive}>{link.expired ? 'Expired' : 'Active'}</span>
                <span className={styles.linkProtect}>{link.passwordProtected ? 'Password' : 'Open'}</span>
                <a href={link.url} className={styles.linkUrl} target="_blank" rel="noreferrer">Open</a>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
