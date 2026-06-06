import { useEffect, useState } from 'react';
import { getUsers, type UserRecord } from '@/lib/api';
import styles from './UsersPage.module.css';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [error, setError] = useState('');

  useEffect(() => {
    getUsers().then(d => setUsers(d.users ?? [])).catch(e => setError(String(e)));
  }, []);

  return (
    <div>
      <h1 className={styles.pageTitle}>Users</h1>
      <p className={styles.pageSubtitle}>Registered accounts from the mobile app</p>
      {error && <div className={styles.error}>{error}</div>}
      {!error && users.length === 0 && <div className={styles.empty}>No registered users yet.</div>}
      {users.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead><tr><th>Name</th><th>Email</th><th>Provider</th><th>Plan</th><th>Joined</th></tr></thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td className={styles.mono}>{u.email}</td>
                  <td>{u.provider}</td>
                  <td>{u.isPro ? <span className={styles.proBadge}>Pro</span> : <span className={styles.freeBadge}>Free</span>}</td>
                  <td className={styles.time}>{new Date(u.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
