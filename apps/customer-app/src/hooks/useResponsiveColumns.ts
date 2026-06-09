import { useWindowDimensions } from 'react-native';

/**
 * Returns the number of grid columns based on screen width.
 * - Phones (< 768px): 1 column
 * - Tablets/iPads (>= 768px): 3 columns
 */
export function useResponsiveColumns(): { numColumns: number; isTablet: boolean } {
  const { width } = useWindowDimensions();
  const isTablet = width >= 768;
  const numColumns = isTablet ? 3 : 1;
  return { numColumns, isTablet };
}
