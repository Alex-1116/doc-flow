import { create } from 'zustand';

const THEME_STORAGE_KEY = 'docflow-theme';

export type ThemeMode = 'light' | 'dark';

interface ThemeStore {
  theme: ThemeMode;
  initializeTheme: () => void;
  setTheme: (theme: ThemeMode) => void;
}

function canUseDOM() {
  return typeof window !== 'undefined' && typeof document !== 'undefined';
}

function applyTheme(theme: ThemeMode) {
  if (!canUseDOM()) {
    return;
  }

  const root = document.documentElement;
  root.classList.toggle('dark', theme === 'dark');
  root.style.colorScheme = theme;
}

function getStoredTheme(): ThemeMode {
  if (!canUseDOM()) {
    return 'light';
  }

  const storedTheme = window.localStorage.getItem(THEME_STORAGE_KEY);
  return storedTheme === 'light' || storedTheme === 'dark' ? storedTheme : 'light';
}

export const useThemeStore = create<ThemeStore>((set) => ({
  theme: 'light',
  initializeTheme: () => {
    const theme = getStoredTheme();
    applyTheme(theme);

    set({
      theme,
    });
  },
  setTheme: (theme) => {
    if (canUseDOM()) {
      window.localStorage.setItem(THEME_STORAGE_KEY, theme);
    }

    applyTheme(theme);

    set({
      theme,
    });
  },
}));
