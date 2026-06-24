import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../theme/ThemeContext';
import type { AppTheme } from '../theme/colors';
import { a11yTimeSlotLabel } from '../hooks/useAccessibility';

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
});

export interface TimeSlotData {
  time: string;
  available: boolean;
  isBreak?: boolean;
  remainingSpots?: number;
  totalSpots?: number;
  bookedSpots?: number;
}

interface TimeSlotSelectorProps {
  slots: TimeSlotData[];
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  closingTime?: string;
  lastAvailableSlot?: string;
  totalPeople?: number;
}

interface GroupedSlots {
  morning: TimeSlotData[];
  afternoon: TimeSlotData[];
  evening: TimeSlotData[];
}

const groupSlotsByPeriod = (slots: TimeSlotData[]): GroupedSlots => {
  const morning: TimeSlotData[] = [];
  const afternoon: TimeSlotData[] = [];
  const evening: TimeSlotData[] = [];

  slots.forEach((slot) => {
    const parts = (slot.time || '').split(':').map(Number);
    const hours = parts[0] || 0;
    
    if (hours < 12) {
      morning.push(slot);
    } else if (hours < 17) {
      afternoon.push(slot);
    } else {
      evening.push(slot);
    }
  });

  return { morning, afternoon, evening };
};

const formatTime = (time: string): string => {
  if (!time) return 'N/A';
  const parts = time.split(':').map(Number);
  const hours = parts[0] || 0;
  const minutes = parts[1] || 0;
  const ampm = hours >= 12 ? 'PM' : 'AM';
  const displayHour = hours % 12 || 12;
  return `${displayHour}:${minutes.toString().padStart(2, '0')} ${ampm}`;
};

const getTimeRemaining = (slots: TimeSlotData[]): number => {
  return slots.filter((s) => s.available && !s.isBreak).length;
};

