import Sidebar from '@/components/Sidebar';
import styles from './DashboardLayout.module.css';

export default function DashboardLayout({ children, onLogout }: { children: React.ReactNode; onLogout: () => void }) {
  return (
    <div className={styles.shell}>
      <Sidebar onLogout={onLogout} />
      <main className={styles.main}>{children}</main>
    </div>
  );
}
