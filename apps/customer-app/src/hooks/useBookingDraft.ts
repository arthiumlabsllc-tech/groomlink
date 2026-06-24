import { useState, useEffect, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { GuestData } from '../api/booking';
import { PaymentProvider } from '../api/payment';

const DRAFT_EXPIRY_MS = 24 * 60 * 60 * 1000; // 24 hours
const SAVE_DEBOUNCE_MS = 500;

export interface BookingDraft {
  salonId: string;
  selectedServices: string[];
  selectedDate: string;
  selectedTime: string | null;
  selectedWorker: string | null;
  notes: string;
  isGroupBooking: boolean;
  guests: GuestData[];
  phoneNumber: string;
  selectedPaymentMethod: PaymentProvider;
  savedAt: number; // timestamp for expiry
}

const DRAFT_KEY_PREFIX = 'booking_draft_';

function getDraftKey(salonId: string): string {
  return `${DRAFT_KEY_PREFIX}${salonId}`;
}

/**
 * Saves and restores booking draft state to AsyncStorage.
 * If the app closes during booking, the user can resume on next open.
 */
export function useBookingDraft(salonId: string) {
  const [draft, setDraft] = useState<BookingDraft | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load draft on mount
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const raw = await AsyncStorage.getItem(getDraftKey(salonId));
        if (cancelled) return;
        if (raw) {
          const parsed: BookingDraft = JSON.parse(raw);
          // Check expiry
          if (Date.now() - parsed.savedAt < DRAFT_EXPIRY_MS) {
            setDraft(parsed);
          } else {
            // Expired — clean up
            await AsyncStorage.removeItem(getDraftKey(salonId));
          }
        }
      } catch {
        // Silently ignore load errors
      } finally {
        if (!cancelled) setIsLoaded(true);
      }
    })();
    return () => { cancelled = true; };
  }, [salonId]);

  // Debounced save
  const saveDraft = useCallback(
    (data: Omit<BookingDraft, 'savedAt'>) => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
      saveTimerRef.current = setTimeout(async () => {
        try {
          const draftWithTimestamp: BookingDraft = { ...data, savedAt: Date.now() };
          await AsyncStorage.setItem(getDraftKey(salonId), JSON.stringify(draftWithTimestamp));
        } catch {
          // Silently ignore save errors
        }
      }, SAVE_DEBOUNCE_MS);
    },
    [salonId],
  );

  // Clear draft (after successful booking or explicit discard)
  const clearDraft = useCallback(async () => {
    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    try {
      await AsyncStorage.removeItem(getDraftKey(salonId));
    } catch {
      // Silently ignore
    }
    setDraft(null);
  }, [salonId]);

  // Clean up timer on unmount
  useEffect(() => {
    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, []);

  return { draft, isLoaded, saveDraft, clearDraft };
}
