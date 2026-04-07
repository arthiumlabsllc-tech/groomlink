# App Store Review Checklist

## Before Submission - Final Checks

### Functionality
- [ ] App launches without crashes
- [ ] All screens load properly
- [ ] Navigation works smoothly
- [ ] Back buttons work correctly
- [ ] Deep linking works (if implemented)
- [ ] Push notifications work (if implemented)

### Authentication
- [ ] Phone number input accepts valid Ghana numbers
- [ ] OTP is sent successfully
- [ ] OTP verification works
- [ ] New user can complete profile setup
- [ ] Existing user can log in
- [ ] Logout works properly
- [ ] Session persists appropriately

### Customer App Specific
- [ ] Home screen loads featured salons
- [ ] Search functionality works
- [ ] Salon details display correctly
- [ ] Booking flow works end-to-end
- [ ] Bookings list shows user's appointments
- [ ] Profile can be viewed and edited

### Partners App Specific
- [ ] Dashboard shows stats
- [ ] Bookings can be viewed and managed
- [ ] Services can be added/edited
- [ ] Staff can be managed
- [ ] Salon profile can be edited

### Network & Error Handling
- [ ] App handles no internet connection gracefully
- [ ] Error messages are user-friendly
- [ ] Loading states are shown during API calls
- [ ] Retry functionality works

### Performance
- [ ] App loads within 3 seconds
- [ ] Lists scroll smoothly
- [ ] Images load and cache properly
- [ ] No memory leaks during navigation

### Compliance
- [ ] Privacy policy URL is live
- [ ] Terms of service URL is live
- [ ] Support contact is provided
- [ ] App doesn't use private APIs
- [ ] App follows platform guidelines

### Assets
- [ ] App icon is correct size and format
- [ ] Splash screen displays properly
- [ ] Screenshots are provided for all required sizes
- [ ] Screenshots show actual app content (not mockups)
- [ ] App preview video (optional but recommended)

## Common Rejection Reasons to Avoid

1. **Crashes and Bugs**
   - Test thoroughly on real devices
   - Test on different OS versions

2. **Placeholder Content**
   - Remove all "Coming Soon" or placeholder text
   - Ensure all features work

3. **Incomplete Information**
   - Fill out all app store fields
   - Provide accurate description
   - Include privacy policy

4. **Misleading Users**
   - Don't exaggerate features
   - Don't use similar names to other apps
   - Don't mimic system alerts

5. **Web Content**
   - App should be native, not just a web wrapper
   - All features should work offline where appropriate

6. **Permissions**
   - Only request necessary permissions
   - Explain why each permission is needed
   - Handle denied permissions gracefully

## Testing on Real Devices

### Android
- Test on at least 2 different devices
- Test on different screen sizes
- Test on Android 10, 11, 12, 13, 14

### iOS
- Test on iPhone (various sizes)
- Test on iPad if supporting tablet
- Test on iOS 15, 16, 17

## Final Build Check

```bash
# Clean install
rm -rf node_modules
npm install

# Run tests
npm test

# Check for TypeScript errors
npx tsc --noEmit

# Build locally for testing
npx expo prebuild
```
