import React from 'react';
import { View, Text, StyleSheet } from 'react-native';

export default function AddStaffScreen() {
  return (
    <View style={styles.container}>
      <Text>AddStaffScreen</Text>
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
