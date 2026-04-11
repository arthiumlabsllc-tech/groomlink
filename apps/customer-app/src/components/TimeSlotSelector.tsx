import React, { useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Text as RNText,
  ScrollView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';

// Design System Colors (Ghana theme)
const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
  lightGray: '#D1D5DB',
};

export interface TimeSlotData {
  time: string;
  available: boolean;
  isBreak?: boolean;
}

interface TimeSlotSelectorProps {
  slots: TimeSlotData[];
  selectedTime?: string;
  onTimeSelect: (time: string) => void;
  closingTime?: string;
  lastAvailableSlot?: string;
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
    const [hours] = slot.time.split(':').map(Number);
    
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
  const [hours, minutes] = time.split(':').map(Number);
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
}: TimeSlotSelectorProps) {
  const groupedSlots = useMemo(() => groupSlotsByPeriod(slots), [slots]);
  const availableSlotsCount = useMemo(() => getTimeRemaining(slots), [slots]);
  const showLowSlotsWarning = availableSlotsCount > 0 && availableSlotsCount < 3;

  const renderSlot = (slot: TimeSlotData) => {
    const isSelected = selectedTime === slot.time;
    const isAvailable = slot.available && !slot.isBreak;
    
    let backgroundColor = COLORS.cardBackground;
    let borderColor = COLORS.border;
    let textColor = COLORS.textPrimary;
    let showStripes = false;
    
    if (slot.isBreak) {
      backgroundColor = COLORS.background;
      borderColor = COLORS.lightGray;
      textColor = COLORS.textSecondary;
      showStripes = true;
    } else if (!slot.available) {
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
    
    return (
      <TouchableOpacity
        key={slot.time}
        style={[
          styles.slotChip,
          { backgroundColor, borderColor },
          isSelected && styles.slotChipSelected,
          showStripes && styles.slotChipBreak,
        ]}
        onPress={() => isAvailable && onTimeSelect(slot.time)}
        disabled={!isAvailable}
        activeOpacity={0.7}
      >
        {slot.isBreak && <View style={styles.breakStripes} />}
        <RNText style={[styles.slotText, { color: textColor }]}>
          {slot.isBreak ? 'Break' : formatTime(slot.time)}
        </RNText>
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
          <RNText style={styles.periodTitle}>{title}</RNText>
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
    <View style={styles.container}>
      {/* Low Slots Warning */}
      {showLowSlotsWarning && (
        <View style={styles.warningBanner}>
          <Ionicons name="warning" size={16} color={COLORS.accentGold} />
          <RNText style={styles.warningText}>
            Only {availableSlotsCount} slots left today!
          </RNText>
        </View>
      )}
      
      {/* Closing Time Warning */}
      {closingTime && lastAvailableSlot && (
        <View style={styles.infoBanner}>
          <Ionicons name="time-outline" size={16} color={COLORS.textSecondary} />
          <RNText style={styles.infoText}>
            Salon closes at {formatTime(closingTime)}. Last available slot at {formatTime(lastAvailableSlot)}.
          </RNText>
        </View>
      )}
      
      {/* Slot Sections */}
      {renderPeriodSection('Morning', 'sunny-outline', groupedSlots.morning)}
      {renderPeriodSection('Afternoon', 'partly-sunny-outline', groupedSlots.afternoon)}
      {renderPeriodSection('Evening', 'moon-outline', groupedSlots.evening)}
      
      {/* Cancellation Policy */}
      <View style={styles.policySection}>
        <Ionicons name="information-circle-outline" size={16} color={COLORS.textSecondary} />
        <RNText style={styles.policyText}>
          Cancellation Policy: Free cancellation up to 3 hours before your appointment
        </RNText>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.cardBackground,
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
    backgroundColor: `${COLORS.accentGold}20`,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  warningText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.dark,
    flex: 1,
  },
  infoBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  infoText: {
    fontSize: 13,
    color: COLORS.textSecondary,
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
    color: COLORS.textPrimary,
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
  policySection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.background,
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
    gap: 8,
  },
  policyText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    flex: 1,
    lineHeight: 18,
  },
});
