import { useEffect, useState } from 'react';
import { getHealth, getConfig, getSyncStats, type HealthResponse, type ConfigResponse, type SyncPullResponse } from '@/lib/api';
import styles from './OverviewPage.module.css';

export default function OverviewPage() {
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [config, setConfig] = useState<ConfigResponse | null>(null);
  const [sync, setSync] = useState<SyncPullResponse | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    Promise.all([getHealth(), getConfig(), getSyncStats()])
      .then(([h, c, s]) => { setHealth(h); setConfig(c); setSync(s); })
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 className={styles.pageTitle}>Overview</h1>
      <p className={styles.pageSubtitle}>Live status from the FileTrail backend</p>
      {error && <div className={styles.errorBanner}><strong>Backend unreachable:</strong> {error}</div>}
      <div className={styles.cardGrid}>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Backend status</div>
          <div className={`${styles.cardValue} ${health ? (health.ok ? styles.success : styles.danger) : ''}`}>
            {health ? (health.ok ? '● Online' : '● Error') : '○ Offline'}
          </div>
          {health?.time && <div className={styles.cardMeta}>{new Date(health.time).toLocaleString()}</div>}
        </div>
        <div className={styles.card}>
          <div className={styles.cardLabel}>Sync version</div>
          <div className={styles.cardValue}>{sync?.syncVersion ?? '—'}</div>
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
