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

// Block backend-only packages and Node.js built-in modules from Metro bundling
config.resolver.blockList = [
  // Block backend-only packages that import Node.js builtins
  /.*\/africastalking\/.*/,
  /.*\/prisma\/.*/,
  /.*\/express\/.*/,
  /.*\/bcrypt\/.*/,
  /.*\/node-cron\/.*/,
  // Block axios 1.13.x node-specific CJS build that imports crypto
  /.*\/axios@1\.1[3-9]\..*/,
  // Block test standalone directories (escape special regex chars in path)
  new RegExp(path.resolve(projectRoot, 'eas-test-standalone').replace(/[.*+?^${}()|[\]\\\/]/g, '\\$&') + '.*$'),
];

// CRITICAL: In a pnpm workspace with shamefully-hoist, the root may have react@18 (web apps)
// while mobile apps need react@19. Always prioritize app's own node_modules first.
const appNodeModules = path.resolve(projectRoot, 'node_modules');

// Also block Node.js built-in module resolution as safety net
const nodeBuiltins = new Set(['crypto', 'dns', 'net', 'tls', 'child_process', 'cluster', 'dgram', 'readline', 'repl', 'vm']);

config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (nodeBuiltins.has(moduleName)) {
    return { type: 'empty' };
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Always prioritize app's own node_modules for resolution
config.resolver.nodeModulesPaths = [
  appNodeModules,
  rootNodeModules,
];

if (isPnpmMonorepo) {
  // Monorepo (local development with pnpm)
  config.watchFolders = [...(config.watchFolders || []), projectRoot, monorepoRoot];

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

module.exports = config;
