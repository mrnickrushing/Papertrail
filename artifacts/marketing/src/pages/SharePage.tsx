import { useEffect, useState } from 'react';
import { useParams, useSearch } from 'wouter';
import styles from '@/styles/share.module.css';

type ShareLinkResponse = {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
  url: string;
};

export default function SharePage() {
  const { token } = useParams<{ token: string }>();
  const search = useSearch();
  const password = new URLSearchParams(search).get('password') ?? '';

  const [record, setRecord] = useState<ShareLinkResponse | null>(null);
  const [status, setStatus] = useState<number | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!token) return;
    const url = new URL(`/api/v1/share-links/${token}`, window.location.origin);
    if (password) url.searchParams.set('password', password);
    fetch(url.toString())
      .then(async (res) => {
        setStatus(res.status);
        const data = await res.json().catch(() => ({}));
        if (res.ok) {
          setRecord(data as ShareLinkResponse);
        } else {
          setError((data as { error?: string }).error ?? 'Could not load this share link.');
        }
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, [token, password]);

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <a href="/" className={styles.navBrand}>
            <img src={`${import.meta.env.BASE_URL}icon.png`} alt="FileTrail" className={styles.navIcon} />
            <span className={styles.navName}>FileTrail</span>
          </a>
          <a href="/" className={styles.navBack}>← Home</a>
        </div>
      </nav>
      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>Secure Share Link</div>
          <h1 className={styles.heroTitle}>
            {loading ? 'Loading…' : record ? record.title : 'Share link unavailable'}
          </h1>
          <p className={styles.heroSubtitle}>
            {loading ? '' : record
              ? 'This link is being served through the FileTrail backend and can be time-limited or password protected.'
              : error}
          </p>
        </div>
      </section>
      <main className={styles.contentWrap}>
        {loading ? null : record ? (
          <div className={styles.card}>
            <div className={styles.row}><span className={styles.label}>Document</span><span className={styles.value}>{record.title}</span></div>
            <div className={styles.row}><span className={styles.label}>Link token</span><span className={styles.mono}>{record.token}</span></div>
            <div className={styles.row}><span className={styles.label}>Expires</span><span className={styles.value}>{new Date(record.expiresAt).toLocaleString()}</span></div>
            <div className={styles.row}><span className={styles.label}>Access</span><span className={styles.value}>{record.passwordProtected ? 'Password protected' : 'Open link'}</span></div>
            <p className={styles.note}>Document delivery stays device-local in the current FileTrail architecture. This public route exposes the share-link record itself rather than a downloadable file blob.</p>
          </div>
        ) : (
          <div className={styles.card}>
            {(status === 401 || status === 403) ? (
              <>
                <p className={styles.note}>This share link requires a password.</p>
                <form method="get" className={styles.form}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <input id="password" name="password" type="password" className={styles.input} minLength={8} required />
                  <button type="submit" className={styles.button}>Open Link</button>
                </form>
              </>
            ) : (
              <p className={styles.note}>{error || 'Share link not found.'}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
