# 📱 GroomLink - Google Play Store Upload Guide (Both Apps)

## 🎯 Complete Guide for Customer & Partners Apps

---

## **App Overview**

### **1. GroomLink (Customer App)**
- **Package**: `com.arthiumlabs.groomlink` ✅
- **App Name**: GroomLink
- **Purpose**: Customers book pet grooming services
- **Current Status**: Build in progress on EAS ✅
- **Color Theme**: Red (#CE1126)

### **2. GroomLink Partners (Partners App)**
- **Package**: `com.arthiumlabs.partners` ✅
- **App Name**: GroomLink Partners
- **Purpose**: Salon owners manage their business
- **Current Status**: Ready to build
- **Color Theme**: Green (#006B3F)

---

## **Phase 1: Google Play Developer Account**

### **Step 1: Setup Account**

1. **Create Account**
   - URL: https://play.google.com/console
   - Pay $25 one-time registration fee
   - Complete identity verification (1-2 days)

2. **Developer Profile**
   ```
   Developer Name: Arthium Labs
   Contact Email: support@groomlinkgh.com
   Phone: +233 XX XXX XXXX
   Website: https://groomlinkgh.com
   Address: [Your business address in Ghana]
   ```

---

## **Phase 2: Build Both Apps**

### **App 1: Customer App (Currently Building)**

**Status**: ✅ Build in progress on EAS servers

**Monitor Build**:
```bash
cd /home/ubuntu/Desktop/GroomLink/apps/customer-app

# Check build status
eas build:list

# Or visit: https://expo.dev/accounts/gr3enink/projects/groomlink-customer/builds
```

**Expected Completion**: ~10-20 minutes

### **App 2: Partners App (Ready to Build)**

**Start Build**:
```bash
cd /home/ubuntu/Desktop/GroomLink/apps/partners-app

# Build production AAB
eas build --platform android --profile production
```

**What this does**:
- Builds on Expo cloud servers
- Generates `.aab` file for Google Play
- Auto-increments versionCode to 2
- Takes 10-20 minutes

---

## **Phase 3: Prepare Assets for Both Apps**

### **Customer App Assets**

#### **✅ App Icon** (Exists)
- Location: `/apps/customer-app/assets/icon.png`
- Size: 512x512 pixels

#### **📸 Screenshots Needed** (Capture from app)
1. Home screen - Salon discovery
2. Salon profile - Services & reviews
3. Booking flow - Date/time selection
4. Payment screen - Mobile Money payment
5. User profile - Account settings

#### **🎨 Feature Graphic** (Create)
- Size: 1024x500 pixels
- Brand colors: #CE1126 (red), #FCD116 (gold)
- Text: "Book Trusted Pet Grooming"

---

### **Partners App Assets**

#### **✅ App Icon** (Exists)
- Location: `/apps/partners-app/assets/icon.png`
- Size: 512x512 pixels

#### **📸 Screenshots Needed** (Capture from app)
1. Dashboard - Bookings overview
2. Queue management - Active appointments
3. Booking details - Customer info
4. Staff management - Team view
5. Insights - Analytics dashboard

#### **🎨 Feature Graphic** (Create)
- Size: 1024x500 pixels
- Brand colors: #006B3F (green), #FCD116 (gold)
- Text: "Manage Your Pet Grooming Business"

---

## **Phase 4: Create Apps in Play Console**

### **Create Customer App**

1. **Go to Play Console**
   - https://play.google.com/console
   - Click **"Create app"**

2. **App Details**
   ```
   App name: GroomLink
   Default language: English (US)
   App or game: App
   Free or paid: Free
   ```

3. **Store Listing**
   ```
   Short Description (80 chars):
   Book trusted pet grooming salons in Ghana
   
   Full Description (4000 chars):
   GroomLink is Ghana's premier pet grooming booking platform. 
   Find trusted salons, book appointments, and pay securely - 
   all in one app.
   
   Features:
   • Discover nearby pet grooming salons
   • View services, pricing & reviews
   • Book appointments instantly
   • Secure payments via Mobile Money & cards
   • Real-time booking notifications
   • Salon queue management
   • Pet grooming history tracking
   
   Perfect for dog and cat owners in Accra, Kumasi, and beyond!
   ```

4. **Category**
   ```
   Category: Lifestyle
   App Type: Consumer
   ```

---

### **Create Partners App**

1. **Click "Create app" again**

2. **App Details**
   ```
   App name: GroomLink Partners
   Default language: English (US)
   App or game: App
   Free or paid: Free
   ```

3. **Store Listing**
   ```
   Short Description (80 chars):
   Manage your pet grooming salon business
   
   Full Description (4000 chars):
   GroomLink Partners is the companion app for pet grooming 
   salon owners. Manage your business, accept bookings, and 
   grow your client base.
   
   Features:
   • Real-time booking notifications
   • Queue management system
   • Staff scheduling & management
   • Customer reviews & ratings
   • Business analytics & insights
   • Service catalog management
   • Business hours configuration
   • Payment tracking & payouts
   
   Empowering pet grooming businesses across Ghana!
   ```

4. **Category**
   ```
   Category: Business
   App Type: Business
   ```

---

## **Phase 5: Upload App Bundles**

### **Upload Customer App**

1. **Production → Create new release**

2. **Upload `.aab` file**
   - Download from: https://expo.dev/accounts/gr3enink/projects/groomlink-customer/builds
   - Or via CLI: `eas build:download --platform android`

3. **Release Notes**
   ```
   What's new:
   • Initial release of GroomLink
   • Browse and book pet grooming salons
   • Secure payments via Mobile Money
   • Real-time notifications
   • Salon reviews and ratings
   ```

4. **Review & Rollout**
   - Click "Review release"
   - Click "Start rollout to Production"

---

### **Upload Partners App**

1. **Production → Create new release**

2. **Upload `.aab` file**
   - Download from: https://expo.dev/accounts/gr3enink/projects/groomlink-partners/builds
   - Or via CLI: `cd apps/partners-app && eas build:download --platform android`

3. **Release Notes**
   ```
   What's new:
   • Initial release of GroomLink Partners
   • Manage bookings and appointments
   • Queue management system
   • Staff management tools
   • Business analytics dashboard
   • Real-time notifications
   ```

4. **Review & Rollout**
   - Click "Review release"
   - Click "Start rollout to Production"

---

## **Phase 6: Complete App Content (Both Apps)**

### **Required for Both Apps:**

1. **Data Safety Form**
   - Does app collect user data? **Yes**
   - Data types:
     - ✅ Location (finding salons / salon address)
     - ✅ Personal info (name, email, phone)
     - ✅ Financial info (payments / payouts)
     - ✅ Photos (profile/salon pictures)
   - Data encrypted in transit? **Yes**
   - Users can request deletion? **Yes**

2. **App Access**
   - Does Google need login to test? **Yes**
   
   **Customer App Test Credentials:**
   ```
   Email: test@groomlinkgh.com
   Password: [Create test account]
   ```
   
   **Partners App Test Credentials:**
   ```
   Email: salon@test.com
   Password: [Create test salon account]
   ```

3. **Advertising**
   - Contains ads? **No**

4. **Target Audience**
   - Age group: **13+**

5. **Privacy Policy**
   - URL: https://groomlinkgh.com/privacy-policy
   - Same URL for both apps

---

## **Phase 7: Testing Before Launch**

### **Internal Testing (Recommended)**

**For Each App:**

1. **Create Internal Testing Track**
   - Testing → Internal testing
   - Create new release
   - Upload `.aab`

2. **Add Testers**
   - Add email addresses (up to 100)
   - Share opt-in link

3. **Test Checklist**
   - [ ] App installs successfully
   - [ ] Login/Signup works
   - [ ] Main features functional
   - [ ] No crashes on launch
   - [ ] Notifications work
   - [ ] Payment flow works (customer app)
   - [ ] Booking management works (partners app)

---

## **Phase 8: Launch Both Apps**

### **Final Checklist**

**Customer App:**
- [ ] Store listing complete
- [ ] Screenshots uploaded (min 2)
- [ ] Feature graphic uploaded
- [ ] Privacy policy URL added
- [ ] Data safety form completed
- [ ] App content questionnaire done
- [ ] No errors in release
- [ ] Internal testing completed

**Partners App:**
- [ ] Store listing complete
- [ ] Screenshots uploaded (min 2)
- [ ] Feature graphic uploaded
- [ ] Privacy policy URL added
- [ ] Data safety form completed
- [ ] App content questionnaire done
- [ ] No errors in release
- [ ] Internal testing completed

### **Publish Both Apps**

1. **Customer App** → "Start rollout to Production"
2. **Partners App** → "Start rollout to Production"
3. **Wait for Google review** (1-7 days each)
4. **Both apps go live!** 🎉

---

## **🚀 Quick Command Reference**

### **Customer App Commands**
```bash
cd /home/ubuntu/Desktop/GroomLink/apps/customer-app

# Check current build
eas build:list

# Download latest build
eas build:download --platform android

# Build new version
eas build --platform android --profile production
```

### **Partners App Commands**
```bash
cd /home/ubuntu/Desktop/GroomLink/apps/partners-app

# Start build
eas build --platform android --profile production

# Check build status
eas build:list

# Download build
eas build:download --platform android
```

### **Build for Both Apps**
```bash
# Build Customer App
cd /home/ubuntu/Desktop/GroomLink/apps/customer-app
eas build --platform android --profile production

# Build Partners App (in new terminal)
cd /home/ubuntu/Desktop/GroomLink/apps/partners-app
eas build --platform android --profile production
```

---

## **📊 App Configuration Summary**

### **Customer App**
```json
{
  "name": "GroomLink",
  "package": "com.arthiumlabs.groomlink",
  "version": "1.0.0",
  "versionCode": 2,
  "projectId": "81417e23-6df9-4792-bf49-7829dd1d130e"
}
```

### **Partners App**
```json
{
  "name": "GroomLink Partners",
  "package": "com.arthiumlabs.partners",
  "version": "1.0.0",
  "versionCode": 1,
  "projectId": "0c94a806-7dcb-42fe-935f-8c577b83e053"
}
```

---

## **⚠️ Important Notes**

1. **Package Names are PERMANENT**
   - `com.arthiumlabs.groomlink` (Customer)
   - `com.arthiumlabs.partners` (Partners)
   - Cannot be changed after first upload!

2. **Separate Apps in Play Console**
   - Each app needs its own store listing
   - Each app reviewed independently
   - Can be published at different times

3. **App Signing**
   - EAS creates signing keystores automatically
   - Google manages app signing (Play App Signing)
   - Keep keystore passwords safe!

4. **Future Updates**
   ```bash
   # Update each app separately
   cd apps/customer-app && eas build --platform android --profile production
   cd apps/partners-app && eas build --platform android --profile production
   ```

5. **Version Management**
   - versionCode auto-increments with EAS
   - Keep semantic versioning in app.json
   - Both apps can have different version numbers

---

## **📅 Timeline**

### **Day 1: Today**
- ✅ Package names updated
- ✅ Customer app build started
- ⏳ Partners app build (ready to start)
- 📸 Prepare screenshots & feature graphics

### **Day 2-3**
- ✅ Builds complete
- 📝 Complete store listings
- 📤 Upload both `.aab` files
- ✅ Submit for review

### **Day 3-10**
- ⏳ Google review process
- 📧 Monitor email for approval
- 🎉 Both apps go live!

---

## **🆘 Troubleshooting**

### **Build Fails**
```bash
# For either app:
cd /home/ubuntu/Desktop/GroomLink/apps/[app-name]
rm -rf node_modules
npm install
eas build --platform android --profile production
```

### **Upload Rejected**
- Check email for rejection reason
- Common issues:
  - Missing privacy policy
  - Incomplete data safety form
  - App crashes on launch
  - Policy violations

### **Different Package Name Error**
- Verify in app.json:
  ```bash
  cat app.json | grep package
  ```
- Should show unique package for each app

---

## **📞 Support Resources**

- **Google Play Console Help**: https://support.google.com/googleplay/android-developer
- **Expo Docs**: https://docs.expo.dev/
- **EAS Build Docs**: https://docs.expo.dev/build/introduction/
- **Google Play Policies**: https://play.google.com/about/developer-content-policy/

---

## **✅ Final Upload Checklist**

### **Both Apps Must Have:**
- [x] Unique package names
- [x] App icons (512x512)
- [ ] Screenshots (min 2 each)
- [ ] Feature graphics (1024x500 each)
- [ ] Privacy policy URL
- [ ] Store descriptions
- [ ] Data safety forms
- [ ] App content questionnaires
- [ ] Test credentials
- [ ] `.aab` files built & downloaded
- [ ] Internal testing completed

---

**🎉 Once both apps are approved, you'll have:**
- **GroomLink** on Play Store for customers
- **GroomLink Partners** on Play Store for salon owners

**Users can search and download both apps directly!**
