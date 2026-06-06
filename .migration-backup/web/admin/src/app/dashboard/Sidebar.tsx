'use client';
import { useRouter, usePathname } from 'next/navigation';
import styles from './sidebar.module.css';

const NAV = [
  { href: '/dashboard', label: 'Overview', icon: '📊' },
  { href: '/dashboard/sync', label: 'Sync Data', icon: '🔄' },
  { href: '/dashboard/share-links', label: 'Share Links', icon: '🔗' },
  { href: '/dashboard/analytics', label: 'Analytics', icon: '📈' },
  { href: '/dashboard/users', label: 'Users', icon: '👥' },
  { href: '/dashboard/notifications', label: 'Notifications', icon: '🔔' },
];

export default function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();

  async function handleLogout() {
    await fetch('/api/logout', { method: 'POST' });
    router.push('/');
    router.refresh();
  }

  return (
    <aside className={styles.sidebar}>
      <div className={styles.brand}>
        <img src="/icon.png" alt="FileTrail" className={styles.brandIcon} />
        <span className={styles.brandName}>FileTrail</span>
        <span className={styles.brandBadge}>Admin</span>
      </div>

      <nav className={styles.nav}>
        {NAV.map(item => (
          <a
            key={item.href}
            href={item.href}
            className={`${styles.navItem} ${pathname === item.href ? styles.navItemActive : ''}`}
          >
            <span className={styles.navIcon}>{item.icon}</span>
            {item.label}
          </a>
        ))}
      </nav>

      <button onClick={handleLogout} className={styles.logout}>
        Sign out
      </button>
    </aside>
  );
}
