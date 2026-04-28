/**
 * Theme Color Palettes for Customer App
 * Mirrors partners-app palette for cross-app consistency.
 */

export const DARK_THEME = {
  // Backgrounds
  background: '#121212',
  surface: '#1E1E1E',
  surfaceVariant: '#2D2D2D',
  surfaceElevated: '#383838',

  // Brand Colors
  primary: '#CE1126',
  primaryLight: '#EF4444',
  accent: '#D4A017',
  accentLight: '#FCD116',
  accentBg: 'rgba(212, 160, 23, 0.15)',

  // Text Colors
  text: '#FFFFFF',
  textSecondary: '#9CA3AF',
  textTertiary: '#6B7280',

  // Borders
  border: '#333333',
  borderLight: '#2A2A2A',

  // Status Colors
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.15)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.15)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.15)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.15)',
  pending: '#FCD116',
  pendingBg: 'rgba(252, 209, 22, 0.15)',

  // Navigation
  tabBar: '#1A1A1A',
  tabBarBorder: '#333333',
  tabActive: '#CE1126',
  tabInactive: '#6B7280',

  // Status Bar
  statusBar: '#121212',

  // Notification
  notificationBadge: '#CE1126',
} as const;

export const LIGHT_THEME = {
  // Backgrounds
  background: '#F9FAFB',
  surface: '#FFFFFF',
  surfaceVariant: '#F3F4F6',
  surfaceElevated: '#FFFFFF',

  // Brand Colors
  primary: '#CE1126',
  primaryLight: '#EF4444',
  accent: '#D4A017',
  accentLight: '#FCD116',
  accentBg: 'rgba(212, 160, 23, 0.1)',

  // Text Colors
  text: '#111827',
  textSecondary: '#6B7280',
  textTertiary: '#9CA3AF',

  // Borders
  border: '#E5E7EB',
  borderLight: '#F3F4F6',

  // Status Colors
  success: '#10B981',
  successBg: 'rgba(16, 185, 129, 0.1)',
  warning: '#F59E0B',
  warningBg: 'rgba(245, 158, 11, 0.1)',
  danger: '#EF4444',
  dangerBg: 'rgba(239, 68, 68, 0.1)',
  info: '#3B82F6',
  infoBg: 'rgba(59, 130, 246, 0.1)',
  pending: '#D4A017',
  pendingBg: 'rgba(212, 160, 23, 0.1)',

  // Navigation
  tabBar: '#FFFFFF',
  tabBarBorder: '#E5E7EB',
  tabActive: '#CE1126',
  tabInactive: '#9CA3AF',

  // Status Bar
  statusBar: '#F9FAFB',

  // Notification
  notificationBadge: '#CE1126',
} as const;

export type AppTheme = typeof DARK_THEME | typeof LIGHT_THEME;
export type DarkThemeColors = typeof DARK_THEME;
