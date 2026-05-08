import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Image,
  Animated,
  StyleSheet,
  Text,
} from 'react-native';

// Brand illustrations – randomly pick one per mount
const ILLUSTRATIONS = [
  require('../../assets/loading-barber-01.png'),
  require('../../assets/loading-barber-02.png'),
  require('../../assets/loading-salon-01.png'),
  require('../../assets/loading-salon-02.png'),
  require('../../assets/loading-salon-03.png'),
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
      {/* Brand illustration - covers full screen */}
      <Animated.View
        style={[
          styles.illustrationWrapper,
          { opacity: illustrationOpacity },
        ]}
      >
        <Image
          source={illustrationSource}
          style={styles.illustration}
          resizeMode="cover"
        />
      </Animated.View>

      {/* Bottom overlay with tagline and dots */}
      <Animated.View style={[styles.bottomOverlay, { opacity: textOpacity }]}>
        <Text style={styles.tagline}>Book Your Next Grooming</Text>
        <View style={styles.dotsWrapper}>
          <LoadingDots />
        </View>
      </Animated.View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FFFFFF',
  },
  illustrationWrapper: {
    ...StyleSheet.absoluteFillObject,
  },
  illustration: {
    width: '100%',
    height: '100%',
  },
  bottomOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    alignItems: 'center',
    paddingBottom: 60,
    backgroundColor: 'rgba(255, 255, 255, 0.85)',
    paddingTop: 20,
  },
  tagline: {
    color: '#006B3F',
    fontSize: 18,
    fontWeight: '700',
    letterSpacing: 1.5,
    marginBottom: 16,
  },
  dotsWrapper: {
    marginBottom: 8,
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
