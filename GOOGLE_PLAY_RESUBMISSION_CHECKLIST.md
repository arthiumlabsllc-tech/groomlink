# Google Play Resubmission - Quick Checklist

## ✅ Pre-Submission Tasks

### 1. Deploy Privacy Policy
- [ ] Build landing page: `cd apps/landing && npm run build`
- [ ] Deploy to production server
- [ ] Verify URL works: https://groomlinkgh.com/privacy
- [ ] Test on mobile device
- [ ] Update phone number from placeholder to real number

### 2. Update Google Play Console - Data Safety Section

**Navigate to**: Policy → App content → Data safety → Manage

#### Advertising ID Question:
- [ ] **Q: Does your app use advertising ID?**
- [ ] **A: NO** ✅ (Verified - no ad SDKs, no tracking, no ads displayed)
- [ ] See `ADVERTISING_ID_ANALYSIS.md` for detailed verification

#### Data Collection (Select all that apply):

**Location**
- [x] Approximate location
- [x] Precise location
- [ ] Shared with third parties
- [x] Collected with user consent
- Purpose: Find nearby salons, provide navigation

**Personal Information**
- [x] Name
- [x] Email address
- [x] Phone number
- [x] Shared with salon partners (only when booking)
- Purpose: Account management, booking facilitation

**Financial Information**
- [x] Payment info (processed by Paystack, not stored)
- [ ] Not shared (handled by payment provider)
- Purpose: Process booking payments

**Photos and Videos**
- [x] Profile photos
- [x] Salon photos
- [ ] Only collected with explicit consent
- Purpose: User profiles, salon listings

**App Activity**
- [x] App interactions
- [x] In-app search history
- [x] Booking history
- [ ] Not shared externally
- Purpose: Improve service, personalization

**Device or Other IDs**
- [x] Device IDs
- [ ] Not shared
- Purpose: App functionality, fraud prevention

#### Data Sharing:
- [x] Data shared with salon partners (name, phone, booking details)
- [x] Data shared with service providers (Paystack, Google Maps, Firebase)
- [x] Data is NOT sold to third parties

#### Security Practices:
- [x] Data is encrypted in transit (TLS 1.2+)
- [x] Data is encrypted at rest (AES-256)
- [x] Users can request data deletion
- [ ] Committed to Google Play Families Policy (select NO)

#### Data Deletion:
- [x] Users can request account deletion
- [x] Deletion process: Email privacy@groomlinkgh.com or use app settings
- [x] Deletion timeline: Within 30 days

### 3. Privacy Policy URL
- [ ] Enter: `https://groomlinkgh.com/privacy`
- [ ] Verify link is accessible without authentication
- [ ] Test on multiple devices

### 4. App Permissions (Verify in app.json)

**Customer App** (`apps/customer-app/app.json`):
- [x] INTERNET - Required for app functionality
- [x] ACCESS_NETWORK_STATE - Required
- [x] ACCESS_FINE_LOCATION - Optional (user can deny)
- [x] ACCESS_COARSE_LOCATION - Optional
- [x] CAMERA - Optional (profile photos)
- [x] POST_NOTIFICATIONS - Optional (reminders)
- [x] FOREGROUND_SERVICE - Required for notifications
- [x] RECEIVE_BOOT_COMPLETED - Required for scheduled notifications
- [x] SCHEDULE_EXACT_ALARM - Required for appointment reminders
- [x] READ_EXTERNAL_STORAGE - Optional (photo upload)
- [x] WRITE_EXTERNAL_STORAGE - Optional

**Partners App** (`apps/partners-app/app.json`):
- Same as above plus:
- [x] READ_MEDIA_IMAGES - For Android 13+ photo access

### 5. Final Review
- [ ] Privacy policy matches Data Safety form exactly
- [ ] All app permissions are disclosed in privacy policy
- [ ] Contact information is valid and monitored
- [ ] No placeholder data (phone numbers, emails, addresses)
- [ ] Third-party services have privacy policy links

---

## 📤 Submission Steps

### For Customer App:
1. [ ] Go to Google Play Console
2. [ ] Select "GroomLink" app
3. [ ] Navigate to Release → Production
4. [ ] Click "Create new release"
5. [ ] Upload new App Bundle (AAB file)
6. [ ] Review Data Safety section
7. [ ] Review app content policy
8. [ ] Submit for review

### For Partners App:
1. [ ] Go to Google Play Console
2. [ ] Select "GroomLink Partners" app
3. [ ] Navigate to Release → Production
4. [ ] Click "Create new release"
5. [ ] Upload new App Bundle (AAB file)
6. [ ] Review Data Safety section
7. [ ] Review app content policy
8. [ ] Submit for review

---

## ⏱️ Review Timeline

- **Initial Review**: 1-7 days (sometimes longer for new apps)
- **If Rejected**: You'll receive email with specific issues
- **Resubmission**: Can be done immediately after fixing issues

---

## 🚨 Common Issues to Avoid

❌ **Don't:**
- Use placeholder phone numbers or emails
- Have privacy policy behind login
- Mismatch between Data Safety form and privacy policy
- Request permissions not mentioned in privacy policy
- Collect data without user consent

✅ **Do:**
- Make privacy policy publicly accessible
- Ensure all data collection is disclosed
- Match Data Safety form to privacy policy exactly
- Request only necessary permissions
- Provide clear consent mechanisms

---

## 📞 Support

If rejected again:
1. Read rejection email carefully
2. Check which policy was violated
3. Review privacy policy matches actual app behavior
4. Contact Google Play Developer Support if unclear

**Your Contact Info (in privacy policy):**
- Email: privacy@groomlinkgh.com
- Support: support@groomlinkgh.com
- Phone: +233 59 371 1285 / +233 20 933 6689

---

**Last Updated**: February 15, 2026  
**Status**: Ready for deployment after phone number update
