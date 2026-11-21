import { IconMoon, IconSun } from '@tabler/icons-react';

export function ThemeToggle({ dark, onToggle }: { dark: boolean; onToggle: () => void }) {
  const label = dark ? 'Switch to light theme' : 'Switch to dark theme';
  const Icon = dark ? IconSun : IconMoon;

  return (
    <button
      type="button"
      className="btn btn-icon"
      aria-label={label}
      title={label}
      onClick={onToggle}
    >
      <Icon size={20} aria-hidden="true" />
    </button>
  );
}
