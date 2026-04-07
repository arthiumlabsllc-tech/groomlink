import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddServiceScreen() {
  return (
    <View style={styles.container}>
      <Text>AddServiceScreen</Text>
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
