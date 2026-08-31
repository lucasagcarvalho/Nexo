export type ThemeMode = 'light' | 'dark' | 'system';

const THEME_MODE_KEY = 'theme-mode';

function isThemeMode(value: string | null): value is ThemeMode {
  return value === 'light' || value === 'dark' || value === 'system';
}

function systemPrefersDark(): boolean {
  return typeof window !== 'undefined'
    && typeof window.matchMedia === 'function'
    && window.matchMedia('(prefers-color-scheme: dark)').matches;
}

export function readThemeMode(): ThemeMode {
  try {
    const stored = localStorage.getItem(THEME_MODE_KEY);
    return isThemeMode(stored) ? stored : 'system';
  } catch {
    return 'system';
  }
}

export function resolveThemeMode(mode: ThemeMode): 'light' | 'dark' {
  return mode === 'system'
    ? (systemPrefersDark() ? 'dark' : 'light')
    : mode;
}

export function applyThemeMode(mode: ThemeMode): void {
  if (typeof document === 'undefined') return;
  const resolved = resolveThemeMode(mode);
  document.documentElement.classList.toggle('dark', resolved === 'dark');
  document.documentElement.style.colorScheme = resolved;
}

export function persistThemeMode(mode: ThemeMode): void {
  try {
    localStorage.setItem(THEME_MODE_KEY, mode);
  } catch {
    /* ignore unavailable storage */
  }
}
