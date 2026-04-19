# ✅ Babel Plugin Fix - React Query v5 Compatibility

## **Problem**

Build was failing with:
```
Execution failed for task ':app:createBundleReleaseJsAndAssets'.
> Process 'command 'node'' finished with non-zero exit value 1
```

**Root Cause**: `@tanstack/react-query@^5.17.0` uses **class private methods** (modern JavaScript feature) that requires a Babel plugin to transpile for React Native.

---

## **Solution Applied**

### **1. Added Babel Plugin to config**

**Both apps** (`babel.config.js`):
```javascript
module.exports = function(api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    plugins: [
      ['module-resolver', { root: ['./src'], alias: { '@': './src' } }],
      '@babel/plugin-transform-private-methods',  // ✅ ADDED
      'react-native-reanimated/plugin',
    ],
  };
};
```

### **2. Added Plugin to devDependencies**

**Both apps** (`package.json`):
```json
{
  "devDependencies": {
    "@babel/core": "^7.20.0",
    "@babel/plugin-transform-private-methods": "^7.28.6",  // ✅ ADDED
    "@types/react": "~18.2.14",
    "babel-plugin-module-resolver": "^5.0.0",
    "babel-preset-expo": "^9.5.0",
    "typescript": "^5.1.3"
  }
}
```

---

## **Why This Happened**

### **Timeline:**
1. Initially, we **added** the plugin to fix a build error
2. Then we **removed** it thinking it was causing conflicts
3. Now we **added it back** because React Query v5 actually needs it

### **The Truth:**
- `@tanstack/react-query@v5` uses **private class methods** (`#methodName`)
- React Native's Metro bundler needs Babel to transpile this syntax
- `babel-preset-expo` does **NOT** include this plugin by default
- Without the plugin, Metro bundler crashes during release builds

---

## **Files Modified**

### **Customer App:**
- ✅ `apps/customer-app/babel.config.js` - Added plugin
- ✅ `apps/customer-app/package.json` - Added to devDependencies

### **Partners App:**
- ✅ `apps/partners-app/babel.config.js` - Added plugin
- ✅ `apps/partners-app/package.json` - Added to devDependencies

---

## **How to Rebuild**

### **Option 1: Rebuild with EAS (Recommended)**
```bash
# Customer App
cd apps/customer-app
eas build --platform android --profile production --clear-cache

# Partners App
cd apps/partners-app
eas build --platform android --profile production --clear-cache
```

### **Option 2: Local Build (for testing)**
```bash
# Install dependencies
cd apps/customer-app
npm install

# Clear caches
npx expo start --clear

# Build
cd android
./gradlew clean
./gradlew assembleRelease
```

---

## **Lesson Learned**

**For Expo SDK 49 with React Query v5:**
- ✅ **DO** use `@babel/plugin-transform-private-methods`
- ✅ **DO** keep it in both `babel.config.js` AND `package.json`
- ✅ **DO** use `--clear-cache` flag when rebuilding
- ❌ **DON'T** remove it even if it seems unnecessary

**The plugin is REQUIRED when using:**
- `@tanstack/react-query@v5.x`
- Any library using private class methods (`#method`)
- Modern JavaScript syntax not in babel-preset-expo

---

## **Verification**

After rebuild, verify:
1. ✅ Build completes without Metro bundler errors
2. ✅ `.aab` file is generated successfully
3. ✅ App runs without JavaScript errors
4. ✅ React Query works correctly (data fetching, caching)

---

## **Related Packages That May Need This Plugin**

If you add any of these in the future, you'll need this plugin:
- `@tanstack/react-query@v5+`
- `@tanstack/react-table@v8+`
- Modern libraries using private class fields
- Any package using `#privateMethod` syntax

---

**Status**: ✅ **FIXED** - Ready to rebuild both apps!
