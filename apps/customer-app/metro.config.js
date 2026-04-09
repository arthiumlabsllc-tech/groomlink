const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');
const pnpmVirtualStore = path.join(rootNodeModules, '.pnpm');

// Check if we're in a pnpm monorepo environment
// On EAS, the monorepo structure doesn't exist - it builds standalone
const isPnpmMonorepo = fs.existsSync(pnpmVirtualStore);

const config = getDefaultConfig(projectRoot);

// Exclude test standalone directory from Metro
config.resolver.blockList = [
  new RegExp(path.resolve(projectRoot, 'eas-test-standalone').replace(/[/\\]/g, '[/\\\\]') + '.*$'),
];

if (isPnpmMonorepo) {
  // Monorepo (local development with pnpm)
  config.watchFolders = [projectRoot, monorepoRoot];

  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    rootNodeModules,
  ];

  // Add pnpm virtual store paths for proper module resolution
  const pnpmItems = fs.readdirSync(pnpmVirtualStore);
  pnpmItems.forEach(item => {
    const virtualStoreModulePath = path.join(pnpmVirtualStore, item, 'node_modules');
    if (fs.existsSync(virtualStoreModulePath)) {
      config.resolver.nodeModulesPaths.push(virtualStoreModulePath);
    }
  });

  // Resolve symlinks in node_modules for pnpm compatibility
  const nodeModulesDir = path.resolve(projectRoot, 'node_modules');
  const extraNodeModules = {};

  if (fs.existsSync(nodeModulesDir)) {
    const items = fs.readdirSync(nodeModulesDir);
    items.forEach(item => {
      const itemPath = path.join(nodeModulesDir, item);
      try {
        const stat = fs.lstatSync(itemPath);
        if (stat.isSymbolicLink()) {
          try {
            const realPath = fs.realpathSync(itemPath);
            extraNodeModules[item] = realPath;
          } catch (e) {
            // Ignore broken symlinks
          }
        }
        // Handle scoped packages (@babel, @react-native, etc.)
        if (stat.isDirectory() && item.startsWith('@')) {
          const scopedDir = itemPath;
          const scopedItems = fs.readdirSync(scopedDir);
          scopedItems.forEach(scopedItem => {
            const scopedItemPath = path.join(scopedDir, scopedItem);
            try {
              const scopedStat = fs.lstatSync(scopedItemPath);
              if (scopedStat.isSymbolicLink()) {
                try {
                  const realPath = fs.realpathSync(scopedItemPath);
                  extraNodeModules[`${item}/${scopedItem}`] = realPath;
                } catch (e) {
                  // Ignore broken symlinks
                }
              }
            } catch (e) {
              // Ignore errors
            }
          });
        }
      } catch (e) {
        // Ignore errors
      }
    });
  }

  config.resolver.extraNodeModules = extraNodeModules;
}
// else: EAS/standalone build - use default Expo config (no monorepo paths needed)

module.exports = config;
