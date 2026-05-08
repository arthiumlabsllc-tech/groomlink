import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  StatusBar,
} from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
type AuthStackParamList = {
  Email: undefined;
  OTP: { email: string };
  ProfileSetup: { email: string };
  ProviderCategory: undefined;
  SalonSetup: { providerCategory: string };
};

type NavigationProp = NativeStackNavigationProp<AuthStackParamList, 'ProviderCategory'>;

const CATEGORIES = [
  {
    value: 'BUSINESS',
    title: 'Business Owner',
    subtitle: 'Salon, Barbershop or Beauty Studio',
    description: 'I have a registered business with a physical shop where customers come for services.',
    icon: 'storefront' as const,
    emoji: '🏪',
    features: [
      'Physical shop location',
      'Multiple staff members',
      'Walk-in & appointments',
    ],
  },
  {
    value: 'FREELANCER',
    title: 'Freelancer',
    subtitle: 'Independent Barber or Hairdresser',
    description: 'I work independently and can provide services at my location or travel to clients.',
    icon: 'person' as const,
    emoji: '✂️',
    features: [
      'Home service available',
      'Flexible location',
      'Personal brand',
    ],
  },
];

export default function ProviderCategoryScreen() {
  const navigation = useNavigation<NavigationProp>();
  const [selected, setSelected] = useState<string | null>(null);
  const { theme, isDark } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const handleContinue = () => {
    if (!selected) return;
    navigation.navigate('SalonSetup', { providerCategory: selected });
  };

  return (
    <View style={styles.container}>
      <StatusBar barStyle={isDark ? 'light-content' : 'dark-content'} backgroundColor={theme.statusBar} />

      {/* Progress Steps */}
      <View style={styles.progressContainer}>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepComplete]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Verify</Text>
        </View>
        <View style={styles.progressLine}>
          <View style={styles.progressLineFilled} />
        </View>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepComplete]}>
            <Ionicons name="checkmark" size={14} color="#FFFFFF" />
          </View>
          <Text style={styles.stepLabel}>Profile</Text>
        </View>
        <View style={styles.progressLine}>
          <View style={styles.progressLineFilled} />
        </View>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepActive]}>
            <Text style={styles.stepNumber}>3</Text>
          </View>
          <Text style={[styles.stepLabel, styles.stepLabelActive]}>Type</Text>
        </View>
        <View style={styles.progressLine}>
          <View style={styles.progressLineEmpty} />
        </View>
        <View style={styles.progressStep}>
          <View style={[styles.stepCircle, styles.stepInactive]}>
            <Text style={styles.stepNumberInactive}>4</Text>
          </View>
          <Text style={styles.stepLabel}>Setup</Text>
        </View>
      </View>

      {/* Header */}
      <View style={styles.headerSection}>
        <View style={styles.headerIcon}>
          <Ionicons name="briefcase" size={28} color="#006B3F" />
        </View>
        <Text style={styles.title}>How do you work?</Text>
        <Text style={styles.subtitle}>
          Choose the option that best describes your business model
        </Text>
      </View>

      {/* Category Cards */}
      <View style={styles.cardsContainer}>
        {CATEGORIES.map((category) => {
          const isSelected = selected === category.value;
          return (
            <TouchableOpacity
              key={category.value}
              style={[styles.card, isSelected && styles.cardSelected]}
              onPress={() => setSelected(category.value)}
              activeOpacity={0.85}
            >
              {/* Selection indicator */}
              <View style={[styles.radioOuter, isSelected && styles.radioOuterSelected]}>
                {isSelected && <View style={styles.radioInner} />}
              </View>

              {/* Card content */}
              <View style={styles.cardHeader}>
                <View style={[styles.iconCircle, isSelected && styles.iconCircleSelected]}>
                  <Text style={styles.emoji}>{category.emoji}</Text>
                </View>
                <View style={styles.cardTitles}>
                  <Text style={[styles.cardTitle, isSelected && styles.cardTitleSelected]}>
                    {category.title}
                  </Text>
                  <Text style={styles.cardSubtitle}>{category.subtitle}</Text>
                </View>
              </View>

              <Text style={styles.cardDescription}>{category.description}</Text>

              {/* Features */}
              <View style={styles.featuresContainer}>
                {category.features.map((feature, idx) => (
                  <View key={idx} style={styles.featureRow}>
                    <Ionicons
                      name="checkmark-circle"
                      size={16}
                      color={isSelected ? '#006B3F' : theme.textTertiary}
                    />
                    <Text style={[styles.featureText, isSelected && styles.featureTextSelected]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Continue Button */}
      <View style={styles.bottomSection}>
        <Button
          mode="contained"
          onPress={handleContinue}
          disabled={!selected}
          style={[styles.button, !selected && styles.buttonDisabled]}
          contentStyle={styles.buttonContent}
          labelStyle={styles.buttonLabel}
          buttonColor="#006B3F"
          theme={{ roundness: 14 }}
        >
          Continue
        </Button>
        <Text style={styles.hint}>You can change this later in settings</Text>
      </View>
    </View>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
    paddingHorizontal: 20,
    paddingTop: 16,
  },
  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    marginTop: 8,
  },
  progressStep: {
    alignItems: 'center',
  },
  stepCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 4,
  },
  stepComplete: {
    backgroundColor: '#006B3F',
  },
  stepActive: {
    backgroundColor: '#006B3F',
    borderWidth: 3,
    borderColor: '#FCD116',
  },
  stepInactive: {
    backgroundColor: theme.surfaceVariant,
  },
  stepNumber: {
    color: '#FFFFFF',
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepNumberInactive: {
    color: theme.textTertiary,
    fontWeight: 'bold',
    fontSize: 13,
  },
  stepLabel: {
    fontSize: 12,
    color: theme.textTertiary,
  },
  stepLabelActive: {
    color: '#006B3F',
    fontWeight: '600',
  },
  progressLine: {
    width: 24,
    height: 3,
    backgroundColor: theme.border,
    marginHorizontal: 4,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressLineFilled: {
    flex: 1,
    backgroundColor: '#006B3F',
  },
  progressLineEmpty: {
    flex: 1,
    backgroundColor: theme.border,
  },
  // Header
  headerSection: {
    alignItems: 'center',
    marginBottom: 24,
  },
  headerIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#E8F5E9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  title: {
    fontSize: 22,
    fontWeight: 'bold',
    color: theme.text,
    textAlign: 'center',
    marginBottom: 6,
  },
  subtitle: {
    fontSize: 14,
    color: theme.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  // Cards
  cardsContainer: {
    flex: 1,
    gap: 14,
  },
  card: {
    backgroundColor: theme.surface,
    borderRadius: 16,
    padding: 18,
    borderWidth: 2,
    borderColor: theme.border,
  },
  cardSelected: {
    borderColor: '#006B3F',
    backgroundColor: '#F0FDF4',
  },
  radioOuter: {
    position: 'absolute',
    top: 16,
    right: 16,
    width: 22,
    height: 22,
    borderRadius: 11,
    borderWidth: 2,
    borderColor: theme.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  radioOuterSelected: {
    borderColor: '#006B3F',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#006B3F',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 10,
  },
  iconCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: theme.surfaceVariant,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconCircleSelected: {
    backgroundColor: '#DCFCE7',
  },
  emoji: {
    fontSize: 24,
  },
  cardTitles: {
    flex: 1,
  },
  cardTitle: {
    fontSize: 17,
    fontWeight: '700',
    color: theme.text,
  },
  cardTitleSelected: {
    color: '#006B3F',
  },
  cardSubtitle: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  cardDescription: {
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 19,
    marginBottom: 12,
  },
  featuresContainer: {
    gap: 6,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  featureText: {
    fontSize: 13,
    color: theme.textSecondary,
  },
  featureTextSelected: {
    color: theme.text,
    fontWeight: '500',
  },
  // Bottom
  bottomSection: {
    paddingVertical: 20,
  },
  button: {
    borderRadius: 14,
  },
  buttonDisabled: {
    opacity: 0.5,
  },
  buttonContent: {
    paddingVertical: 10,
  },
  buttonLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  hint: {
    textAlign: 'center',
    color: theme.textSecondary,
    fontSize: 13,
    marginTop: 12,
  },
});
