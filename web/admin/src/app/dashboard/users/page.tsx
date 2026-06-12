import { revalidatePath } from 'next/cache';
import { getUsers, deleteUser, type UserRecord } from '@/lib/api';
import { DeleteUserButton } from './DeleteUserButton';
import styles from './users.module.css';

export const revalidate = 0;

async function fetchUsers() {
  try {
    const data = await getUsers();
    return { users: data.users ?? [], error: '' };
  } catch (e) {
    return { users: [], error: String(e) };
  }
}

async function handleDelete(id: string) {
  'use server';
  await deleteUser(id);
  revalidatePath('/dashboard/users');
}

export default async function UsersPage() {
  const { users, error } = await fetchUsers();

  return (
    <div>
      <h1 className={styles.pageTitle}>Users</h1>
      <p className={styles.pageSubtitle}>Registered accounts from the mobile app</p>

      {error && <div className={styles.error}>{error}</div>}

      {users.length === 0 && !error && (
        <div className={styles.empty}>No registered users yet.</div>
      )}

      {users.length > 0 && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Name</th>
                <th>Email</th>
                <th>Provider</th>
                <th>Pro</th>
                <th>Joined</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u: UserRecord) => (
                <tr key={u.id}>
                  <td>{u.fullName}</td>
                  <td className={styles.mono}>{u.email}</td>
                  <td>{u.provider}</td>
                  <td>{u.isPro ? <span className={styles.proBadge}>Pro</span> : <span className={styles.freeBadge}>Free</span>}</td>
                  <td className={styles.time}>{new Date(u.createdAt).toLocaleString()}</td>
                  <td>
                    <DeleteUserButton
                      userId={u.id}
                      userName={u.fullName || u.email}
                      onDelete={handleDelete}
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
