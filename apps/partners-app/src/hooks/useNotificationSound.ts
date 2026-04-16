/**
 * Notification Sound Hook for Mobile App
 * Uses expo-av to play notification sounds for different events
 */
import { useRef, useCallback, useEffect } from 'react';
import { Audio, AVPlaybackStatus } from 'expo-av';
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

type NotificationSoundType = 'booking' | 'checkin' | 'completion';

// Sound file URIs (we'll generate these using expo-av)
// For simplicity, we'll use the system default notification sound
// In a production app, you'd include actual sound files in the assets folder

class NotificationSoundPlayer {
  private enabled: boolean = true;
  private initialized: boolean = false;

  async initialize() {
    if (this.initialized) return;
    
    try {
      // Configure audio mode for playback
      await Audio.setAudioModeAsync({
        playsInSilentModeIOS: true,
        staysActiveInBackground: true,
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
   * Play a notification sound using synthesized tones
   * Since we don't have audio files, we'll use a simple approach with expo-av
   * In production, you'd use actual audio files from assets
   */
  async playBookingSound() {
    if (!this.enabled) return;
    await this.initialize();
    
    // For now, we'll trigger a local notification with sound
    // In production, you would use actual audio files
    await this.playLocalNotification(
      'New Booking',
      'A new booking has been received',
      'booking'
    );
  }

  async playCheckinSound() {
    if (!this.enabled) return;
    await this.initialize();
    
    await this.playLocalNotification(
      'Customer Checked In',
      'A customer has checked in',
      'checkin'
    );
  }

  async playCompletionSound() {
    if (!this.enabled) return;
    await this.initialize();
    
    await this.playLocalNotification(
      'Service Completed',
      'A service has been completed',
      'completion'
    );
  }

  async play(type: NotificationSoundType) {
    switch (type) {
      case 'booking':
        await this.playBookingSound();
        break;
      case 'checkin':
        await this.playCheckinSound();
        break;
      case 'completion':
        await this.playCompletionSound();
        break;
    }
  }

  private async playLocalNotification(title: string, body: string, type: NotificationSoundType) {
    try {
      // Configure notification handler
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSetBadge: false,
        }),
      });

      // Schedule a local notification with sound
      await Notifications.scheduleNotificationAsync({
        content: {
          title,
          body,
          sound: 'default',
          priority: Notifications.AndroidNotificationPriority.HIGH,
        },
        trigger: null, // Immediately
      });
    } catch (error) {
      console.error('Failed to play notification sound:', error);
    }
  }
}

// Singleton instance
export const notificationSound = new NotificationSoundPlayer();

/**
 * React hook for notification sounds on mobile
 */
export function useNotificationSound() {
  const soundRef = useRef<NotificationSoundPlayer>(notificationSound);

  useEffect(() => {
    // Request notification permissions on mount
    const requestPermissions = async () => {
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      let finalStatus = existingStatus;
      
      if (existingStatus !== 'granted') {
        const { status } = await Notifications.requestPermissionsAsync();
        finalStatus = status;
      }
      
      if (finalStatus !== 'granted') {
        console.log('Notification permissions not granted');
      }
    };
    
    requestPermissions();
    
    // Initialize audio
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
