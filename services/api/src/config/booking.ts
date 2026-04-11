export const bookingConfig = {
  bufferMinutes: parseInt(process.env.BOOKING_BUFFER_MINUTES || '15', 10),
  cancellationGraceHours: parseInt(process.env.CANCELLATION_GRACE_HOURS || '3', 10),
  maxBookingDaysAhead: parseInt(process.env.MAX_BOOKING_DAYS_AHEAD || '30', 10),
  holdDurationSeconds: parseInt(process.env.HOLD_DURATION_SECONDS || '600', 10),
  autoCancelUnpaidMinutes: parseInt(process.env.AUTO_CANCEL_UNPAID_MINUTES || '30', 10),
  rescheduleFeeGhs: parseInt(process.env.RESCHEDULE_FEE_GHES || '5', 10),
  rescheduleWindowHours: parseInt(process.env.RESCHEDULE_FEE_WINDOW_HOURS || '24', 10),
};
