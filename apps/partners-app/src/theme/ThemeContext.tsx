import React, { createContext, useContext } from 'react';
import { DARK_THEME, LIGHT_THEME, AppTheme } from './colors';

interface ThemeContextType {
  theme: AppTheme;
  isDark: boolean;
}

const ThemeContext = createContext<ThemeContextType>({
  theme: LIGHT_THEME,
  isDark: false,
});

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // NOTE: Auto theme switching is temporarily disabled because not all screens
  // have been ported to dark theme yet. This was causing input fields to be
  // invisible (white text on white bg or dark text on dark bg) on devices with
  // dark mode enabled. Re-enable once all screens use useAppTheme() consistently.
  const isDark = false;
  const theme = LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);

// Intentionally unused but kept for future dark-mode rollout
void DARK_THEME;

