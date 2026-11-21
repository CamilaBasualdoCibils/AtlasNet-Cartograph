import { IconLayoutDashboard } from '@tabler/icons-react';
import { useState, type ReactNode } from 'react';
import { Link, NavLink, Outlet } from 'react-router';
import { Brand } from '../components/Brand';

interface PanelLayoutProps {
  endpoint: string;
  themeToggle: ReactNode;
}

export function PanelLayout({ endpoint, themeToggle }: PanelLayoutProps) {
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <div className="page">
      <aside className="navbar navbar-vertical navbar-expand-lg">
        <div className="container-fluid">
          <Link className="navbar-brand" to="/" onClick={() => setMenuOpen(false)}>
            <Brand />
          </Link>
          <button
            type="button"
            className="navbar-toggler"
            aria-controls="sidebar-navigation"
            aria-expanded={menuOpen}
            aria-label="Toggle navigation"
            onClick={() => setMenuOpen(!menuOpen)}
          >
            <span className="navbar-toggler-icon" />
          </button>
          <nav
            className={`collapse navbar-collapse${menuOpen ? ' show' : ''}`}
            id="sidebar-navigation"
            aria-label="Main navigation"
          >
            <ul className="navbar-nav pt-lg-3">
              <li className="nav-item">
                <NavLink className="nav-link" to="/" end onClick={() => setMenuOpen(false)}>
                  <span className="nav-link-icon"><IconLayoutDashboard size={20} aria-hidden="true" /></span>
                  <span className="nav-link-title">Dashboard</span>
                </NavLink>
              </li>
            </ul>
          </nav>
        </div>
      </aside>
      <div className="page-wrapper">
        <header className="navbar">
          <div className="container-fluid px-lg-4 d-flex flex-nowrap gap-3">
            <div className="endpoint-summary">
              <div className="text-secondary small">AtlasNet endpoint</div>
              <div className="font-monospace text-break">{endpoint}</div>
            </div>
            {themeToggle}
          </div>
        </header>
        <main className="page-body">
          <div className="container-fluid px-lg-4">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
