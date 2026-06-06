import { useLocation } from 'wouter';
import styles from './Sidebar.module.css';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/sync', label: 'Sync Data', icon: '🔄' },
  { href: '/dashboard/share-links', label: 'Share Links', icon: '🔗' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/users', label: 'Users', icon: '👥' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
];

export default function Sidebar({ onLogout }: { onLogout: () => void }) {
  const [location, navigate] = useLocation();

  async function handleLogout() {
    await fetch('/api/admin/logout', { method: 'POST', credentials: 'include' });
    onLogout();
    navigate('/');
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img src={`${import.meta.env.BASE_URL}icon.png`} alt="FileTrail" className={styles.brandIcon} />
        <span className={styles.brandName}>FileTrail</span>
        <span className={styles.brandBadge}>Admin</span>
      </div>
      <nav className={styles.nav}>
        {NAV.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${location === item.href ? styles.navItemActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>
      <button onClick={handleLogout} className={styles.logout}>Sign out</button>
    </aside>
  );
}
