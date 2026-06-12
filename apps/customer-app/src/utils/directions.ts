import { Platform, Linking, Alert } from 'react-native';

/**
 * Opens the device's native maps app with turn-by-turn navigation
 * to the specified coordinates.
 * - iOS: Apple Maps (or user's default maps app)
 * - Android: Google Maps (or maps intent chooser)
 * - Fallback: Google Maps web URL
 */
export async function openDirections(
  latitude: number,
  longitude: number,
  label?: string
) {
  const encodedLabel = encodeURIComponent(label || 'Destination');

  // Build platform-specific URL
  const url = Platform.select({
    ios: `maps://app?daddr=${latitude},${longitude}&q=${encodedLabel}`,
    android: `google.navigation:q=${latitude},${longitude}`,
  });

  // Fallback to Google Maps web URL (works on both platforms)
  const webUrl = `https://www.google.com/maps/dir/?api=1&destination=${latitude},${longitude}&travelmode=driving`;

  try {
    const supported = await Linking.canOpenURL(url!);
    if (supported) {
      await Linking.openURL(url!);
    } else {
      await Linking.openURL(webUrl);
    }
  } catch (error) {
    Alert.alert('Unable to Open Maps', 'Please ensure you have a maps application installed.');
  }
}
