import { useState, useEffect, useCallback } from 'react';

function getInitialDark(): boolean {
  // Check localStorage first (user's explicit preference)
  const stored = localStorage.getItem('theme');
  if (stored === 'dark') return true;
  if (stored === 'light') return false;
  // Fall back to system preference
  return window.matchMedia('(prefers-color-scheme: dark)').matches;
}

function applyDarkClass(isDark: boolean) {
  const root = document.documentElement;
  if (isDark) {
    root.classList.add('dark');
  } else {
    root.classList.remove('dark');
  }
  // Keep the favicon in sync with the active theme (last icon link wins)
  const links = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"]');
  const last = links[links.length - 1];
  if (last) {
    last.href = isDark ? '/logo-white.png' : '/logo-black.png';
  }
}

export function useDarkMode() {
  const [isDark, setIsDark] = useState(getInitialDark);

  // Apply class on mount and whenever isDark changes
  useEffect(() => {
    applyDarkClass(isDark);
  }, [isDark]);

  // Listen for system preference changes (only if user hasn't explicitly chosen)
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => {
      if (!localStorage.getItem('theme')) {
        setIsDark(e.matches);
      }
    };
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  const toggleDark = useCallback(() => {
    setIsDark((prev) => {
      const next = !prev;
      localStorage.setItem('theme', next ? 'dark' : 'light');
      return next;
    });
  }, []);

  return { isDark, toggleDark };
}
