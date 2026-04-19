import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { ActivityIndicator } from 'react-native-paper';
import { subscriptionApi, FeatureCheckResponse } from '../api/subscription';
import UpgradePrompt from './UpgradePrompt';

interface FeatureGateProps {
  featureName: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

const COLORS = {
  green: '#006B3F',
};

export default function FeatureGate({ featureName, children, fallback }: FeatureGateProps) {
  const [hasFeature, setHasFeature] = useState<boolean | null>(null);
  const [featureData, setFeatureData] = useState<FeatureCheckResponse | null>(null);

  useEffect(() => {
    let isMounted = true;

    const checkFeature = async () => {
      try {
        const response = await subscriptionApi.checkFeature(featureName);
        if (isMounted) {
          setHasFeature(response.hasFeature);
          setFeatureData(response);
        }
      } catch (error) {
        console.error('Feature check failed:', error);
        if (isMounted) {
          setHasFeature(false);
        }
      }
    };

    checkFeature();

    return () => {
      isMounted = false;
    };
  }, [featureName]);

  if (hasFeature === null) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="small" color={COLORS.green} />
      </View>
    );
  }

  if (hasFeature) {
    return <>{children}</>;
  }

  if (fallback) {
    return <>{fallback}</>;
  }

  return <UpgradePrompt featureName={featureName} currentPlan={featureData?.currentPlan} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    padding: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
