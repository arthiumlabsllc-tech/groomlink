import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator } from 'react-native';
import { NativeStackScreenProps } from '@react-navigation/native-stack';
import { RootStackParamList } from '../../types';
import { paymentsApi } from '../../api/payments';

type Props = NativeStackScreenProps<RootStackParamList, 'Payment'>;

export default function PaymentScreen({ route, navigation }: Props) {
  const { bookingId, amount } = route.params;
  const [selectedProvider, setSelectedProvider] = useState<string>('');
  const [processing, setProcessing] = useState(false);

  const providers = [
    { id: 'MTN_MOMO', name: 'MTN Mobile Money', color: '#FDBF13' },
    { id: 'VODAFONE_CASH', name: 'Vodafone Cash', color: '#E60000' },
    { id: 'AIRTELTIGO_MONEY', name: 'AirtelTigo Money', color: '#FF0000' },
  ];

  const handlePayment = async () => {
    if (!selectedProvider) {
      Alert.alert('Error', 'Please select a payment method');
      return;
    }

    setProcessing(true);
    try {
      await paymentsApi.initiatePayment({
        bookingId,
        provider: selectedProvider as any,
      });
      
      Alert.alert(
        'Payment Initiated',
        'Please complete the payment on your mobile device.',
        [{ text: 'OK', onPress: () => navigation.navigate('Main') }]
      );
    } catch (error) {
      Alert.alert('Error', 'Payment failed. Please try again.');
    } finally {
      setProcessing(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.header}>Payment</Text>

      <View style={styles.amountCard}>
        <Text style={styles.amountLabel}>Total Amount</Text>
        <Text style={styles.amount}>GH₵ {amount.toFixed(2)}</Text>
      </View>

      <View style={styles.section}>
        <Text style={styles.sectionTitle}>Select Payment Method</Text>
        {providers.map((provider) => (
          <TouchableOpacity
            key={provider.id}
            style={[
              styles.providerCard,
              selectedProvider === provider.id && styles.selectedCard,
            ]}
            onPress={() => setSelectedProvider(provider.id)}
          >
            <View style={[styles.providerIndicator, { backgroundColor: provider.color }]} />
            <Text style={styles.providerName}>{provider.name}</Text>
          </TouchableOpacity>
        ))}
      </View>

      <TouchableOpacity
        style={[
          styles.payButton,
          (!selectedProvider || processing) && styles.payButtonDisabled,
        ]}
        onPress={handlePayment}
        disabled={!selectedProvider || processing}
      >
        {processing ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.payButtonText}>Pay Now</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    fontSize: 24,
    fontWeight: 'bold',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
  },
  amountCard: {
    backgroundColor: '#fff',
    margin: 16,
    padding: 24,
    borderRadius: 12,
    alignItems: 'center',
  },
  amountLabel: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
  },
  amount: {
    fontSize: 36,
    fontWeight: 'bold',
    color: '#007AFF',
  },
  section: {
    backgroundColor: '#fff',
    marginHorizontal: 16,
    padding: 20,
    borderRadius: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 16,
  },
  providerCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    marginBottom: 12,
  },
  selectedCard: {
    borderColor: '#007AFF',
    backgroundColor: '#F0F7FF',
  },
  providerIndicator: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 12,
  },
  providerName: {
    fontSize: 16,
    fontWeight: '500',
  },
  payButton: {
    backgroundColor: '#007AFF',
    margin: 16,
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  payButtonDisabled: {
    backgroundColor: '#ccc',
  },
  payButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});
