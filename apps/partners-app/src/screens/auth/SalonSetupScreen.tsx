import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function SalonSetupScreen() {
  return (
    <View style={styles.container}>
      <Text>SalonSetupScreen</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
