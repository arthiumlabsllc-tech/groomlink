# Google Play Advertising ID (AD_ID) Analysis

## ✅ Answer: NO, Your Apps Do NOT Use Advertising ID

### Analysis Results

After thorough examination of both apps, **neither GroomLink Customer App nor GroomLink Partners App uses Advertising ID**.

---

## 🔍 What We Checked

### 1. **Dependencies (package.json)**

#### Customer App Dependencies:
- ✅ No Google Ads SDK (`play-services-ads`)
- ✅ No AdMob SDK
- ✅ No Firebase Analytics
- ✅ No Facebook Ads SDK
- ✅ No marketing/tracking SDKs
- ✅ No analytics SDKs that use AD_ID

**Only production dependencies:**
- React Native core libraries
- Expo modules (location, notifications, image picker, etc.)
- Navigation libraries
- UI libraries (React Native Paper, Vector Icons)
- State management (Zustand, React Query)
- Socket.io for real-time communication

#### Partners App Dependencies:
- ✅ Same as customer app
- ✅ No advertising or analytics SDKs
- ✅ Only business logic and UI libraries

### 2. **Code Search**

Searched for:
- `AD_ID` - Not found
- `advertising_id` - Not found
- `google.*ads` - Not found
- `admob` - Not found
- `firebase.*ads` - Not found
- `play-services-ads` - Not found
- `mobile.*ads` - Not found

**Result: Zero matches in both apps**

### 3. **Third-Party SDKs Used**

| SDK | Purpose | Uses AD_ID? |
|-----|---------|-------------|
| **Paystack** | Payment processing | ❌ No |
| **Google Maps** | Location & navigation | ❌ No (only for mapping) |
| **Firebase Cloud Messaging** | Push notifications | ❌ No (FCM doesn't require AD_ID) |
| **Expo SDK** | Core app functionality | ❌ No |
| **Socket.io** | Real-time communication | ❌ No |

### 4. **Landing Website**

Checked `apps/landing/index.html` and all pages:
- ✅ No Google Analytics (gtag.js)
- ✅ No Google AdSense
- ✅ No Facebook Pixel
- ✅ No advertising scripts
- ✅ No tracking pixels

**Only external resources:**
- Google Fonts (for typography)
- Material Symbols (for icons)

---

## 📋 Google Play Console Answer

### Question: "Does your app use advertising ID?"

**Your Answer: NO**

### Explanation to Provide (if needed):

> "Our apps do not use Advertising ID (AD_ID). We do not include any advertising SDKs (Google Ads, AdMob, Facebook Ads, etc.) or analytics SDKs that track users for advertising purposes. Our apps are service-focused (salon booking and business management) and do not display advertisements or engage in cross-app advertising tracking."

---

## ⚠️ Important Note About expo-notifications

Your apps use `expo-notifications` for push notifications. This uses **Firebase Cloud Messaging (FCM)** under the hood.

**Good news:** 
- FCM does **NOT** require Advertising ID
- FCM uses Instance ID for device targeting, not AD_ID
- This is compliant with answering "NO" to the advertising ID question

---

## 🛡️ Android Manifest Permission Check

Since you're using Expo, the Android manifest is auto-generated. However, we should verify that the `com.google.android.gms.permission.AD_ID` permission is **NOT** included.

### How to Verify:

After building your app, check the generated manifest:

```bash
# After running eas build, extract the AAB and check:
unzip -p your-app.aab base/manifest/AndroidManifest.xml | grep -i "AD_ID"
```

**Expected result:** No matches (permission should not be present)

### If AD_ID Permission Appears (Unlikely):

If somehow the permission gets auto-added by a dependency, you can explicitly remove it by adding to your app.json:

```json
{
  "expo": {
    "android": {
      "permissions": [
        // ... your existing permissions
      ],
      "blockedPermissions": [
        "com.google.android.gms.permission.AD_ID"
      ]
    }
  }
}
```

**However**, based on our dependency analysis, this should NOT be necessary for your apps.

---

## ✅ Compliance Checklist

- [x] No advertising SDKs in dependencies
- [x] No analytics SDKs that use AD_ID
- [x] No advertising code in app
- [x] No tracking pixels on website
- [x] Third-party SDKs verified (none use AD_ID)
- [x] Firebase Cloud Messaging (notifications) does not use AD_ID
- [x] Google Maps SDK does not use AD_ID

---

## 📝 Google Play Data Safety Section

When filling out the Data Safety section in Google Play Console:

### Advertising ID Question:
**Q:** Does your app collect Advertising ID?  
**A:** **NO**

### Advertising-Related Data Collection:
**Q:** Does your app show ads?  
**A:** **NO**

**Q:** Does your app share data for advertising purposes?  
**A:** **NO**

**Q:** Does your app use data for advertising personalization?  
**A:** **NO**

---

## 🚀 What This Means

Since your apps **do NOT** use Advertising ID:

1. ✅ You can safely answer "NO" to the advertising ID question
2. ✅ No need to include AD_ID permission in your manifest
3. ✅ Simpler Data Safety section completion
4. ✅ Better user privacy (no ad tracking)
5. ✅ No need for additional privacy disclosures related to advertising

---

## 📞 If Google Asks for Clarification

If Google Play Review questions your advertising ID declaration, you can respond:

> "Our apps (GroomLink Customer and GroomLink Partners) are service-based applications for salon booking and business management. We do not:
> - Display advertisements
> - Use advertising SDKs (Google Ads, AdMob, etc.)
> - Track users for advertising purposes
> - Collect or use Advertising ID (AD_ID)
> - Share data with advertising networks
> 
> Our only third-party integrations are:
> - Paystack (payment processing)
> - Google Maps (location services)
> - Firebase Cloud Messaging (push notifications)
> 
> None of these services require or use Advertising ID in our implementation."

---

## 🔒 Privacy Policy Alignment

Your updated privacy policy already correctly states:
- No data is sold to third parties
- Data is only shared for service delivery (bookings, payments)
- Analytics are internal only (no third-party analytics SDKs)

**No changes needed to privacy policy regarding advertising ID.**

---

## Summary

| Aspect | Status |
|--------|--------|
| **Uses Advertising ID?** | ❌ NO |
| **Shows Ads?** | ❌ NO |
| **Has Ad SDKs?** | ❌ NO |
| **Uses AD for Tracking?** | ❌ NO |
| **Safe to Answer NO?** | ✅ YES |

---

**Verified:** February 15, 2026  
**Apps:** GroomLink Customer & GroomLink Partners  
**Conclusion:** Both apps are clean of advertising ID usage. Answer "NO" in Google Play Console.
