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

// Block Node.js built-in modules that shouldn't be in React Native
// This prevents backend packages (like africastalking) from breaking mobile builds
const nodeBuiltins = ['crypto', 'fs', 'path', 'os', 'http', 'https', 'net', 'tls', 'stream', 'zlib', 'dns', 'child_process', 'cluster', 'dgram', 'module', 'process', 'readline', 'repl', 'vm'];
const originalResolveRequest = config.resolver.resolveRequest;

config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Block Node.js built-in modules
  if (nodeBuiltins.includes(moduleName)) {
    console.warn(`[Metro] Blocking Node.js built-in module: ${moduleName}`);
    return { type: 'empty' };
  }
  
  // Use original resolver if available, otherwise default
  if (originalResolveRequest) {
    return originalResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Exclude test standalone directories from Metro (both local and sibling apps)
config.resolver.blockList = [
  new RegExp(path.resolve(projectRoot, 'eas-test-standalone').replace(/[/\\]/g, '[/\\\\]') + '.*$'),
  new RegExp(path.resolve(projectRoot, '../customer-app/eas-test-standalone').replace(/[/\\]/g, '[/\\\\]') + '.*$'),
];

if (isPnpmMonorepo) {
  // Monorepo (local development with pnpm)
  config.watchFolders = [projectRoot, monorepoRoot];

  config.resolver.nodeModulesPaths = [
    path.resolve(projectRoot, 'node_modules'),
    rootNodeModules,
  ];

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
