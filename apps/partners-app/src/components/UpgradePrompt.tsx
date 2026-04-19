import React from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { MainStackParamList } from '../types';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

interface UpgradePromptProps {
  featureName: string;
  currentPlan?: string;
}

const COLORS = {
  green: '#006B3F',
  gold: '#FCD116',
  white: '#FFFFFF',
  black: '#111827',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  border: '#E5E7EB',
};

export default function UpgradePrompt({ featureName, currentPlan }: UpgradePromptProps) {
  const navigation = useNavigation<NavigationProp>();

  const handleUpgrade = () => {
    navigation.navigate('Pricing');
  };

  return (
    <View style={styles.container}>
      <View style={styles.iconContainer}>
        <Ionicons name="lock-closed" size={32} color={COLORS.gold} />
      </View>
      
      <Text style={styles.title}>Pro Feature</Text>
      
      <Text style={styles.description}>
        {currentPlan 
          ? `Your current ${currentPlan} plan doesn't include access to ${featureName}. Upgrade to unlock this feature.`
          : `This is a premium feature. Upgrade your plan to access ${featureName}.`
        }
      </Text>

      <Button
        mode="contained"
        onPress={handleUpgrade}
        style={styles.upgradeButton}
        buttonColor={COLORS.green}
        textColor={COLORS.white}
        icon={({ size, color }) => (
          <Ionicons name="rocket-outline" size={size} color={color} />
        )}
      >
        Upgrade Now
      </Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: COLORS.white,
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    margin: 16,
    borderWidth: 1,
    borderColor: COLORS.border,
    shadowColor: COLORS.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  iconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#FEF9E7',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: COLORS.black,
    marginBottom: 8,
  },
  description: {
    fontSize: 14,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  upgradeButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
});
