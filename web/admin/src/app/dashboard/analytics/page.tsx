import { apiFetch } from '@/lib/api';
import type { AnalyticsEvent } from '@/lib/api';
import styles from './analytics.module.css';

export const revalidate = 0;

async function fetchAnalytics() {
  try {
    const data = await apiFetch<{ notifications: AnalyticsEvent[] }>('/v1/analytics/events');
    return { events: data.notifications ?? [], error: '' };
  } catch (e) {
    // analytics endpoint may not exist in the base JSON store — fallback
    return { events: [], error: String(e) };
  }
}

export default async function AnalyticsPage() {
  const { events, error } = await fetchAnalytics();

  return (
    <div>
      <h1 className={styles.pageTitle}>Analytics</h1>
      <p className={styles.pageSubtitle}>Events sent from the mobile app via <code>/v1/analytics/events</code></p>

      {error && <div className={styles.error}>{error}</div>}

      {events.length === 0 && !error && (
        <div className={styles.empty}>No analytics events recorded yet.</div>
      )}

      {events.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Event</th>
                <th>Device ID</th>
                <th>User ID</th>
                <th>Time</th>
              </tr>
            </thead>
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
