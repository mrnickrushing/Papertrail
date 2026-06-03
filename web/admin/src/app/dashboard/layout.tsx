import { redirect } from 'next/navigation';
import { isAuthenticated } from '@/lib/auth';
import Sidebar from './Sidebar';
import styles from './layout.module.css';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  if (!isAuthenticated()) redirect('/');
  return (
    <div className={styles.shell}>
      <Sidebar />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
