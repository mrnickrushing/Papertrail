import { getSyncStats } from '@/lib/api';
import styles from './sync.module.css';

export const revalidate = 0;

export default async function SyncPage() {
  let data: Awaited<ReturnType<typeof getSyncStats>> | null = null;
  let error = '';
  try {
    data = await getSyncStats();
  } catch (e) {
    error = String(e);
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Sync Data</h1>
      <p className={styles.pageSubtitle}>All documents and folders currently on the backend</p>

      {error && <div className={styles.error}>{error}</div>}

      {data && (
        <>
          <div className={styles.statsRow}>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Sync version</div>
              <div className={styles.statValue}>{data.syncVersion}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Documents</div>
              <div className={styles.statValue}>{data.documents.length}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Folders</div>
              <div className={styles.statValue}>{data.folders.length}</div>
            </div>
            <div className={styles.stat}>
              <div className={styles.statLabel}>Tombstones</div>
              <div className={styles.statValue}>{data.tombstones.length}</div>
            </div>
          </div>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Documents ({data.documents.length})</h2>
            <pre className={styles.json}>{JSON.stringify(data.documents, null, 2)}</pre>
          </section>

          <section className={styles.section}>
            <h2 className={styles.sectionTitle}>Folders ({data.folders.length})</h2>
            <pre className={styles.json}>{JSON.stringify(data.folders, null, 2)}</pre>
          </section>
        </>
      )}
    </div>
  );
}
