# GroomLink Customer App - Store Submission Guide

## Prerequisites

### 1. Google Play Store (Android)

**Required Accounts:**
- Google Play Developer Account ($25 one-time fee)
- Google Cloud Platform account (for Service Account)

**Setup Steps:**

1. **Create Google Play Developer Account**
   - Go to https://play.google.com/console
   - Pay $25 registration fee
   - Complete account verification

2. **Create Service Account for EAS Submit**
   - Go to Google Cloud Console: https://console.cloud.google.com/
   - Create a new project or select existing
   - Enable "Google Play Android Developer API"
   - Go to IAM & Admin > Service Accounts
   - Create Service Account:
     - Name: "groomlink-eas-submit"
     - Role: "Editor" or "Owner"
   - Create Key (JSON format)
   - Download and save as `service-account-key.json`

3. **Link Service Account to Play Console**
   - In Play Console: Setup > API access
   - Link your Google Cloud project
   - Invite the service account with "Release Manager" role

4. **Create App in Play Console**
   - Click "Create app"
   - App name: "GroomLink"
   - Default language: English
   - App or game: App
   - Free or paid: Free
   - Check declarations
   - Create app

### 2. Apple App Store (iOS)

**Required Accounts:**
- Apple Developer Program ($99/year)

**Setup Steps:**

1. **Enroll in Apple Developer Program**
   - Go to https://developer.apple.com/programs/
   - Enroll as Organization (recommended) or Individual
   - Pay $99 annual fee
   - Complete verification (may take a few days)

2. **Create App in App Store Connect**
   - Go to https://appstoreconnect.apple.com
   - My Apps > Click "+" > New App
   - Platform: iOS
   - App Name: "GroomLink"
   - Primary Language: English
   - Bundle ID: com.groomlink.customer
   - SKU: groomlink-customer-001
   - User Access: Full Access

3. **Generate API Key for EAS Submit**
   - In App Store Connect: Users and Access > Keys
   - Click "+" to create new key
   - Name: "EAS Submit"
   - Access: App Manager
   - Download the .p8 file (can only download once!)
   - Note the Key ID and Issuer ID

## Build Configuration

### Update EAS Configuration

Edit `eas.json` with your actual credentials:

```json
{
  "submit": {
    "production": {
      "android": {
        "serviceAccountKeyPath": "./service-account-key.json"
      },
      "ios": {
        "ascAppId": "YOUR_APPLE_APP_ID",
        "ascApiKeyPath": "./AuthKey_XXXXXXXXXX.p8",
        "ascApiKeyIssuerId": "YOUR_ISSUER_ID",
        "ascApiKeyId": "YOUR_KEY_ID"
      }
    }
  }
}
```

### Required Assets

**App Icons:**
- icon.png: 1024x1024px
- adaptive-icon.png: 1024x1024px (Android)
- favicon.png: 48x48px
- splash.png: 1242x2436px (or 1284x2778px for iPhone 14 Pro)
- notification-icon.png: 96x96px

**Screenshots (Required for each device size):**

**iPhone:**
- 6.7" (iPhone 14 Pro Max): 1290x2796px (portrait)
- 6.5" (iPhone 11 Pro Max): 1242x2688px
- 5.5" (iPhone 8 Plus): 1242x2208px

**iPad:**
- 12.9" (iPad Pro): 2048x2732px

**Android:**
- Phone: 1080x1920px or 1080x2400px
- 7" Tablet: 1080x1920px
- 10" Tablet: 1920x1080px

## Build Commands

### Development/Testing
```bash
# Install dependencies
npm install

# Start development server
npx expo start

# Build preview APK (Android)
eas build --platform android --profile preview

# Build for iOS simulator
eas build --platform ios --profile preview
```

### Production Build & Submit
```bash
# Build and submit Android
eas build --platform android --profile production --auto-submit

# Build and submit iOS
eas build --platform ios --profile production --auto-submit

# Build and submit both
eas build --platform all --profile production --auto-submit
```

## App Store Information to Prepare

### Customer App
- **Name**: GroomLink
- **Subtitle**: Book Your Next Grooming Session
- **Category**: Lifestyle
- **Age Rating**: 4+
- **Price**: Free
- **Availability**: Ghana (initially, expand later)

### Partners App
- **Name**: GroomLink Partners
- **Subtitle**: Manage Your Barbershop Business
- **Category**: Business
- **Age Rating**: 4+
- **Price**: Free

## Privacy Policy Requirements

Required disclosures for both apps:
- Data collected: Name, Phone number, Email (optional), Location
- Purpose: Booking appointments, User authentication
- Third parties: None (except hosting/infrastructure)
- Data retention: Until account deletion

## Review Guidelines Checklist

- [ ] App is fully functional with no crashes
- [ ] All buttons and features work
- [ ] No placeholder content or "coming soon" features
- [ ] Proper error handling for network issues
- [ ] App doesn't request unnecessary permissions
- [ ] App icons and screenshots are professional
- [ ] App description accurately reflects functionality
- [ ] Privacy policy URL is accessible
- [ ] Support URL/contact is provided

## Post-Submission

### Typical Review Times
- Google Play: 1-3 days (sometimes hours)
- Apple App Store: 1-2 days

### After Approval
- Monitor crash reports
- Respond to user reviews
- Plan regular updates with new features
