import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Text,
  Dimensions,
  type DimensionValue,
  useColorScheme,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Barbershop/salon themed background icons
const BARBER_ICONS = ['✂️', '💈', '💇', '🪒', '🪮'];

// Pre-defined scatter positions so they stay consistent across renders
const ICON_CONFIGS: Array<{ icon: string; left: DimensionValue; top: DimensionValue; size: number; opacity: number; floatDelay: number }> = [
  { icon: '✂️', left: '8%',  top: '5%',  size: 52, opacity: 0.07, floatDelay: 0 },
  { icon: '💈', left: '75%', top: '3%',  size: 48, opacity: 0.06, floatDelay: 400 },
  { icon: '💇', left: '85%', top: '18%', size: 44, opacity: 0.08, floatDelay: 800 },
  { icon: '🪒', left: '12%', top: '22%', size: 50, opacity: 0.05, floatDelay: 200 },
  { icon: '🪮', left: '45%', top: '8%',  size: 46, opacity: 0.07, floatDelay: 600 },
  { icon: '✂️', left: '90%', top: '38%', size: 54, opacity: 0.06, floatDelay: 1000 },
  { icon: '💈', left: '5%',  top: '42%', size: 42, opacity: 0.08, floatDelay: 300 },
  { icon: '💇', left: '55%', top: '30%', size: 48, opacity: 0.05, floatDelay: 700 },
  { icon: '🪒', left: '30%', top: '55%', size: 56, opacity: 0.07, floatDelay: 500 },
  { icon: '🪮', left: '78%', top: '52%', size: 44, opacity: 0.06, floatDelay: 900 },
  { icon: '✂️', left: '18%', top: '68%', size: 50, opacity: 0.08, floatDelay: 1100 },
  { icon: '💈', left: '62%', top: '65%', size: 46, opacity: 0.05, floatDelay: 150 },
  { icon: '💇', left: '88%', top: '72%', size: 52, opacity: 0.07, floatDelay: 450 },
  { icon: '🪒', left: '35%', top: '78%', size: 48, opacity: 0.06, floatDelay: 750 },
  { icon: '🪮', left: '70%', top: '82%', size: 54, opacity: 0.08, floatDelay: 350 },
  { icon: '✂️', left: '50%', top: '90%', size: 44, opacity: 0.05, floatDelay: 650 },
  { icon: '💈', left: '3%',  top: '88%', size: 50, opacity: 0.07, floatDelay: 850 },
  { icon: '💇', left: '92%', top: '55%', size: 46, opacity: 0.06, floatDelay: 550 },
];

/** A single floating background icon */
function FloatingIcon({
  icon,
  left,
  top,
  size,
  opacity,
  floatDelay,
}: {
  icon: string;
  left: DimensionValue;
  top: DimensionValue;
  size: number;
  opacity: number;
  floatDelay: number;
}) {
  const translateY = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(translateY, {
          toValue: -12,
          duration: 3000,
          delay: floatDelay,
          useNativeDriver: true,
        }),
        Animated.timing(translateY, {
          toValue: 0,
          duration: 3000,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();
    return () => animation.stop();
  }, [translateY, floatDelay]);

  return (
    <Animated.Text
      style={[
        styles.backgroundIcon,
        { left, top, fontSize: size, opacity },
        { transform: [{ translateY }] },
      ]}
    >
      {icon}
    </Animated.Text>
  );
}

/** Custom dot-dot-dot loading animation */
function LoadingDots() {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createDotAnimation = (dot: Animated.Value, delay: number) =>
      Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(dot, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(dot, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.delay(600 - delay),
        ])
      );

    const a1 = createDotAnimation(dot1, 0);
    const a2 = createDotAnimation(dot2, 200);
    const a3 = createDotAnimation(dot3, 400);

    a1.start();
    a2.start();
    a3.start();

    return () => {
      a1.stop();
      a2.stop();
      a3.stop();
    };
  }, [dot1, dot2, dot3]);

  const dotStyle = (anim: Animated.Value) => ({
    opacity: anim.interpolate({
      inputRange: [0, 1],
      outputRange: [0.3, 1],
    }),
    transform: [
      {
        scale: anim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.8, 1.2],
        }),
      },
    ],
  });

  return (
    <View style={styles.dotsContainer}>
      <Animated.View style={[styles.dot, dotStyle(dot1)]} />
      <Animated.View style={[styles.dot, dotStyle(dot2)]} />
      <Animated.View style={[styles.dot, dotStyle(dot3)]} />
    </View>
  );
}

export default function LoadingScreen() {
  // Use useColorScheme directly since LoadingScreen may render before ThemeProvider
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  const logoSource = isDark
    ? require('../../assets/logo-full-white.png')
    : require('../../assets/logo-full-black.png');

  const logoScale = useRef(new Animated.Value(0.9)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in the logo on mount
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Subtle fade-in for the loading text
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 600,
      useNativeDriver: true,
    }).start();

    // Pulsing/breathing animation - loops scale between 0.9 and 1.1
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(logoScale, {
          toValue: 1.1,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(logoScale, {
          toValue: 0.9,
          duration: 1200,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [logoScale, logoOpacity, textOpacity]);

  return (
    <View style={styles.container}>
      {/* Background scattered icons */}
      {ICON_CONFIGS.map((cfg, i) => (
        <FloatingIcon key={i} {...cfg} />
      ))}

      {/* Subtle gradient overlay using layered Views */}
      <View style={styles.gradientTop} />
      <View style={styles.gradientBottom} />

      {/* Logo with pulse + fade-in */}
      <Animated.View
        style={[
          styles.logoWrapper,
          {
            opacity: logoOpacity,
            transform: [{ scale: logoScale }],
          },
        ]}
      >
        <Image
          source={logoSource}
          style={styles.logo}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Brand tagline */}
      <Animated.Text style={[styles.tagline, { opacity: textOpacity }]}>
        Book Your Next Grooming
      </Animated.Text>

      {/* Custom loading dots */}
      <Animated.View style={[styles.dotsWrapper, { opacity: textOpacity }]}>
        <LoadingDots />
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#1a1a2e',
  },
  // Simulated gradient overlays (top lighter fade, bottom darker)
  gradientTop: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    backgroundColor: 'rgba(30, 30, 60, 0.6)',
  },
  gradientBottom: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: SCREEN_HEIGHT * 0.3,
    backgroundColor: 'rgba(10, 10, 25, 0.7)',
  },
  backgroundIcon: {
    position: 'absolute',
    color: '#FFFFFF',
  },
  logoWrapper: {
    marginBottom: 16,
    zIndex: 10,
  },
  logo: {
    width: 220,
    height: 100,
  },
  tagline: {
    color: 'rgba(255, 255, 255, 0.7)',
    fontSize: 16,
    fontFamily: 'System',
    letterSpacing: 1.5,
    marginBottom: 32,
    zIndex: 10,
  },
  dotsWrapper: {
    zIndex: 10,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#006B3F',
    marginHorizontal: 6,
  },
});
