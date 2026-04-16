import * as Location from 'expo-location';
import * as AsyncStorage from 'expo-secure-store';
import { Alert, AppState, AppStateStatus } from 'react-native';
import { bookingApi } from '../api/booking';
import { Booking } from '../types';

const GEOFENCE_RADIUS_METERS = 100;
const CHECKIN_PROMPT_STORAGE_KEY = 'auto_checkin_prompted_bookings';

/**
 * Calculate distance between two coordinates using Haversine formula
 * Returns distance in meters
 */
export function getDistanceInMeters(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 6371000; // Earth's radius in meters
  const dLat = (lat2 - lat1) * Math.PI / 180;
  const dLon = (lon2 - lon1) * Math.PI / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Check if a booking is for today
 */
function isBookingToday(booking: Booking): boolean {
  const bookingDate = new Date(booking.scheduledDate);
  const today = new Date();
  return (
    bookingDate.getFullYear() === today.getFullYear() &&
    bookingDate.getMonth() === today.getMonth() &&
    bookingDate.getDate() === today.getDate()
  );
}

/**
 * Get list of booking IDs that have already been prompted for auto check-in
 */
async function getPromptedBookings(): Promise<Set<string>> {
  try {
    const data = await AsyncStorage.getItemAsync(CHECKIN_PROMPT_STORAGE_KEY);
    if (data) {
      return new Set(JSON.parse(data));
    }
  } catch (error) {
    console.error('Error reading prompted bookings:', error);
  }
  return new Set();
}

/**
 * Mark a booking as prompted for auto check-in
 */
async function markBookingAsPrompted(bookingId: string): Promise<void> {
  try {
    const prompted = await getPromptedBookings();
    prompted.add(bookingId);
    // Keep only last 50 entries to avoid storage bloat
    const entries = Array.from(prompted).slice(-50);
    await AsyncStorage.setItemAsync(CHECKIN_PROMPT_STORAGE_KEY, JSON.stringify(entries));
  } catch (error) {
    console.error('Error saving prompted booking:', error);
  }
}

/**
 * Clear old entries from prompted bookings (cleanup for bookings from previous days)
 */
async function cleanupOldPromptedBookings(currentBookingIds: string[]): Promise<void> {
  try {
    const prompted = await getPromptedBookings();
    const currentSet = new Set(currentBookingIds);
    const validEntries = Array.from(prompted).filter(id => currentSet.has(id));
    await AsyncStorage.setItemAsync(CHECKIN_PROMPT_STORAGE_KEY, JSON.stringify(validEntries));
  } catch (error) {
    console.error('Error cleaning up prompted bookings:', error);
  }
}

export interface AutoCheckInResult {
  success: boolean;
  message: string;
  queuePosition?: number;
  salonName?: string;
}

export interface ProximityCheckResult {
  isNearby: boolean;
  booking: Booking;
  distance: number;
}

/**
 * Service for handling geofence-based auto check-in
 */
class AutoCheckinService {
  private appStateSubscription: ReturnType<typeof AppState.addEventListener> | null = null;
  private isChecking = false;

  /**
   * Request location permission
   */
  async requestLocationPermission(): Promise<boolean> {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission Required',
          'GroomLink uses your location to automatically check you in when you arrive at the salon. Please enable location permissions in your device settings.',
          [{ text: 'OK' }]
        );
        return false;
      }
      return true;
    } catch (error) {
      console.error('Error requesting location permission:', error);
      return false;
    }
  }

  /**
   * Get current location
   */
  async getCurrentLocation(): Promise<Location.LocationObject | null> {
    try {
      const hasPermission = await this.requestLocationPermission();
      if (!hasPermission) {
        return null;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.Balanced,
        timeInterval: 10000,
      });
      return location;
    } catch (error) {
      console.error('Error getting current location:', error);
      return null;
    }
  }

  /**
   * Check which bookings are nearby (within geofence radius)
   */
  async checkProximity(
    bookings: Booking[]
  ): Promise<ProximityCheckResult[]> {
    const location = await this.getCurrentLocation();
    if (!location) {
      return [];
    }

    const { latitude, longitude } = location.coords;
    const nearbyBookings: ProximityCheckResult[] = [];

    for (const booking of bookings) {
      // Skip if salon has no coordinates
      if (!booking.salon?.latitude || !booking.salon?.longitude) {
        continue;
      }

      const distance = getDistanceInMeters(
        latitude,
        longitude,
        booking.salon.latitude,
        booking.salon.longitude
      );

      if (distance <= GEOFENCE_RADIUS_METERS) {
        nearbyBookings.push({
          isNearby: true,
          booking,
          distance,
        });
      }
    }

    return nearbyBookings;
  }

  /**
   * Perform auto check-in for a booking
   */
  async performAutoCheckIn(booking: Booking): Promise<AutoCheckInResult> {
    try {
      const location = await this.getCurrentLocation();
      if (!location) {
        return {
          success: false,
          message: 'Unable to get your location. Please try again.',
        };
      }

      const { latitude, longitude } = location.coords;

      // Call the auto check-in API
      const response = await bookingApi.autoCheckIn(booking.id, latitude, longitude);

      return {
        success: true,
        message: response.message,
        queuePosition: response.queuePosition,
        salonName: response.booking.salon?.businessName,
      };
    } catch (error: any) {
      const message = error.response?.data?.message || 'Failed to check in. Please try again or check in with salon staff.';
      return {
        success: false,
        message,
      };
    }
  }

  /**
   * Check for nearby bookings and prompt for auto check-in
   * Returns true if a prompt was shown
   */
  async checkAndPromptForCheckIn(
    bookings: Booking[],
    onCheckInSuccess?: (bookingId: string, queuePosition: number) => void
  ): Promise<boolean> {
    // Prevent multiple simultaneous checks
    if (this.isChecking) {
      return false;
    }
    this.isChecking = true;

    try {
      // Filter for today's confirmed bookings that haven't been checked in
      const eligibleBookings = bookings.filter(
        (b) =>
          b.status === 'CONFIRMED' &&
          !b.checkedIn &&
          isBookingToday(b)
      );

      if (eligibleBookings.length === 0) {
        return false;
      }

      // Clean up old prompted booking entries
      await cleanupOldPromptedBookings(bookings.map(b => b.id));

      // Get bookings we've already prompted for
      const promptedBookings = await getPromptedBookings();

      // Check proximity for eligible bookings
      const nearbyResults = await this.checkProximity(eligibleBookings);

      // Filter out bookings we've already prompted for
      const unpromptedNearby = nearbyResults.filter(
        (result) => !promptedBookings.has(result.booking.id)
      );

      if (unpromptedNearby.length === 0) {
        return false;
      }

      // Take the closest booking
      const closest = unpromptedNearby.reduce((prev, curr) =>
        curr.distance < prev.distance ? curr : prev
      );

      const { booking, distance } = closest;
      const salonName = booking.salon?.businessName || 'the salon';

      // Mark as prompted before showing alert
      await markBookingAsPrompted(booking.id);

      // Show prompt to user
      return new Promise((resolve) => {
        Alert.alert(
          "You've Arrived!",
          `You're ${Math.round(distance)}m from ${salonName}. Would you like to check in automatically?`,
          [
            {
              text: 'No, Thanks',
              style: 'cancel',
              onPress: () => resolve(true),
            },
            {
              text: 'Check In',
              style: 'default',
              onPress: async () => {
                const result = await this.performAutoCheckIn(booking);
                if (result.success) {
                  Alert.alert(
                    'Checked In!',
                    result.message,
                    [{ text: 'OK' }]
                  );
                  if (onCheckInSuccess && result.queuePosition) {
                    onCheckInSuccess(booking.id, result.queuePosition);
                  }
                } else {
                  Alert.alert(
                    'Check-In Failed',
                    result.message,
                    [{ text: 'OK' }]
                  );
                }
                resolve(true);
              },
            },
          ]
        );
      });
    } finally {
      this.isChecking = false;
    }
  }

  /**
   * Start listening for app state changes to trigger proximity checks
   */
  startAppStateListener(
    getBookings: () => Booking[],
    onCheckInSuccess?: (bookingId: string, queuePosition: number) => void
  ): void {
    this.appStateSubscription = AppState.addEventListener(
      'change',
      (nextAppState: AppStateStatus) => {
        if (nextAppState === 'active') {
          // App came to foreground, check proximity
          const bookings = getBookings();
          if (bookings.length > 0) {
            // Delay to allow UI to settle
            setTimeout(() => {
              this.checkAndPromptForCheckIn(bookings, onCheckInSuccess);
            }, 1000);
          }
        }
      }
    );
  }

  /**
   * Stop listening for app state changes
   */
  stopAppStateListener(): void {
    if (this.appStateSubscription) {
      this.appStateSubscription.remove();
      this.appStateSubscription = null;
    }
  }
}

// Export singleton instance
export const autoCheckinService = new AutoCheckinService();

export default autoCheckinService;
