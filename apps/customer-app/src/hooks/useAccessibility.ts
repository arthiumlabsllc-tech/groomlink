import { useEffect, useState, useCallback } from 'react';
import { AccessibilityInfo, Platform } from 'react-native';

/**
 * Accessibility utility hook for GroomLink Customer App.
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
   * Announce a message to screen reader users.
   */
  const announce = useCallback((message: string) => {
    AccessibilityInfo.announceForAccessibility(message);
  }, []);

  /**
   * Post an announcement with a slight delay.
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
 * Format currency for accessibility labels.
 */
export function a11yCurrency(amount: number | string): string {
  const num = parseFloat(String(amount));
  if (isNaN(num)) return '0 cedis';
  return `${num.toFixed(2)} Ghana cedis`;
}

/**
 * Format time for accessibility labels.
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
 * Format duration for accessibility labels.
 */
export function a11yDuration(minutes: number): string {
  if (minutes < 60) return `${minutes} minutes`;
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (mins === 0) return hours === 1 ? '1 hour' : `${hours} hours`;
  return `${hours} hour${hours > 1 ? 's' : ''} and ${mins} minutes`;
}

/**
 * Build salon card accessibility label.
 */
export function a11ySalonLabel(salon: {
  businessName?: string;
  averageRating?: number;
  totalReviews?: number;
  address?: string;
  distance?: number;
}): string {
  const name = salon.businessName || 'Salon';
  const rating = salon.averageRating ? `rated ${salon.averageRating.toFixed(1)} stars` : 'no rating yet';
  const reviews = salon.totalReviews ? `${salon.totalReviews} reviews` : '';
  const location = salon.address || '';
  const dist = salon.distance ? `${salon.distance.toFixed(1)} km away` : '';
  return `${name}, ${rating}${reviews ? `, ${reviews}` : ''}${location ? `, ${location}` : ''}${dist ? `, ${dist}` : ''}. Double tap to view.`;
}

/**
 * Build time slot accessibility label.
 */
export function a11yTimeSlotLabel(slot: {
  time: string;
  available: boolean;
  isBreak?: boolean;
  remainingSpots?: number;
}): string {
  if (slot.isBreak) return `Break time at ${a11yTime(slot.time)}, not available`;
  if (!slot.available) return `${a11yTime(slot.time)}, fully booked`;
  const spots = slot.remainingSpots !== undefined ? `, ${slot.remainingSpots} spots remaining` : '';
  return `${a11yTime(slot.time)}, available${spots}. Double tap to select.`;
}

/**
 * Build customer booking card accessibility label.
 */
export function a11yBookingLabel(booking: {
  salon?: { businessName?: string };
  services?: { name: string }[];
  scheduledDate?: string;
  date?: string;
  scheduledTime?: string;
  startTime?: string;
  status: string;
  totalAmount: number | string;
  worker?: { fullName: string } | null;
}): string {
  const salon = booking.salon?.businessName || 'Salon';
  const status = booking.status.replace(/_/g, ' ').toLowerCase();
  const services = booking.services?.map(s => s.name).join(', ') || 'service';
  const amount = a11yCurrency(booking.totalAmount);
  const date = booking.scheduledDate || booking.date || '';
  const time = booking.scheduledTime || booking.startTime || '';
  const worker = booking.worker ? `, with ${booking.worker.fullName}` : '';
  return `${salon}, ${services}, ${status}, ${date ? date + ' ' : ''}${time ? a11yTime(time) : ''}${worker}, ${amount}. Double tap for details.`;
}
