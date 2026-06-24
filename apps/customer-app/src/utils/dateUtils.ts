/**
 * Timezone-safe date utilities for the customer app.
 *
 * Problem: `new Date("2026-06-24")` (no time component) is parsed as UTC midnight
 * by JavaScript engines. In negative-offset timezones (e.g. UTC-5 in the Americas),
 * this shifts the date to the PREVIOUS day locally (June 23 at 19:00).
 *
 * Solution: Always construct dates from components using `new Date(year, month-1, day)`
 * which guarantees local-time construction, immune to UTC-shift bugs.
 */

/**
 * Parse a "YYYY-MM-DD" or ISO date string as a local date (never UTC-shifted).
 * Safe to use in any timezone.
 *
 * Handles both:
 * - "2026-06-24" (date-only) → local midnight
 * - "2026-06-24T14:30:00.000Z" (full ISO) → extracts date portion, local midnight
 */
export function parseLocalDate(dateString: string): Date {
  // Extract just the date portion (before any T or space)
  const datePart = dateString.split('T')[0];
  const [year, month, day] = datePart.split('-').map(Number);
  return new Date(year, month - 1, day);
}

/**
 * Format a "YYYY-MM-DD" date string for human-readable display.
 * Returns e.g. "Wednesday, June 24, 2026"
 *
 * Timezone-safe: parses components explicitly so the weekday is always correct.
 */
export function formatBookingDate(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Format a "YYYY-MM-DD" date string as a short display.
 * Returns e.g. "Jun 24, 2026"
 */
export function formatBookingDateShort(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

/**
 * Get the day-of-week name for a "YYYY-MM-DD" date string.
 * Returns e.g. "Wednesday"
 */
export function getDayName(dateString: string): string {
  const date = parseLocalDate(dateString);
  return date.toLocaleDateString('en-US', { weekday: 'long' });
}

/**
 * Check if a "YYYY-MM-DD" date string represents today's date.
 * Timezone-safe comparison.
 */
export function isToday(dateString: string): boolean {
  const d = parseLocalDate(dateString);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

/**
 * Build an appointment Date from date + time strings (timezone-safe).
 * Used to determine if a booking is in the past or future.
 *
 * @param dateString "YYYY-MM-DD"
 * @param timeString "HH:mm" or null
 * @returns Date object in local time
 */
export function buildAppointmentDateTime(
  dateString: string,
  timeString?: string | null,
): Date {
  const dt = parseLocalDate(dateString);
  if (timeString) {
    const [h, m] = timeString.split(':').map(Number);
    dt.setHours(h || 0, m || 0, 0, 0);
  } else {
    // No time available — set to end of day so same-day bookings aren't wrongly marked past
    dt.setHours(23, 59, 0, 0);
  }
  return dt;
}
