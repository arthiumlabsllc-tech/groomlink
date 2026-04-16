/**
 * Notification Sound Utility
 * Uses Web Audio API to generate notification sounds for different events
 */

type NotificationSoundType = 'booking' | 'checkin' | 'completion';

class NotificationSoundPlayer {
  private audioContext: AudioContext | null = null;
  private enabled: boolean = true;

  private getAudioContext(): AudioContext {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    return this.audioContext;
  }

  setEnabled(enabled: boolean) {
    this.enabled = enabled;
  }

  /**
   * Play a pleasant chime for new bookings
   * Higher pitch, two-tone ascending
   */
  playBookingSound() {
    if (!this.enabled) return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // First tone (higher)
    this.playTone(ctx, now, 880, 0.15, 0.3); // A5
    // Second tone (higher)
    this.playTone(ctx, now + 0.15, 1108.73, 0.2, 0.3); // C#6
  }

  /**
   * Play a short confirmation beep for check-ins
   * Medium pitch, single tone
   */
  playCheckinSound() {
    if (!this.enabled) return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Medium pitch confirmation beep
    this.playTone(ctx, now, 659.25, 0.12, 0.25); // E5
    this.playTone(ctx, now + 0.12, 783.99, 0.15, 0.25); // G5
  }

  /**
   * Play a success sound for service completion
   * Ascending two-tone, pleasant resolution
   */
  playCompletionSound() {
    if (!this.enabled) return;
    
    const ctx = this.getAudioContext();
    const now = ctx.currentTime;

    // Ascending tones for completion
    this.playTone(ctx, now, 523.25, 0.15, 0.25); // C5
    this.playTone(ctx, now + 0.15, 659.25, 0.15, 0.25); // E5
    this.playTone(ctx, now + 0.3, 783.99, 0.2, 0.3); // G5
  }

  /**
   * Play a notification sound based on type
   */
  play(type: NotificationSoundType) {
    switch (type) {
      case 'booking':
        this.playBookingSound();
        break;
      case 'checkin':
        this.playCheckinSound();
        break;
      case 'completion':
        this.playCompletionSound();
        break;
    }
  }

  private playTone(
    ctx: AudioContext,
    startTime: number,
    frequency: number,
    duration: number,
    volume: number
  ) {
    const oscillator = ctx.createOscillator();
    const gainNode = ctx.createGain();

    oscillator.connect(gainNode);
    gainNode.connect(ctx.destination);

    oscillator.type = 'sine';
    oscillator.frequency.setValueAtTime(frequency, startTime);

    // Envelope for smooth sound
    gainNode.gain.setValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(volume, startTime + 0.01);
    gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + duration);

    oscillator.start(startTime);
    oscillator.stop(startTime + duration);
  }
}

// Singleton instance
export const notificationSound = new NotificationSoundPlayer();

/**
 * React hook for notification sounds
 */
export function useNotificationSound() {
  return {
    playBookingSound: () => notificationSound.play('booking'),
    playCheckinSound: () => notificationSound.play('checkin'),
    playCompletionSound: () => notificationSound.play('completion'),
    setEnabled: (enabled: boolean) => notificationSound.setEnabled(enabled),
  };
}
