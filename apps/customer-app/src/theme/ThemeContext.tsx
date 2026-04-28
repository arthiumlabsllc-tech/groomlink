import React, { createContext, useContext } from 'react';
import { useColorScheme } from 'react-native';
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
  // Automatic theme switching driven by the device's color-scheme preference.
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const theme: AppTheme = isDark ? DARK_THEME : LIGHT_THEME;

  return (
    <ThemeContext.Provider value={{ theme, isDark }}>
      {children}
    </ThemeContext.Provider>
  );
};

export const useAppTheme = () => useContext(ThemeContext);
