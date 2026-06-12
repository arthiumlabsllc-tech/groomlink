import React, { useMemo, useRef, useEffect } from 'react';
import { View, StyleSheet, Image, Animated, Dimensions } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const { width } = Dimensions.get('window');

const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  background: t.background,
  surface: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
});

export default function WelcomeScreen() {
  const navigation = useNavigation<any>();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);

  // Animations
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(40)).current;
  const buttonFade = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(fadeAnim, { toValue: 1, duration: 700, useNativeDriver: true }),
        Animated.timing(slideAnim, { toValue: 0, duration: 700, useNativeDriver: true }),
      ]),
      Animated.timing(buttonFade, { toValue: 1, duration: 500, useNativeDriver: true }),
    ]).start();
  }, []);

  const handleSignIn = () => {
    try {
      // Use push instead of navigate for better iPad compatibility
      navigation.push('Auth');
    } catch (error) {
      // Fallback: try navigate if push fails
      console.log('Auth navigation error, trying fallback:', error);
      try {
        navigation.navigate('Auth' as never);
      } catch (fallbackError) {
        // Last resort: navigate to MainTabs
        console.log('Fallback navigation error:', fallbackError);
        navigation.navigate('MainTabs' as never);
      }
    }
  };

  const handleGuest = () => {
    try {
      navigation.navigate('MainTabs');
    } catch (error) {
      console.log('Guest navigation error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Logo and branding */}
        <Animated.View style={[styles.heroSection, { opacity: fadeAnim, transform: [{ translateY: slideAnim }] }]}>
          <Image
            source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
            style={styles.logo}
            resizeMode="contain"
          />
          <Text variant="headlineMedium" style={styles.title}>
            Your beauty, your way
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            Discover top salons and book appointments in seconds. Get pampered by the best professionals in Ghana.
          </Text>
        </Animated.View>

        {/* Feature highlights */}
        <Animated.View style={[styles.features, { opacity: fadeAnim }]}>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${COLORS.primaryGreen}15` }]}>  
              <Ionicons name="search" size={20} color={COLORS.primaryGreen} />
            </View>
            <Text style={styles.featureText}>Find salons near you</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${COLORS.accentGold}25` }]}>
              <Ionicons name="calendar" size={20} color={COLORS.accentGold} />
            </View>
            <Text style={styles.featureText}>Book appointments instantly</Text>
          </View>
          <View style={styles.featureRow}>
            <View style={[styles.featureIcon, { backgroundColor: `${COLORS.accentRed}15` }]}>
              <Ionicons name="shield-checkmark" size={20} color={COLORS.accentRed} />
            </View>
            <Text style={styles.featureText}>Secure escrow payments</Text>
          </View>
        </Animated.View>

        {/* Action buttons */}
        <Animated.View style={[styles.buttonSection, { opacity: buttonFade }]}>
          <Button
            mode="contained"
            onPress={handleSignIn}
            style={styles.signInButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.signInLabel}
            buttonColor={COLORS.primaryGreen}
          >
            Get Started
          </Button>
          <Button
            mode="text"
            onPress={handleGuest}
            style={styles.guestButton}
            contentStyle={styles.buttonContent}
            labelStyle={styles.guestLabel}
            textColor={COLORS.textSecondary}
          >
            Continue as Guest
          </Button>
        </Animated.View>
      </View>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  content: {
    flex: 1,
    justifyContent: 'space-between',
    paddingHorizontal: 24,
    paddingVertical: 32,
  },
  heroSection: {
    alignItems: 'center',
    paddingTop: 48,
  },
  logo: {
    width: 180,
    height: 54,
    marginBottom: 32,
  },
  title: {
    fontWeight: '700',
    color: COLORS.textPrimary,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  features: {
    gap: 16,
    paddingHorizontal: 8,
  },
  featureRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 14,
  },
  featureIcon: {
    width: 42,
    height: 42,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.textPrimary,
  },
  buttonSection: {
    gap: 8,
    paddingBottom: 16,
  },
  signInButton: {
    borderRadius: 14,
    elevation: 2,
  },
  guestButton: {
    borderRadius: 14,
  },
  buttonContent: {
    paddingVertical: 8,
  },
  signInLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  guestLabel: {
    fontSize: 15,
  },
});
