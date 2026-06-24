import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { bookingApi, AvailableSlot } from '../api/booking';
import { useAppTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/colors';

// Theme-aware color factory
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
  lightGray: t.textTertiary,
  availableGreen: '#006B3F',
  unavailableRed: '#EF4444',
  pastGray: t.textTertiary,
});

const MAX_BOOKING_DAYS_AHEAD = 30;

interface AvailabilityCalendarProps {
  salonId: string;
  workerId?: string;
  serviceDuration: number;
  onDateSelect: (date: string) => void;
  selectedDate?: string;
}

interface DayAvailability {
  date: string;
  hasSlots: boolean;
  isFullyBooked: boolean;
  isClosed: boolean;
  isLoading: boolean;
}

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const MONTHS = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December'
];

// Timezone-safe date formatting (avoids toISOString UTC shift)
const formatDateStr = (date: Date): string => {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

export default function AvailabilityCalendar({
  salonId,
  workerId,
  serviceDuration,
  onDateSelect,
  selectedDate,
}: AvailabilityCalendarProps) {
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const [currentMonth, setCurrentMonth] = useState(new Date());
  const [availabilityMap, setAvailabilityMap] = useState<Record<string, DayAvailability>>({});

  // Generate calendar days for the current month view
  const calendarDays = useMemo(() => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    
    const firstDay = new Date(year, month, 1);
    const lastDay = new Date(year, month + 1, 0);
    const startPadding = firstDay.getDay();
    
    const days: (Date | null)[] = [];
    
    // Add padding for days before the first of the month
    for (let i = 0; i < startPadding; i++) {
      days.push(null);
    }
    
    // Add all days of the month
    for (let d = 1; d <= lastDay.getDate(); d++) {
      days.push(new Date(year, month, d));
    }
    
    return days;
  }, [currentMonth]);

  // Get today and max booking date
  const today = useMemo(() => {
    const d = new Date();
    d.setHours(0, 0, 0, 0);
    return d;
  }, []);

  const maxBookingDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + MAX_BOOKING_DAYS_AHEAD);
    d.setHours(23, 59, 59, 999);
    return d;
  }, []);

  // Fetch availability for visible dates when month changes
  const { refetch: fetchAvailability } = useQuery({
    queryKey: ['calendar-availability', salonId, currentMonth.toISOString().slice(0, 7), workerId],
    queryFn: async () => {
      const year = currentMonth.getFullYear();
      const month = currentMonth.getMonth();
      const firstDay = new Date(year, month, 1);
      const lastDay = new Date(year, month + 1, 0);
      
      const results: Record<string, DayAvailability> = {};
      
      // Fetch slots for each day in the visible month (within booking window)
      const fetchPromises: Promise<void>[] = [];
      
      for (let d = 1; d <= lastDay.getDate(); d++) {
        const date = new Date(year, month, d);
        const dateStr = formatDateStr(date);
        
        // Skip past dates and dates beyond booking window
        if (date < today || date > maxBookingDate) {
          results[dateStr] = {
            date: dateStr,
            hasSlots: false,
            isFullyBooked: false,
            isClosed: true,
            isLoading: false,
          };
          continue;
        }
        
        // Mark as loading initially
        results[dateStr] = {
          date: dateStr,
          hasSlots: false,
          isFullyBooked: false,
          isClosed: false,
          isLoading: true,
        };
        
        // Fetch slots for this date
        const promise = bookingApi.getAvailableSlots(salonId, dateStr, workerId)
          .then((slots: AvailableSlot[]) => {
            const availableSlots = slots.filter(s => s.available);
            const isClosed = slots.length === 0;
            const isFullyBooked = slots.length > 0 && availableSlots.length === 0;
            
            results[dateStr] = {
              date: dateStr,
              hasSlots: availableSlots.length > 0,
              isFullyBooked,
              isClosed,
              isLoading: false,
            };
          })
          .catch(() => {
            // On network error, mark as unknown (not closed) so user can still try
            results[dateStr] = {
              date: dateStr,
              hasSlots: true,
              isFullyBooked: false,
              isClosed: false,
              isLoading: false,
            };
          });
        
        fetchPromises.push(promise);
      }
      
      // Wait for all fetches to complete
      await Promise.all(fetchPromises);
      return results;
    },
    enabled: true,
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  // Update availability map when data changes
  useEffect(() => {
    const fetchData = async () => {
      const result = await fetchAvailability();
      if (result.data) {
        setAvailabilityMap(result.data);
      }
    };
    fetchData();
  }, [currentMonth, salonId, workerId]);

  const goToPrevMonth = useCallback(() => {
    const prevMonth = new Date(currentMonth);
    prevMonth.setMonth(prevMonth.getMonth() - 1);
    
    // Don't allow going before current month
    const todayMonth = today.getFullYear() * 12 + today.getMonth();
    const prevMonthVal = prevMonth.getFullYear() * 12 + prevMonth.getMonth();
    if (prevMonthVal >= todayMonth) {
      setCurrentMonth(prevMonth);
    }
  }, [currentMonth, today]);

  const goToNextMonth = useCallback(() => {
    const nextMonth = new Date(currentMonth);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    setCurrentMonth(nextMonth);
  }, [currentMonth]);

  const handleDatePress = useCallback((date: Date) => {
    const dateStr = formatDateStr(date);
    
    // Allow selecting any future date within the booking window
    // The time slot fetch on the booking screen will show actual availability
    if (date >= today && date <= maxBookingDate) {
      onDateSelect(dateStr);
    }
  }, [today, maxBookingDate, onDateSelect]);

  const getDateStyle = useCallback((date: Date | null) => {
    if (!date) return null;
    
    const dateStr = formatDateStr(date);
    const availability = availabilityMap[dateStr];
    const isPast = date < today;
    const isBeyondWindow = date > maxBookingDate;
    const isSelected = selectedDate === dateStr;
    
    let backgroundColor: string = COLORS.cardBackground;
    let borderColor: string = COLORS.border;
    let textColor: string = COLORS.textPrimary;
    let isSelectable = false;
    
    if (isPast || isBeyondWindow) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.border;
      textColor = COLORS.pastGray;
    } else if (availability?.isLoading) {
      backgroundColor = COLORS.cardBackground;
      borderColor = COLORS.border;
      textColor = COLORS.textSecondary;
      isSelectable = true; // Allow selection while loading
    } else if (availability?.isClosed) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.lightGray;
      textColor = COLORS.textSecondary;
      // Still allow selection - the booking screen will show "no slots" message
      isSelectable = true;
    } else if (availability?.isFullyBooked) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.lightGray;
      textColor = COLORS.textSecondary;
    } else if (availability?.hasSlots) {
      backgroundColor = `${COLORS.availableGreen}15`; // Light green tint
      borderColor = COLORS.availableGreen;
      textColor = COLORS.availableGreen;
      isSelectable = true;
    } else {
      // Availability not yet loaded - allow selection
      isSelectable = true;
    }
    
    // Selected state overrides everything
    if (isSelected) {
      borderColor = COLORS.accentGold;
    }
    
    return {
      backgroundColor,
      borderColor,
      textColor,
      isSelectable,
      isSelected,
      isLoading: availability?.isLoading,
    };
  }, [availabilityMap, selectedDate, today, maxBookingDate]);

  const renderDayCell = (date: Date | null, index: number) => {
    if (!date) {
      return <View key={`empty-${index}`} style={styles.emptyCell} />;
    }
    
    const style = getDateStyle(date);
    if (!style) return null;
    
    const { backgroundColor, borderColor, textColor, isSelectable, isSelected, isLoading } = style;
    const isToday = date.toDateString() === today.toDateString();
    
    return (
      <TouchableOpacity
        key={formatDateStr(date)}
        style={[
          styles.dayCell,
          { backgroundColor, borderColor },
          isSelected && styles.dayCellSelected,
        ]}
        onPress={() => handleDatePress(date)}
        disabled={!isSelectable}
        activeOpacity={0.7}
      >
        <RNText style={[styles.dayNumber, { color: textColor }]}>
          {date.getDate()}
        </RNText>
        {isToday && <View style={styles.todayDot} />}
        {isLoading && (
          <ActivityIndicator size="small" color={COLORS.textSecondary} />
        )}
      </TouchableOpacity>
    );
  };

  const monthYear = `${MONTHS[currentMonth.getMonth()]} ${currentMonth.getFullYear()}`;
  const currentMonthVal = currentMonth.getFullYear() * 12 + currentMonth.getMonth();
  const todayMonthVal = today.getFullYear() * 12 + today.getMonth();
  const canGoPrev = currentMonthVal > todayMonthVal;

  return (
    <View style={[styles.container, { backgroundColor: COLORS.cardBackground }]}>
      {/* Month Navigation */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={goToPrevMonth}
          disabled={!canGoPrev}
          style={[styles.navButton, { backgroundColor: COLORS.background }, !canGoPrev && styles.navButtonDisabled]}
        >
          <Ionicons
            name="chevron-back"
            size={24}
            color={canGoPrev ? COLORS.textPrimary : COLORS.border}
          />
        </TouchableOpacity>
        
        <RNText style={[styles.monthTitle, { color: COLORS.textPrimary }]}>{monthYear}</RNText>
        
        <TouchableOpacity onPress={goToNextMonth} style={[styles.navButton, { backgroundColor: COLORS.background }]}>
          <Ionicons name="chevron-forward" size={24} color={COLORS.textPrimary} />
        </TouchableOpacity>
      </View>
      
      {/* Weekday Headers */}
      <View style={[styles.weekdayRow, { paddingHorizontal: 2 }]}>
        {WEEKDAYS.map((day) => (
          <View key={day} style={styles.weekdayCell}>
            <RNText style={[styles.weekdayText, { color: COLORS.textSecondary }]}>{day}</RNText>
          </View>
        ))}
      </View>
      
      {/* Calendar Grid */}
      <View style={[styles.calendarGrid, { paddingHorizontal: 2 }]}>
        {calendarDays.map((date, index) => renderDayCell(date, index))}
      </View>
      
      {/* Legend */}
      <View style={[styles.legend, { borderTopColor: COLORS.border }]}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.availableGreen }]} />
          <RNText style={[styles.legendText, { color: COLORS.textSecondary }]}>Available</RNText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.lightGray }]} />
          <RNText style={[styles.legendText, { color: COLORS.textSecondary }]}>Unavailable</RNText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: COLORS.pastGray }]} />
          <RNText style={[styles.legendText, { color: COLORS.textSecondary }]}>Past</RNText>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendBorder, { borderColor: COLORS.accentGold }]} />
          <RNText style={[styles.legendText, { color: COLORS.textSecondary }]}>Selected</RNText>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  navButton: {
    padding: 8,
    borderRadius: 8,
  },
  navButtonDisabled: {
    opacity: 0.5,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  weekdayRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  weekdayCell: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 8,
  },
  weekdayText: {
    fontSize: 12,
    fontWeight: '500',
  },
  calendarGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  emptyCell: {
    width: '14.28%',
    aspectRatio: 1,
    paddingHorizontal: 2,
  },
  dayCell: {
    width: '14.28%',
    aspectRatio: 1,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
    borderWidth: 2,
    paddingHorizontal: 2,
    paddingVertical: 1,
  },
  dayCellSelected: {
    borderWidth: 3,
  },
  dayNumber: {
    fontSize: 14,
    fontWeight: '500',
  },
  todayDot: {
    position: 'absolute',
    bottom: 4,
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: '#FCD116',
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 16,
    paddingTop: 12,
    borderTopWidth: 1,
    gap: 12,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendBorder: {
    width: 14,
    height: 14,
    borderRadius: 4,
    borderWidth: 2,
  },
  legendText: {
    fontSize: 11,
  },
});
