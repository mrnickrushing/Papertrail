import { getHealth, getConfig, getSyncStats } from '@/lib/api';
import styles from './overview.module.css';

async function fetchDashboardData() {
  try {
    const [health, config, sync] = await Promise.all([
      getHealth(),
      getConfig(),
      getSyncStats(),
    ]);
    return { health, config, sync, error: null };
  } catch (e) {
    return { health: null, config: null, sync: null, error: String(e) };
  }
}

export default async function OverviewPage() {
  const { health, config, sync, error } = await fetchDashboardData();

  return (
    <div>
      <h1 className={styles.pageTitle}>Overview</h1>
      <p className={styles.pageSubtitle}>Live status from the PaperTrail backend</p>

      {error && (
        <div className={styles.errorBanner}>
          <strong>Backend unreachable:</strong> {error}
        </div>
      )}

      {/* Status cards */}
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Backend status</div>
          <div className={`${styles.cardValue} ${health?.ok ? styles.success : styles.danger}`}>
            {health ? (health.ok ? '● Online' : '● Error') : '○ Offline'}
          </div>
          {health?.time && <div className={styles.cardMeta}>{new Date(health.time).toLocaleString()}</div>}
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Sync version</div>
          <div className={styles.cardValue}>{sync?.syncVersion ?? '—'}</div>
          {sync?.serverTime && <div className={styles.cardMeta}>{new Date(sync.serverTime).toLocaleString()}</div>}
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Documents synced</div>
          <div className={styles.cardValue}>{sync?.documents?.length ?? '—'}</div>
        </div>

        <div className={styles.card}>
          <div className={styles.cardLabel}>Folders synced</div>
          <div className={styles.cardValue}>{sync?.folders?.length ?? '—'}</div>
        </div>
      </div>

      {/* Integrations */}
      {config && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Integrations</h2>
          <div className={styles.badgeGrid}>
            {Object.entries(config.integrations).map(([key, enabled]) => (
              <div key={key} className={`${styles.integBadge} ${enabled ? styles.integOn : styles.integOff}`}>
                <span>{enabled ? '✓' : '○'}</span> {key}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feature flags */}
      {config && (
        <section className={styles.section}>
          <h2 className={styles.sectionTitle}>Feature flags</h2>
          <div className={styles.badgeGrid}>
            {Object.entries(config.features).map(([key, enabled]) => (
              <div key={key} className={`${styles.integBadge} ${enabled ? styles.integOn : styles.integOff}`}>
                <span>{enabled ? '✓' : '○'}</span> {key}
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
