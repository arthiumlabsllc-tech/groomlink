import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utility hook for GroomLink Partners App.
 * Provides system accessibility state and helper functions.
 */
export function useAccessibility() {
  const [isReduceMotionEnabled, setIsReduceMotionEnabled] = useState(false);
  const [isScreenReaderEnabled, setIsScreenReaderEnabled] = useState(false);
  const [isBoldTextEnabled, setIsBoldTextEnabled] = useState(false);

  useEffect(() => {
    // Check initial states
    AccessibilityInfo.isReduceMotionEnabled().then(setIsReduceMotionEnabled);
    AccessibilityInfo.isScreenReaderEnabled().then(setIsScreenReaderEnabled);
    if (Platform.OS === 'ios') {
      AccessibilityInfo.isBoldTextEnabled().then(setIsBoldTextEnabled);
    }

    // Listen for changes
    const reduceMotionSub = AccessibilityInfo.addEventListener(
      'reduceMotionChanged',
      setIsReduceMotionEnabled
    );
    const screenReaderSub = AccessibilityInfo.addEventListener(
      'screenReaderChanged',
      setIsScreenReaderEnabled
    );
    const boldTextSub = Platform.OS === 'ios'
      ? AccessibilityInfo.addEventListener('boldTextChanged', setIsBoldTextEnabled)
      : null;

    return () => {
      reduceMotionSub.remove();
      screenReaderSub.remove();
      boldTextSub?.remove();
    };
  }, []);

  /**
   * Announce a message to screen reader users (e.g., after async action completes).
   */
  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  /**
   * Post an announcement with a slight delay (useful after navigation or state changes).
   */
  const announceDelayed = useCallback((message: string, delayMs = 500) => {
    setTimeout(() => {
      AccessibilityInfo.announceForAccessibility(message);
    }, delayMs);
  }, []);

  return {
    isReduceMotionEnabled,
    isScreenReaderEnabled,
    isBoldTextEnabled,
    announce,
    announceDelayed,
  };
}

/**
 * Helper to format currency for accessibility labels.
 */
export function a11yCurrency(amount: number | string): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return '0 cedis';
  return `${num.toFixed(2)} Ghana cedis`;
}

/**
 * Helper to format time for accessibility labels (e.g., "9:30 AM").
 */
export function a11yTime(time: string): string {
  if (!time || typeof time !== 'string' || !time.includes(':')) return time || 'unknown time';
  const [hours, minutes] = time.split(':');
  const hour = parseInt(hours);
  const ampm = hour >= 12 ? 'PM' : 'AM';
  const displayHour = hour % 12 || 12;
  return `${displayHour}:${minutes} ${ampm}`;
}

/**
 * Helper to format duration for accessibility labels.
 */
export function a11yDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minutes`;
}

/**
 * Helper to build booking accessibility label.
 */
export function a11yBookingLabel(booking: {
  customer?: { firstName?: string; lastName?: string };
  service?: { name?: string };
  status?: string;
  startTime?: string;
  finalAmount?: number | string;
}): string {
  const customer = `${booking.customer?.firstName || ''} ${booking.customer?.lastName || ''}`.trim() || 'Unknown customer';
  const service = booking.service?.name || 'Service';
  const status = booking.status || 'unknown status';
  const time = booking.startTime ? a11yTime(booking.startTime) : '';
  const amount = booking.finalAmount ? `, ${a11yCurrency(booking.finalAmount)}` : '';
  return `${customer}, ${service}, ${status}${time ? ` at ${time}` : ''}${amount}. Double tap to view details.`;
}
