import { useState, useEffect } from 'react';
import { getKey, clearKey, setKey, api } from './api';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Users from './pages/Users';
import Notifications from './pages/Notifications';
import Analytics from './pages/Analytics';
import ShareLinks from './pages/ShareLinks';

type Page = '/' | '/users' | '/notifications' | '/analytics' | '/share-links';

const NAV = [
  { path: '/' as Page, label: 'Dashboard', icon: '◈' },
  { path: '/users' as Page, label: 'Users', icon: '◉' },
  { path: '/notifications' as Page, label: 'Notifications', icon: '◎' },
  { path: '/analytics' as Page, label: 'Analytics', icon: '▦' },
  { path: '/share-links' as Page, label: 'Share Links', icon: '⊞' },
];

function hashPage(): Page {
  const h = window.location.hash.slice(1) || '/';
  return (NAV.some(n => n.path === h) ? h : '/') as Page;
}

export default function App() {
  const [key, setKeyState] = useState(() => getKey());
  const [page, setPage] = useState<Page>(hashPage);

  useEffect(() => {
    const handler = () => setPage(hashPage());
    window.addEventListener('hashchange', handler);
    return () => window.removeEventListener('hashchange', handler);
  }, []);

  const handleLogin = async (k: string) => {
    setKey(k);
    try {
      await api.getConfig();
      setKeyState(k);
    } catch {
      clearKey();
      throw new Error('Invalid admin key — check your Railway ADMIN_KEY env var.');
    }
  };

  const handleLogout = () => {
    clearKey();
    setKeyState(null);
  };

  if (!key) return <Login onLogin={handleLogin} />;

  const PageComponent = {
    '/': Dashboard,
    '/users': Users,
    '/notifications': Notifications,
    '/analytics': Analytics,
    '/share-links': ShareLinks,
  }[page] ?? Dashboard;

  return (
    <div className="app">
      <aside className="sidebar">
        <div className="sidebar-logo">
          <span className="logo-icon">F</span>
          <span className="logo-text">FileTrail</span>
          <span className="logo-badge">Admin</span>
        </div>
        <nav className="sidebar-nav">
          {NAV.map(({ path, label, icon }) => (
            <a key={path} href={`#${path}`} className={`nav-item${page === path ? ' active' : ''}`}>
              <span className="nav-icon">{icon}</span>
              {label}
            </a>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <button className="logout-btn" onClick={handleLogout}>Sign out</button>
        </div>
      </aside>
      <main className="main">
        <PageComponent />
      </main>
    </div>
  );
}
