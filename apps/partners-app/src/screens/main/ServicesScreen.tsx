import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function ServicesScreen() {
  return (
    <View style={styles.container}>
      <Text>ServicesScreen</Text>
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
