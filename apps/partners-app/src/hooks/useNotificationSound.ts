/**
 * Notification Sound Hook for Mobile App
 * Uses expo-av to play a system notification sound.
 * NOTE: Does NOT schedule notifications - App.tsx handles that.
 * This hook only provides haptic/audio feedback for real-time events.
 */
import { useRef, useCallback, useEffect } from 'react';
import { Audio } from 'expo-av';

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
   * Play the custom notification alert sound for in-app foreground feedback.
   * The actual push/local notification is handled by App.tsx via Notifications.scheduleNotificationAsync
   * which already includes `sound: 'notification_alert.wav'`. This method provides immediate
   * audio feedback when the app is in the foreground.
   */
  async playSound() {
    if (!this.enabled) return;
    await this.initialize();

    try {
      // Load and play the custom notification sound for immediate in-app feedback
      const { sound } = await Audio.Sound.createAsync(
        require('../../assets/notification_alert.wav')
      );
      await sound.playAsync();
      // Unload after playing to free memory
      sound.setOnPlaybackStatusUpdate((status) => {
        if (status.isLoaded && status.didJustFinish) {
          sound.unloadAsync();
        }
      });
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
