import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Text,
  Dimensions,
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Brand illustrations – randomly pick one per mount
const ILLUSTRATIONS = [
  require('../../assets/loading-barber.png'),
  require('../../assets/loading-salon.png'),
];

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
  // Pick a random illustration once per mount
  const [illustrationSource] = useState(
    () => ILLUSTRATIONS[Math.floor(Math.random() * ILLUSTRATIONS.length)]
  );

  const illustrationOpacity = useRef(new Animated.Value(0)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    // Fade-in the illustration
    Animated.timing(illustrationOpacity, {
      toValue: 1,
      duration: 1000,
      useNativeDriver: true,
    }).start();

    // Subtle fade-in for the tagline and dots
    Animated.timing(textOpacity, {
      toValue: 1,
      duration: 600,
      delay: 800,
      useNativeDriver: true,
    }).start();
  }, [illustrationOpacity, textOpacity]);

  return (
    <View style={styles.container}>
      {/* Brand illustration */}
      <Animated.View
        style={[
          styles.illustrationWrapper,
          { opacity: illustrationOpacity },
        ]}
      >
        <Image
          source={illustrationSource}
          style={styles.illustration}
          resizeMode="contain"
        />
      </Animated.View>

      {/* Brand tagline */}
      <Animated.View style={{ opacity: textOpacity }}>
        <Text style={styles.tagline}>Book Your Next Grooming</Text>
      </Animated.View>

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
    backgroundColor: '#FFFFFF',
  },
  illustrationWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  illustration: {
    width: SCREEN_WIDTH * 0.85,
    height: SCREEN_HEIGHT * 0.55,
  },
  tagline: {
    color: '#333333',
    fontSize: 16,
    fontWeight: '600',
    letterSpacing: 1.5,
    marginBottom: 24,
  },
  dotsWrapper: {
    marginBottom: 48,
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
    backgroundColor: '#CE1126',
    marginHorizontal: 6,
  },
});
