import React, { useEffect, useRef } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Text,
} from 'react-native';

// Customer app: salon-themed splash – light background with black logo
const SPLASH_ILLUSTRATION = require('../../assets/loading-salon-02-splash.png');
const LOGO = require('../../assets/logo-full-black.png');

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
  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const logoOpacity = useRef(new Animated.Value(0)).current;
  const dotsOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in the illustration
    Animated.timing(illustrationOpacity, {
      toValue: 1,
      duration: 800,
      useNativeDriver: true,
    }).start();

    // Fade-in the logo
    Animated.timing(logoOpacity, {
      toValue: 1,
      duration: 600,
      delay: 400,
      useNativeDriver: true,
    }).start();

    // Fade-in the loading dots
    Animated.timing(dotsOpacity, {
      toValue: 1,
      duration: 500,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, [illustrationOpacity, logoOpacity, dotsOpacity]);

  return (
    <View style={styles.container}>
      {/* Full-screen brand illustration */}
      <Animated.View
        style={[
          styles.illustrationWrapper,
          { opacity: illustrationOpacity },
        ]}
      >
        <Image
          source={SPLASH_ILLUSTRATION}
          style={styles.illustration}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Bottom section: logo + loading dots */}
      <Animated.View style={[styles.bottomSection, { opacity: logoOpacity }]}>
        <Image
          source={LOGO}
          style={styles.logo}
          resizeMode="contain"
        />
        <Animated.View style={[styles.dotsWrapper, { opacity: dotsOpacity }]}>
          <LoadingDots />
        </Animated.View>
        <Text style={styles.loadingText}>Loading salons & barbershops...</Text>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAF6F0',
  },
  illustrationWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  bottomSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 50,
    paddingTop: 40,
    // Subtle gradient fade from illustration to bottom
    backgroundColor: 'rgba(250, 246, 240, 0.0)',
  },
  logo: {
    width: 160,
    height: 50,
    marginBottom: 20,
  },
  dotsWrapper: {
    marginBottom: 12,
  },
  dotsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#006B3F',
    marginHorizontal: 5,
  },
  loadingText: {
    fontSize: 13,
    color: '#006B3F',
    fontWeight: '500',
    letterSpacing: 0.5,
    opacity: 0.8,
  },
});
