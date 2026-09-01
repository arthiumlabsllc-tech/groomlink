# App Store Review Rejection Fixes

## Issue 1: Guideline 5.1.2(i) - Data Use and Sharing (Tracking)

### Root Cause
The app **does NOT track users** and does NOT use AppTrackingTransparency. However, the **App Store Connect privacy label** is incorrectly configured, indicating the app collects data "in order to track the user."

### Evidence
- `apps/customer-app/app.config.js` (lines 41-43) explicitly notes:
  > "no NSUserTrackingUsageDescription — the app never calls the AppTrackingTransparency API"
- No tracking SDKs (Firebase Analytics with IDFA, Facebook SDK, Adjust, AppsFlyer, etc.)
- No `AppTrackingTransparency` imports in the codebase
- No `requestTrackingPermission` or `trackingAuthorization` calls

### Fix Required (App Store Connect)
**This is NOT a code fix.** You must update the privacy label in App Store Connect:

1. Go to **App Store Connect** → **My Apps** → **GroomLink** → **App Privacy**
2. Under **Data Collection**, review each data type
3. For each data type, ensure the purpose is set correctly:
   - **NOT** "Track Users" 
   - Use appropriate purposes like:
     - "App Functionality" (for core features)
     - "Analytics" (if using non-tracking analytics)
     - "Developer Advertising" (if applicable)
4. Specifically check **"Other Data Types"** — this should NOT be marked as tracking
5. Save changes and resubmit

### Response to Apple Review
Reply in App Store Connect:
> "The app does not track users. We have updated the App Privacy information in App Store Connect to accurately reflect that no data is collected for tracking purposes. The app does not use AppTrackingTransparency because it does not track users."

---

## Issue 2: Guideline 5.1.1(v) - Phone Number Required

### Root Cause
The registration flow required a phone number, which Apple considers not directly relevant to the app's core functionality (browsing salons and booking appointments).

### Fix Applied
**Code changes made:**

1. **`apps/customer-app/src/screens/auth/ProfileSetupScreen.tsx`**:
   - Removed phone number validation check (lines 203-206)
   - Changed label from "Phone Number *" to "Phone Number" (line 381)
   - Updated hint text to "Optional — for booking confirmations and updates" (line 395)
   - Removed `!phoneNumber` from button disabled condition (line 452)
   - Phone format validation now only runs if phone is provided

2. **Backend already supports optional phone**:
   - `services/api/src/services/auth.service.ts` line 642: `phoneNumber: phoneNumber || null`
   - `apps/customer-app/src/api/auth.ts` line 71: `phoneNumber?: string` (already optional)

### Testing
- Users can now complete registration with only email, first name, and last name
- Phone number is optional but validated for correct format if provided
- Existing users with phone numbers are unaffected

---

## Next Steps

1. **Update App Store Connect privacy label** (Issue 1)
2. **Build and submit new version** with the phone number fix (Issue 2)
3. **Reply to Apple Review** explaining both fixes
4. **Resubmit for review**

### Build Command
```bash
cd apps/customer-app
eas build --platform ios --profile production --non-interactive --wait
```

After build completes, submit via:
```bash
eas submit --platform ios --profile production
```

---

## Summary

| Issue | Type | Status | Action Required |
|-------|------|--------|-----------------|
| 5.1.2(i) - Tracking | App Store Config | ❌ Not Fixed | Update privacy label in App Store Connect |
| 5.1.1(v) - Phone Required | Code Fix | ✅ Fixed | Rebuild and resubmit |
