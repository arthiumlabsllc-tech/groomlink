/**
 * Notification Sound Hook for Mobile App
 * Uses expo-haptics to provide haptic feedback for real-time events.
 * The actual notification sounds are handled by expo-notifications
 * via sound: 'notification_alert.wav' in scheduleNotificationAsync.
 * NOTE: expo-av was removed (deprecated in SDK 53, replaced by expo-audio).
 */
import { useCallback } from 'react';
import * as Haptics from 'expo-haptics';

type NotificationSoundType = 'booking' | 'checkin' | 'completion';

class NotificationSoundPlayer {
  private enabled: boolean = true;

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Play haptic feedback for in-app foreground events.
   * The actual notification sound is handled by App.tsx via
   * Notifications.scheduleNotificationAsync which includes
   * `sound: 'notification_alert.wav'`.
   */
  async playSound() {
    if (!this.enabled) return;
    try {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } catch (error) {
      console.error('Failed to trigger haptic feedback:', error);
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
  const playBookingSound = useCallback(() => {
    notificationSound.play('booking');
  }, []);

  const playCheckinSound = useCallback(() => {
    notificationSound.play('checkin');
  }, []);

  const playCompletionSound = useCallback(() => {
    notificationSound.play('completion');
  }, []);

  const setEnabled = useCallback((enabled: boolean) => {
    notificationSound.setEnabled(enabled);
  }, []);

  return {
    playBookingSound,
    playCheckinSound,
    playCompletionSound,
    setEnabled,
  };
}
