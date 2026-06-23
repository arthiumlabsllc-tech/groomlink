import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Text,
  TextInput,
  Button,
  Card,
  ActivityIndicator,
  Divider,
  HelperText,
  Surface,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { salonApi } from '../../api/salon';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import * as Haptics from 'expo-haptics';

export default function RequestPayoutScreen() {
  const navigation = useNavigation();
  const route = useRoute<any>();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  const { availableBalance, salonId } = route.params || {};

  const [amount, setAmount] = useState('');
  const [requesting, setRequesting] = useState(false);

  // Fetch salon data to get payout account info
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const numericAmount = parseFloat(amount) || 0;
  const hasPayoutAccount = salon && (
    (salon as any).momoNumber || 
    (salon as any).bankAccountNumber
  );
  const insufficientBalance = numericAmount > (availableBalance || 0);
  const invalidAmount = numericAmount <= 0;

  const handleRequestPayout = async () => {
    if (!hasPayoutAccount) {
      Alert.alert(
        'No Payout Account',
        'Please set up your payout account in Salon Settings before requesting a payout.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go to Settings',
            onPress: () => navigation.goBack(),
          },
        ]
      );
      return;
    }

    if (invalidAmount || insufficientBalance) {
      Alert.alert(
        'Invalid Amount',
        insufficientBalance
          ? `Insufficient balance. Your available balance is GH₵${availableBalance?.toFixed(2) || '0.00'}`
          : 'Please enter a valid amount greater than 0'
      );
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);

    Alert.alert(
      'Confirm Payout Request',
      `You are requesting GH₵${numericAmount.toFixed(2)} to be sent to your ${
        (salon as any)?.payoutType === 'bank' ? 'bank account' : 'Mobile Money'
      }.\n\nThis action cannot be undone.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            setRequesting(true);
            try {
              await salonApi.requestPayout(salonId, numericAmount);
              
              Alert.alert(
                'Payout Sent!',
                `GH₵${numericAmount.toFixed(2)} has been sent to your ${
                  (salon as any)?.momoProvider?.toUpperCase() || 'Mobile Money'
                }.\n\nYou should receive it shortly.`,
                [
                  {
                    text: 'OK',
                    onPress: () => {
                      queryClient.invalidateQueries({ queryKey: ['payoutBalance'] });
                      queryClient.invalidateQueries({ queryKey: ['payoutHistory'] });
                      navigation.goBack();
                    },
                  },
                ]
              );
            } catch (error: any) {
              Alert.alert(
                'Request Failed',
                error.response?.data?.message || 'Failed to request payout. Please try again.'
              );
            } finally {
              setRequesting(false);
            }
          },
        },
      ]
    );
  };

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView contentContainerStyle={styles.scrollContent}>
          {/* Balance Card */}
          <Card style={styles.balanceCard}>
            <Card.Content>
              <View style={styles.balanceHeader}>
                <Ionicons name="wallet" size={24} color="#006B3F" />
                <Text style={styles.balanceLabel}>Available Balance</Text>
              </View>
              <Text style={styles.balanceValue}>
                GH₵{(availableBalance || 0).toLocaleString(undefined, {
                  minimumFractionDigits: 2,
                  maximumFractionDigits: 2,
                })}
              </Text>
            </Card.Content>
          </Card>

          {/* Payout Account Info */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons
                name={
                  (salon as any)?.payoutType === 'bank'
                    ? 'business-outline'
                    : 'phone-portrait-outline'
                }
                size={20}
                color="#006B3F"
              />
              <Text style={styles.sectionTitle}>Payout Destination</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            {hasPayoutAccount ? (
              <View style={styles.accountInfo}>
                <Ionicons name="checkmark-circle" size={20} color="#10B981" />
                <View style={styles.accountDetails}>
                  <Text style={styles.accountType}>
                    {(salon as any)?.payoutType === 'bank' ? 'Bank Account' : 'Mobile Money'}
                  </Text>
                  <Text style={styles.accountNumber}>
                    {(salon as any)?.payoutType === 'bank'
                      ? (salon as any).bankAccountName
                      : `${(salon as any)?.momoProvider?.toUpperCase()} - ${(salon as any).momoNumber}`}
                  </Text>
                </View>
              </View>
            ) : (
              <View style={styles.noAccountWarning}>
                <Ionicons name="warning" size={20} color="#F59E0B" />
                <Text style={styles.warningText}>
                  No payout account configured. Please add your payout details in Salon Settings.
                </Text>
              </View>
            )}
          </Surface>

          {/* Amount Input */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="cash-outline" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Payout Amount</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <TextInput
              label="Amount (GH₵)"
              value={amount}
              onChangeText={(text) => {
                // Only allow numbers and one decimal point
                if (text === '' || /^\d*\.?\d{0,2}$/.test(text)) {
                  setAmount(text);
                }
              }}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.accent}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={styles.amountInput}
              keyboardType="decimal-pad"
              placeholder="0.00"
              left={
                <TextInput.Icon icon="cash" color={theme.accent} />
              }
              theme={{ roundness: 12 }}
            />

            {invalidAmount && amount !== '' && (
              <HelperText type="error">Amount must be greater than 0</HelperText>
            )}

            {insufficientBalance && (
              <HelperText type="error">
                Insufficient balance. Maximum: GH₵{availableBalance?.toFixed(2) || '0.00'}
              </HelperText>
            )}

            {/* Quick Amount Buttons */}
            <View style={styles.quickAmounts}>
              {[25, 50, 100, 200].map((quickAmount) => (
                <TouchableOpacity
                  key={quickAmount}
                  style={styles.quickAmountButton}
                  onPress={() => setAmount(quickAmount.toString())}
                  activeOpacity={0.7}
                >
                  <Text style={styles.quickAmountText}>GH₵{quickAmount}</Text>
                </TouchableOpacity>
              ))}
              <TouchableOpacity
                style={styles.quickAmountButton}
                onPress={() => setAmount(availableBalance?.toFixed(2) || '0')}
                activeOpacity={0.7}
              >
                <Text style={styles.quickAmountText}>Max</Text>
              </TouchableOpacity>
            </View>
          </Surface>

          {/* Info Box */}
          <View style={styles.infoBox}>
            <Ionicons name="information-circle" size={18} color="#006B3F" />
            <Text style={styles.infoText}>
              Payouts are sent instantly to your Mobile Money wallet via our secure payment partner.
            </Text>
          </View>

          {/* Request Button */}
          <Button
            mode="contained"
            onPress={handleRequestPayout}
            loading={requesting}
            disabled={requesting || !hasPayoutAccount || invalidAmount || insufficientBalance}
            style={styles.requestButton}
            buttonColor="#006B3F"
            theme={{ roundness: 12 }}
            contentStyle={styles.buttonContent}
          >
            {requesting ? 'Processing...' : `Request GH₵${numericAmount.toFixed(2)} Payout`}
          </Button>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.background,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: theme.background,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  balanceCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 16,
    marginBottom: 16,
  },
  balanceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: '#006B3F',
  },
  balanceValue: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#006B3F',
  },
  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.text,
    fontSize: 16,
  },
  sectionDivider: {
    marginBottom: 16,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  accountDetails: {
    flex: 1,
  },
  accountType: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  accountNumber: {
    fontSize: 13,
    color: theme.textSecondary,
    marginTop: 2,
  },
  noAccountWarning: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.warningBg,
  },
  warningText: {
    flex: 1,
    fontSize: 13,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  amountInput: {
    backgroundColor: theme.surface,
    marginBottom: 12,
  },
  quickAmounts: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
  },
  quickAmountButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  quickAmountText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.accent,
  },
  infoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.successBg,
    marginBottom: 16,
  },
  infoText: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  requestButton: {
    marginTop: 8,
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
