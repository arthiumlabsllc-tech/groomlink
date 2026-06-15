const { withAndroidStyles } = require('@expo/config-plugins');

/**
 * Expo config plugin that configures edge-to-edge display for Android 15+.
 * 
 * - Sets statusBarColor to transparent (deprecated solid colors cause Play warnings)
 * - Sets navigationBarColor to transparent
 * - Enables windowLightStatusBar for dark icons on light background
 */
function withEdgeToEdge(config) {
  return withAndroidStyles(config, (config) => {
    const styles = config.modResults;
    const resources = styles.resources;

    if (!resources.style) return config;

    // Find the AppTheme style
    const appTheme = resources.style.find(
      (s) => s.$['name'] === 'AppTheme'
    );

    if (appTheme && appTheme.item) {
      // Remove existing statusBarColor if present
      appTheme.item = appTheme.item.filter(
        (i) => i.$['name'] !== 'android:statusBarColor'
      );

      // Add transparent status bar
      appTheme.item.push({
        $: { name: 'android:statusBarColor' },
        _: '@android:color/transparent',
      });

      // Add transparent navigation bar
      const hasNavBar = appTheme.item.some(
        (i) => i.$['name'] === 'android:navigationBarColor'
      );
      if (!hasNavBar) {
        appTheme.item.push({
          $: { name: 'android:navigationBarColor' },
          _: '@android:color/transparent',
        });
      }

      // Enable light status bar (dark icons)
      const hasLightStatusBar = appTheme.item.some(
        (i) => i.$['name'] === 'android:windowLightStatusBar'
      );
      if (!hasLightStatusBar) {
        appTheme.item.push({
          $: { name: 'android:windowLightStatusBar' },
          _: 'true',
        });
      }
    }

    return config;
  });
}

module.exports = withEdgeToEdge;
