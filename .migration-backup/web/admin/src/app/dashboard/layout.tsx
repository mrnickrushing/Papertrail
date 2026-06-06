import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from './Sidebar';
import styles from './layout.module.css';

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!(await isAuthenticated())) redirect('/');
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
