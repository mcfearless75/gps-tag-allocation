import type { ReactNode } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../lib/auth/AuthProvider';
import crest from '../assets/tranmere-crest.webp';

interface AppShellProps {
  children: ReactNode;
}

const NAV_ITEMS = [
  { to: '/scan', label: 'Scan' },
  { to: '/roster', label: 'Roster' },
  { to: '/report', label: 'Report' },
];

export function AppShell({ children }: AppShellProps) {
  const { session } = useAuth();
  const location = useLocation();

  return (
    <div className="app-shell">
      <header className="app-header">
        <img src={crest} alt="Tranmere Rovers crest" className="app-header-crest" />
        <span className="app-header-title">GPS Tag Allocation</span>
      </header>
      <div className="app-content">{children}</div>
      {session && (
        <nav className="bottom-nav">
          {NAV_ITEMS.map((item) => (
            <Link
              key={item.to}
              to={item.to}
              aria-current={location.pathname === item.to ? 'page' : undefined}
              className={`bottom-nav-item${location.pathname === item.to ? ' active' : ''}`}
            >
              {item.label}
            </Link>
          ))}
        </nav>
      )}
    </div>
  );
}
