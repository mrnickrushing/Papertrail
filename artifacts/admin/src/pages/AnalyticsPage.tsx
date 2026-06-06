import { useEffect, useState } from 'react';
import { getAnalytics, type AnalyticsEvent } from '@/lib/api';
import styles from './AnalyticsPage.module.css';

export default function AnalyticsPage() {
  const [events, setEvents] = useState<AnalyticsEvent[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getAnalytics()
      .then(d => setEvents(d.events ?? []))
      .catch(e => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 className={styles.pageTitle}>Analytics</h1>
      <p className={styles.pageSubtitle}>Events sent from the mobile app via <code>/v1/analytics/events</code></p>
      {error && <div className={styles.error}>{error}</div>}
      {!error && events.length === 0 && <div className={styles.empty}>No analytics events recorded yet.</div>}
      {events.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Event</th><th>Device ID</th><th>User ID</th><th>Time</th></tr></thead>
            <tbody>
              {events.map((e) => (
                <tr key={e.id}>
                  <td><code>{e.event}</code></td>
                  <td className={styles.mono}>{e.deviceId ?? '—'}</td>
                  <td className={styles.mono}>{e.userId ?? '—'}</td>
                  <td className={styles.time}>{new Date(e.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
