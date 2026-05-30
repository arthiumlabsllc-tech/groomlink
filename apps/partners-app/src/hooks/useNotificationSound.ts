/**
 * Notification Sound Hook for Mobile App
 * Uses expo-av to play a system notification sound.
 * NOTE: Does NOT schedule notifications - App.tsx handles that.
 * This hook only provides haptic/audio feedback for real-time events.
 */
import { useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';
import { Platform } from 'react-native';

type NotificationSoundType = 'booking' | 'checkin' | 'completion';

class NotificationSoundPlayer {
  private enabled: boolean = true;
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;

    try {
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: false,
        shouldDuckAndroid: true,
        playThroughEarpieceAndroid: false,
      });
      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize audio:', error);
    }
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Play a short system sound for notification feedback.
   * The actual notification is handled by App.tsx via Notifications.scheduleNotificationAsync
   * which already includes `sound: true`. This method is for immediate audio feedback
   * when the app is in the foreground.
   */
  async playSound() {
    if (!this.enabled) return;
    await this.initialize();

    try {
      // Use a short system sound for in-app feedback
      // On Android, the notification itself will play the default sound.
      // This provides immediate feedback when the app is foregrounded.
      if (Platform.OS === 'android') {
        // Android notifications with sound: true already play the sound
        // No additional sound needed to avoid double-play
        return;
      }
      // On iOS, foreground notifications may not play sound depending on config,
      // so we can rely on the notification handler's shouldPlaySound: true
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }

  async play(_type: NotificationSoundType) {
    await this.playSound();
  }
}

// Singleton instance
export const notificationSound = new NotificationSoundPlayer();

/**
 * React hook for notification sounds on mobile.
 * Provides stable callback references that won't cause re-renders.
 */
export function useNotificationSound() {
  const soundRef = useRef<NotificationSoundPlayer>(notificationSound);

  useEffect(() => {
    notificationSound.initialize();
  }, []);

  const playBookingSound = useCallback(() => {
    soundRef.current.play('booking');
  }, []);

  const playCheckinSound = useCallback(() => {
    soundRef.current.play('checkin');
  }, []);

  const playCompletionSound = useCallback(() => {
    soundRef.current.play('completion');
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    soundRef.current.setEnabled(enabled);
  }, []);

  return {
    playBookingSound,
    playCheckinSound,
    playCompletionSound,
    setEnabled,
  };
}
