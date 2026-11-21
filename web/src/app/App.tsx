import { useLayoutEffect, useState } from 'react';
import { Navigate, Route, Routes } from 'react-router';
import { ThemeToggle } from '../components/ThemeToggle';
import { getEndpoint } from '../config/endpoint';
import { DashboardPage } from '../features/dashboards/DashboardPage';
import { PanelLayout } from '../layouts/PanelLayout';

export function App() {
  const endpoint = getEndpoint();
  const [dark, setDark] = useState(() => {
    const saved = localStorage.getItem('cartograph.theme');
    return saved ? saved === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  });

  useLayoutEffect(() => {
    const theme = dark ? 'dark' : 'light';
    document.documentElement.dataset.bsTheme = theme;
    localStorage.setItem('cartograph.theme', theme);
  }, [dark]);

  const themeToggle = <ThemeToggle dark={dark} onToggle={() => setDark(!dark)} />;

  return (
    <Routes>
      <Route path="/" element={<PanelLayout endpoint={endpoint} themeToggle={themeToggle} />}>
        <Route index element={<DashboardPage dark={dark} />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