export default function TimeSlotSelector({
  slots,
  selectedTime,
  onTimeSelect,
  closingTime,
  lastAvailableSlot,
  totalPeople = 1,
}: TimeSlotSelectorProps) {
  const { theme } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const groupedSlots = useMemo(() => groupSlotsByPeriod(slots), [slots]);
  const availableSlotsCount = useMemo(() => getTimeRemaining(slots), [slots]);
  const showLowSlotsWarning = availableSlotsCount > 0 && availableSlotsCount < 3;

  const renderSlot = (slot: TimeSlotData) => {
    const isSelected = selectedTime === slot.time;
    const isAvailable = slot.available && !slot.isBreak;
    
    // Check if slot has enough capacity for the group
    const hasEnoughCapacity = isAvailable && 
      (slot.remainingSpots === undefined || slot.remainingSpots >= totalPeople);
    
    // Determine slot status
    const isFull = slot.remainingSpots === 0;
    const isLimited = slot.remainingSpots !== undefined && 
      slot.remainingSpots > 0 && 
      slot.remainingSpots < 3;
    
    let backgroundColor: string = COLORS.cardBackground;
    let borderColor: string = COLORS.border;
    let textColor: string = COLORS.textPrimary;
    let showStripes = false;
    
    if (slot.isBreak) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.lightGray;
      textColor = COLORS.textSecondary;
      showStripes = true;
    } else if (!slot.available || isFull || !hasEnoughCapacity) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.lightGray;
      textColor = COLORS.textSecondary;
    } else if (isSelected) {
      backgroundColor = COLORS.accentGold;
      borderColor = COLORS.accentGold;
      textColor = COLORS.dark;
    } else {
      backgroundColor = `${COLORS.primaryGreen}10`;
      borderColor = COLORS.primaryGreen;
      textColor = COLORS.primaryGreen;
    }
    
    // Remaining spots badge
    const renderRemainingBadge = () => {
      if (slot.isBreak || !slot.available) return null;
      
      if (isFull) {
        return (
          <View style={styles.fullBadge}>
            <RNText style={styles.fullBadgeText}>Full</RNText>
          </View>
        );
      }
      
      if (slot.remainingSpots !== undefined && slot.remainingSpots > 0) {
        if (!hasEnoughCapacity) {
          return (
            <View style={styles.insufficientBadge}>
              <RNText style={styles.insufficientBadgeText}>
                {slot.remainingSpots} left (need {totalPeople})
              </RNText>
            </View>
          );
        }
        
        if (isLimited) {
          return (
            <View style={styles.limitedBadge}>
              <RNText style={styles.limitedBadgeText}>{slot.remainingSpots} left</RNText>
            </View>
          );
        }
        
        return (
          <View style={styles.spotsBadge}>
            <RNText style={styles.spotsBadgeText}>{slot.remainingSpots} left</RNText>
          </View>
        );
      }
      
      return null;
    };
    
    return (
      <TouchableOpacity
        key={slot.time}
        style={[
          styles.slotChip,
          { backgroundColor, borderColor },
          isSelected && styles.slotChipSelected,
          showStripes && styles.slotChipBreak,
        ]}
        onPress={() => hasEnoughCapacity && onTimeSelect(slot.time)}
        disabled={!hasEnoughCapacity}
        activeOpacity={0.7}
        accessible={true}
        accessibilityRole="button"
        accessibilityLabel={a11yTimeSlotLabel(slot)}
        accessibilityState={{ selected: isSelected, disabled: !hasEnoughCapacity }}
      >
        {slot.isBreak && <View style={styles.breakStripes} />}
        <RNText style={[styles.slotText, { color: textColor }]}>
          {slot.isBreak ? 'Break' : formatTime(slot.time)}
        </RNText>
        {renderRemainingBadge()}
      </TouchableOpacity>
    );
  };

  const renderPeriodSection = (
    title: string,
    iconName: string,
    periodSlots: TimeSlotData[]
  ) => {
    if (periodSlots.length === 0) return null;
    
    return (
      <View style={styles.periodSection}>
        <View style={styles.periodHeader}>
          <Ionicons name={iconName} size={16} color={COLORS.textSecondary} />
          <RNText style={[styles.periodTitle, { color: COLORS.textPrimary }]}>{title}</RNText>
        </View>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.slotsContainer}
        >
          {periodSlots.map(renderSlot)}
        </ScrollView>
      </View>
    );
  };

  return (
    <View style={[styles.container, { backgroundColor: COLORS.cardBackground }]}>
      {/* Empty state - no slots available */}
      {slots.length === 0 && (
        <View style={styles.emptyState}>
          <Ionicons name="calendar-outline" size={40} color={COLORS.textSecondary} />
          <RNText style={[styles.emptyTitle, { color: COLORS.textPrimary }]}>No time slots available</RNText>
          <RNText style={[styles.emptySubtitle, { color: COLORS.textSecondary }]}>
            The salon is closed on this date. Please select a different date.
          </RNText>
        </View>
      )}

      {/* Low Slots Warning */}
      {showLowSlotsWarning && (
        <View style={[styles.warningBanner, { backgroundColor: `${COLORS.accentGold}20` }]}>
          <Ionicons name="warning" size={16} color={COLORS.accentGold} />
          <RNText style={[styles.warningText, { color: COLORS.textPrimary }]}>
            Only {availableSlotsCount} slots left today!
          </RNText>
        </View>
      )}
      
      {/* Closing Time Warning */}
      {closingTime && lastAvailableSlot && (
        <View style={[styles.infoBanner, { backgroundColor: COLORS.background }]}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <RNText style={[styles.infoText, { color: COLORS.textSecondary }]}>
            Salon closes at {formatTime(closingTime)}. Last available slot at {formatTime(lastAvailableSlot)}.
          </RNText>
        </View>
      )}
      
      {/* Slot Sections */}
      {renderPeriodSection('Morning', 'sunny-outline', groupedSlots.morning)}
      {renderPeriodSection('Afternoon', 'partly-sunny-outline', groupedSlots.afternoon)}
      {renderPeriodSection('Evening', 'moon-outline', groupedSlots.evening)}
      
      {/* Cancellation Policy */}
      <View style={[styles.policySection, { backgroundColor: COLORS.background }]}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
        <RNText style={[styles.policyText, { color: COLORS.textSecondary }]}>
          Cancellation Policy: Free cancellation up to 48 hours before your appointment
        </RNText>
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
  warningBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    flex: 1,
  },
  periodSection: {
    marginBottom: 16,
  },
  periodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 10,
  },
  periodTitle: {
    fontSize: 14,
    fontWeight: '600',
  },
  slotsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingVertical: 4,
  },
  slotChip: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 2,
    minWidth: 80,
    alignItems: 'center',
    justifyContent: 'center',
  },
  slotChipSelected: {
    borderWidth: 2,
  },
  slotChipBreak: {
    overflow: 'hidden',
  },
  breakStripes: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'transparent',
    borderWidth: 0,
  },
  slotText: {
    fontSize: 14,
    fontWeight: '500',
  },
  fullBadge: {
    backgroundColor: '#CE1126',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  fullBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#fff',
  },
  limitedBadge: {
    backgroundColor: '#FCD116',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  limitedBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#1a1a2e',
  },
  spotsBadge: {
    backgroundColor: 'rgba(0, 107, 63, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  spotsBadgeText: {
    fontSize: 10,
    fontWeight: '500',
    color: '#006B3F',
  },
  insufficientBadge: {
    backgroundColor: 'rgba(107, 114, 128, 0.12)',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
    marginTop: 4,
  },
  insufficientBadgeText: {
    fontSize: 9,
    fontWeight: '500',
    color: '#6B7280',
  },
  policySection: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  policyText: {
    fontSize: 12,
    flex: 1,
    lineHeight: 18,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 32,
    paddingHorizontal: 16,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 20,
  },
});
