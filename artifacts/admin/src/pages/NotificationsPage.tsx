import { useState } from 'react';
import { broadcastNotification } from '@/lib/api';
import styles from './NotificationsPage.module.css';

type Audience = 'all' | 'pro' | 'free';

export default function NotificationsPage() {
  const [title, setTitle] = useState('');
  const [body, setBody] = useState('');
  const [audience, setAudience] = useState<Audience>('all');
  const [status, setStatus] = useState<{ ok: boolean; message: string } | null>(null);
  const [loading, setLoading] = useState(false);

  async function send() {
    if (!title.trim() || !body.trim()) return;
    setLoading(true);
    setStatus(null);
    try {
      const filter = audience === 'pro' ? { isPro: true } : audience === 'free' ? { isPro: false } : undefined;
      const data = await broadcastNotification(title, body, filter);
      setStatus({ ok: true, message: `Sent to ${data.recipientCount} user${data.recipientCount === 1 ? '' : 's'} (ID: ${data.notificationId})` });
      setTitle('');
      setBody('');
    } catch (e) {
      setStatus({ ok: false, message: String(e) });
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <h1 className={styles.pageTitle}>Notifications</h1>
      <p className={styles.pageSubtitle}>Broadcast push notifications to app users</p>
      <div className={styles.form}>
        <div className={styles.field}>
          <label className={styles.label}>Audience</label>
          <div className={styles.audienceRow}>
            {(['all', 'pro', 'free'] as Audience[]).map(a => (
              <button key={a} onClick={() => setAudience(a)} className={`${styles.audienceBtn} ${audience === a ? styles.audienceBtnActive : ''}`}>
                {a === 'all' ? 'All users' : a === 'pro' ? 'Pro only' : 'Free only'}
              </button>
            ))}
          </div>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Title</label>
          <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Notification title" maxLength={80} />
          <span className={styles.charCount}>{title.length}/80</span>
        </div>
        <div className={styles.field}>
          <label className={styles.label}>Body</label>
          <textarea value={body} onChange={e => setBody(e.target.value)} placeholder="Notification body text" rows={4} maxLength={256} />
          <span className={styles.charCount}>{body.length}/256</span>
        </div>
        {status && <div className={`${styles.status} ${status.ok ? styles.statusOk : styles.statusErr}`}>{status.message}</div>}
        <button onClick={send} disabled={loading || !title.trim() || !body.trim()} className={styles.sendBtn}>
          {loading ? 'Sending…' : 'Send notification'}
        </button>
      </div>
      <div className={styles.note}>
        <strong>Note:</strong> Notifications are logged to the backend. To actually deliver push notifications, wire up Expo push tokens per user and call the Expo push API.
      </div>
    </div>
  );
}
