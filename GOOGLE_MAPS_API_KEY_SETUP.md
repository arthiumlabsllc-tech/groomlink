# Google Maps API Key - Setup Guide

## 🚨 Critical Issue: App Crashing on Map Screen

Your app is crashing because the **Google Maps API key is missing** from your mobile app configuration.

---

## ✅ What Was Fixed

I've added the `react-native-maps` plugin configuration to your `app.json` files:

**Customer App** (`apps/customer-app/app.json`):
```json
[
  "react-native-maps",
  {
    "androidGoogleMapsApiKey": "YOUR_API_KEY_HERE"
  }
]
```

---

## 🔧 What You NEED To Do

### Step 1: Get Your Google Maps API Key

1. **Go to Google Cloud Console**: https://console.cloud.google.com/

2. **Create or select a project**:
   - Click the project dropdown at the top
   - Click "NEW PROJECT"
   - Name it: "GroomLink Mobile"
   - Click "CREATE"

3. **Enable required APIs**:
   - Go to "APIs & Services" > "Library"
   - Search and enable these APIs:
     - ✅ **Maps SDK for Android**
     - ✅ **Maps SDK for iOS**
     - ✅ **Geocoding API**
     - ✅ **Places API** (optional, for search)
     - ✅ **Directions API** (optional, for navigation)

4. **Create API Key**:
   - Go to "APIs & Services" > "Credentials"
   - Click "+ CREATE CREDENTIALS" > "API key"
   - Copy the generated key (looks like: `AIzaSy...`)

5. **Restrict the API Key** (Recommended):
   - Click "Edit API key"
   - Under "Application restrictions":
     - Select "Android apps"
     - Add your package name: `com.arthiumlabsllc.groomlink`
     - Add SHA-1 certificate fingerprint (from EAS build or local)
   - Under "API restrictions":
     - Select "Restrict key"
     - Check: Maps SDK for Android, Maps SDK for iOS, Geocoding API

---

### Step 2: Update Your app.json Files

**IMPORTANT**: Replace the placeholder API key with your actual key!

#### Customer App (`apps/customer-app/app.json`):

Find this section and replace the API key:

```json
[
  "react-native-maps",
  {
    "androidGoogleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
  }
]
```

#### Partners App (`apps/partners-app/app.json`):

Add the same plugin configuration:

```json
"plugins": [
  // ... other plugins
  [
    "react-native-maps",
    {
      "androidGoogleMapsApiKey": "YOUR_ACTUAL_API_KEY_HERE"
    }
  ],
  // ... rest of plugins
]
```

---

### Step 3: Rebuild Your Apps

After updating the API key, you MUST rebuild:

```powershell
# Customer App
cd apps/customer-app
npx expo prebuild --clean
eas build --platform android

# Partners App
cd apps/partners-app
npx expo prebuild --clean
eas build --platform android
```

---

## 🔍 How to Verify It's Working

### Before Rebuilding (Check Config):

```powershell
cd apps/customer-app
npx expo config | grep -A 5 "googleMaps"
```

You should see your API key in the output.

### After Installing the App:

1. Open the app
2. Navigate to the map screen
3. The map should load without crashing
4. You should see salon markers on the map

### Check Logs (if still crashing):

```bash
adb logcat | grep -i "maps\|google"
```

Look for errors like:
- ✅ `API key not found` → Key not configured
- ✅ `Unauthorized URL` → Key restriction issue
- ✅ `API key not valid` → Wrong key or not enabled

---

## 📋 API Key Format

Your API key should look like this:

```
AIzaSyA1B2C3D4E5F6G7H8I9J0K1L2M3N4O5P6Q
```

**NOT** like the placeholder I added:
```
AIzaSyB9Ql7Jq7VzMxJqVzMxJqVzMxJqVzMxJqV (PLACEHOLDER - REPLACE THIS!)
```

---

## 🚀 Quick Setup Commands

Once you have your API key:

### 1. Update Customer App:

```powershell
cd "apps/customer-app"

# Open app.json and replace the API key
# Then rebuild:
npx expo prebuild --clean
eas build --platform android --profile production
```

### 2. Update Partners App (if needed):

```powershell
cd "apps/partners-app"

# Add the react-native-maps plugin to app.json
# Then rebuild:
npx expo prebuild --clean
eas build --platform android --profile production
```

---

## 💡 Pro Tips

### Use Environment Variables (Recommended for Production):

Create `app.config.js` instead of `app.json`:

```javascript
// apps/customer-app/app.config.js
export default {
  expo: {
    // ... other config
    plugins: [
      [
        "react-native-maps",
        {
          androidGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_ANDROID,
          iosGoogleMapsApiKey: process.env.GOOGLE_MAPS_API_KEY_IOS
        }
      ],
      // ... other plugins
    ]
  }
};
```

Then set the env var before building:

```powershell
$env:GOOGLE_MAPS_API_KEY_ANDROID="your-actual-key-here"
eas build --platform android
```

---

## ⚠️ Common Mistakes

1. ❌ **Using web API key** → Must be Android/iOS restricted
2. ❌ **Not enabling Maps SDK** → Must enable in Google Cloud Console
3. ❌ **Wrong package name** → Must match `com.arthiumlabsllc.groomlink`
4. ❌ **Not rebuilding** → Changes require `npx expo prebuild --clean`
5. ❌ **Using placeholder key** → Must use your actual key from Google Cloud

---

## 🔐 Security Best Practices

1. ✅ **Never commit API keys to Git**
2. ✅ **Use app restrictions** (Android/iOS)
3. ✅ **Use API restrictions** (only Maps APIs)
4. ✅ **Rotate keys periodically**
5. ✅ **Monitor usage** in Google Cloud Console
6. ✅ **Set billing alerts** to avoid surprises

---

## 📊 Cost Information

Google Maps Platform pricing:

- **Maps SDK for Android**: FREE (unlimited usage)
- **Maps SDK for iOS**: FREE (unlimited usage)
- **Geocoding API**: $5 per 1000 requests
- **Places API**: $17-32 per 1000 requests
- **Directions API**: $5 per 1000 requests

**Free tier**: $200 credit per month (enough for most apps)

---

## 🆘 Still Having Issues?

### Check these:

1. **Is Maps SDK enabled?**
   ```
   Google Cloud Console > APIs & Services > Library > Maps SDK for Android
   Should say "API enabled"
   ```

2. **Is API key valid?**
   ```
   Google Cloud Console > APIs & Services > Credentials
   Key should not be deleted or expired
   ```

3. **Is package name correct?**
   ```
   Customer: com.arthiumlabsllc.groomlink
   Partners: com.arthiumlabsllc.partners
   ```

4. **Did you rebuild?**
   ```
   Must run: npx expo prebuild --clean
   Then: eas build --platform android
   ```

---

## ✅ Checklist

Before submitting to app stores:

- [ ] Google Maps API key obtained
- [ ] Maps SDK for Android enabled
- [ ] Maps SDK for iOS enabled (if building for iOS)
- [ ] API key added to app.json (both apps)
- [ ] Apps rebuilt with `npx expo prebuild --clean`
- [ ] Map screen tested on physical device
- [ ] No crashes when opening map
- [ ] Salon markers visible on map
- [ ] Location permissions working

---

**Status**: ⚠️ Configuration added, but PLACEHOLDER key needs to be replaced  
**Action Required**: Get your actual Google Maps API key and update app.json files
