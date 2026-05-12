/**
 * Notification sound utility for support dashboard
 * Plays a subtle alert sound when new chats/messages arrive
 */

let audioContext: AudioContext | null = null;

/**
 * Play a notification sound using Web Audio API
 * Creates a pleasant two-tone chime without requiring external files
 */
export function playNotificationSound() {
  try {
    // Create audio context on first user interaction (browser policy)
    if (!audioContext) {
      audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
    }

    const now = audioContext.currentTime;

    // First tone (higher pitch)
    const oscillator1 = audioContext.createOscillator();
    const gainNode1 = audioContext.createGain();
    
    oscillator1.connect(gainNode1);
    gainNode1.connect(audioContext.destination);
    
    oscillator1.frequency.value = 880; // A5 note
    oscillator1.type = 'sine';
    
    gainNode1.gain.setValueAtTime(0.3, now);
    gainNode1.gain.exponentialRampToValueAtTime(0.01, now + 0.3);
    
    oscillator1.start(now);
    oscillator1.stop(now + 0.3);

    // Second tone (lower pitch) - plays 150ms after first
    const oscillator2 = audioContext.createOscillator();
    const gainNode2 = audioContext.createGain();
    
    oscillator2.connect(gainNode2);
    gainNode2.connect(audioContext.destination);
    
    oscillator2.frequency.value = 660; // E5 note
    oscillator2.type = 'sine';
    
    gainNode2.gain.setValueAtTime(0.3, now + 0.15);
    gainNode2.gain.exponentialRampToValueAtTime(0.01, now + 0.45);
    
    oscillator2.start(now + 0.15);
    oscillator2.stop(now + 0.45);

  } catch (error) {
    // Silently fail if audio is not supported
    console.warn('Notification sound failed to play:', error);
  }
}

/**
 * Initialize audio context on first user interaction
 * Call this when the support agent first clicks anywhere on the dashboard
 */
let initialized = false;
export function initNotificationSound() {
  if (initialized) return;
  
  const init = () => {
    try {
      if (!audioContext) {
        audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      }
      initialized = true;
    } catch (e) {
      console.warn('Failed to initialize audio context:', e);
    }
  };

  // Initialize on first click or keypress
  document.addEventListener('click', init, { once: true });
  document.addEventListener('keydown', init, { once: true });
  
  // Also try to initialize immediately (works if user has already interacted)
  init();
}
