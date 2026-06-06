import Link from 'next/link';
import styles from './share-page.module.css';

type ShareLinkResponse = {
  token: string;
  documentId: string;
  title: string;
  expiresAt: string;
  passwordProtected: boolean;
  createdAt: string;
  url: string;
};

type SharePageProps = {
  params: Promise<{ token: string }>;
  searchParams?: Promise<{ password?: string }>;
};

async function fetchShareLink(token: string, password?: string) {
  const backendUrl = process.env.BACKEND_URL?.trim() || 'http://localhost:4000';
  const apiKey = process.env.BACKEND_API_KEY?.trim();
  const url = new URL(`/v1/share-links/${token}`, backendUrl);
  if (password) {
    url.searchParams.set('password', password);
  }

  const res = await fetch(url, {
    cache: 'no-store',
    headers: apiKey ? { Authorization: `Bearer ${apiKey}` } : undefined,
  });

  const text = await res.text();
  let data: unknown = null;
  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = text;
    }
  }

  return { status: res.status, data };
}

export default async function ShareLinkPage({ params, searchParams }: SharePageProps) {
  const { token } = await params;
  const resolvedSearch = searchParams ? await searchParams : {};
  const password = resolvedSearch.password?.trim();
  const { status, data } = await fetchShareLink(token, password);
  const error = typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
    ? data.error
    : 'Could not load this share link.';
  const record = status === 200 ? data as ShareLinkResponse : null;

  return (
    <div className={styles.page}>
      <nav className={styles.nav}>
        <div className={styles.navInner}>
          <Link href="/" className={styles.navBrand}>
            <img src="/icon.png" alt="FileTrail" className={styles.navIcon} />
            <span className={styles.navName}>FileTrail</span>
          </Link>
          <Link href="/" className={styles.navBack}>← Home</Link>
        </div>
      </nav>

      <section className={styles.hero}>
        <div className={styles.heroGlow} />
        <div className={styles.heroInner}>
          <div className={styles.heroBadge}>Secure Share Link</div>
          <h1 className={styles.heroTitle}>
            {record ? record.title : 'Share link unavailable'}
          </h1>
          <p className={styles.heroSubtitle}>
            {record
              ? 'This link is being served through the FileTrail backend and can be time-limited or password protected.'
              : error}
          </p>
        </div>
      </section>

      <main className={styles.contentWrap}>
        {record ? (
          <div className={styles.card}>
            <div className={styles.row}>
              <span className={styles.label}>Document</span>
              <span className={styles.value}>{record.title}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Link token</span>
              <span className={styles.mono}>{record.token}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Expires</span>
              <span className={styles.value}>{new Date(record.expiresAt).toLocaleString()}</span>
            </div>
            <div className={styles.row}>
              <span className={styles.label}>Access</span>
              <span className={styles.value}>{record.passwordProtected ? 'Password protected' : 'Open link'}</span>
            </div>
            <p className={styles.note}>
              Document delivery stays device-local in the current FileTrail architecture, so this public route exposes
              the share-link record itself rather than a downloadable file blob.
            </p>
          </div>
        ) : (
          <div className={styles.card}>
            {(status === 401 || status === 403) ? (
              <>
                <p className={styles.note}>
                  This share link requires a password.
                </p>
                <form method="get" className={styles.form}>
                  <label htmlFor="password" className={styles.label}>Password</label>
                  <input
                    id="password"
                    name="password"
                    type="password"
                    className={styles.input}
                    minLength={8}
                    required
                  />
                  <button type="submit" className={styles.button}>Open Link</button>
                </form>
              </>
            ) : (
              <p className={styles.note}>{error}</p>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
