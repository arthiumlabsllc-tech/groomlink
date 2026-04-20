const { withProjectBuildGradle } = require('@expo/config-plugins');

function withAndroidSdkFix(config) {
  return withProjectBuildGradle(config, (config) => {
    if (config.modResults.language === 'groovy') {
      // Replace useDefaultAndroidSdkVersions() with explicit SDK versions
      config.modResults.contents = config.modResults.contents.replace(
        /useDefaultAndroidSdkVersions\(\)/g,
        `// useDefaultAndroidSdkVersions() - disabled for SDK 52 compatibility
        buildscript {
            ext {
                compileSdkVersion = 35
                targetSdkVersion = 35
                minSdkVersion = 24
            }
        }`
      );
    }
    return config;
  });
}

module.exports = withAndroidSdkFix;
