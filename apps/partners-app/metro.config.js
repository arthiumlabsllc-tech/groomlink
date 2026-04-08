const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');
const fs = require('fs');

const config = getDefaultConfig(__dirname);

// Handle pnpm monorepo structure
const projectRoot = __dirname;
const monorepoRoot = path.resolve(projectRoot, '../..');
const rootNodeModules = path.resolve(monorepoRoot, 'node_modules');

config.watchFolders = [projectRoot, monorepoRoot];

config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  rootNodeModules,
];

// Add pnpm virtual store to nodeModulesPaths for proper resolution from real paths
const pnpmVirtualStore = path.join(rootNodeModules, '.pnpm');
if (fs.existsSync(pnpmVirtualStore)) {
  // Find all node_modules directories in the pnpm virtual store
  const pnpmItems = fs.readdirSync(pnpmVirtualStore);
  pnpmItems.forEach(item => {
    const virtualStoreModulePath = path.join(pnpmVirtualStore, item, 'node_modules');
    if (fs.existsSync(virtualStoreModulePath)) {
      config.resolver.nodeModulesPaths.push(virtualStoreModulePath);
    }
  });
}

// Resolve all symlinks in node_modules for pnpm compatibility
const nodeModulesDir = path.resolve(projectRoot, 'node_modules');
const extraNodeModules = {};

if (fs.existsSync(nodeModulesDir)) {
  const items = fs.readdirSync(nodeModulesDir);
  items.forEach(item => {
    const itemPath = path.join(nodeModulesDir, item);
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
        const scopedStat = fs.lstatSync(scopedItemPath);
        if (scopedStat.isSymbolicLink()) {
          try {
            const realPath = fs.realpathSync(scopedItemPath);
            extraNodeModules[`${item}/${scopedItem}`] = realPath;
          } catch (e) {
            // Ignore broken symlinks
          }
        }
      });
    }
  });
}

config.resolver.extraNodeModules = extraNodeModules;

module.exports = config;
