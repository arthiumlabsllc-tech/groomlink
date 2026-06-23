import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
  Linking,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Divider,
  Surface,
  Switch,
  TextInput,
  ActivityIndicator,
  HelperText,
  Text,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { salonApi } from '../../api/salon';
import { useAuthStore } from '../../store/authStore';
import { MainStackParamList } from '../../types/navigation';
import Constants from 'expo-constants';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';
import * as Haptics from 'expo-haptics';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

interface FormErrors {
  firstName?: string;
  email?: string;
}

export default function ProfileScreen() {
  const navigation = useNavigation<NavigationProp>();
  const { user, setUser, logout: authLogout } = useAuthStore();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Edit mode state
  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    firstName: false,
    email: false,
  });

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Fetch fresh profile data
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
  });

  // Fetch salon data for stats
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Fetch salon stats
  const { data: stats } = useQuery({
    queryKey: ['salonStats', salon?.id],
    queryFn: () => (salon ? salonApi.getSalonStats(salon.id) : null),
    enabled: !!salon?.id,
  });

  // Fetch payout balance
  const { data: payoutBalance, error: payoutError } = useQuery({
    queryKey: ['payoutBalance', salon?.id],
    queryFn: () => (salon ? salonApi.getPayoutBalance(salon.id) : null),
    enabled: !!salon?.id,
  });

  // Debug payout balance errors
  if (payoutError) {
    console.log('Payout balance error:', payoutError);
  }

  // Update profile mutation
  const updateMutation = useMutation({
    mutationFn: (data: { firstName?: string; lastName?: string; email?: string }) =>
      authApi.updateProfile(data),
    onSuccess: (response) => {
      const updatedUser = response.data;
      setUser({
        ...user!,
        firstName: updatedUser.firstName,
        lastName: updatedUser.lastName,
        email: updatedUser.email,
      });
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['profile'] });
      Alert.alert('Success', 'Profile updated successfully');
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update profile: ${error.message}`);
    },
  });

  // Get initials for avatar
  const getInitials = () => {
    const displayName = profile || user;
    if (!displayName) return '?';
    return `${displayName.firstName?.[0] || ''}${displayName.lastName?.[0] || ''}`.toUpperCase();
  };

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!firstName.trim()) {
      newErrors.firstName = 'First name is required';
    } else if (firstName.trim().length < 2) {
      newErrors.firstName = 'First name must be at least 2 characters';
    }

    if (email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = 'Please enter a valid email address';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Handle save profile
  const handleSaveProfile = () => {
    if (!validateForm()) return;

    updateMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: email.trim() || undefined,
    });
  };

  // Handle cancel edit
  const handleCancelEdit = () => {
    setFirstName(profile?.firstName || user?.firstName || '');
    setLastName(profile?.lastName || user?.lastName || '');
    setEmail(profile?.email || user?.email || '');
    setErrors({});
    setTouched({ firstName: false, email: false });
    setIsEditing(false);
  };

  // Handle logout
  const handleLogout = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Logout',
          style: 'destructive',
          onPress: async () => {
            await authApi.logout();
            authLogout();
          },
        },
      ]
    );
  };

  // Handle delete account (multi-step confirmation)
  const handleDeleteAccount = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
    Alert.alert(
      'Delete Account',
      'This action is permanent and cannot be undone. All your data including booking history, salon details, and payout records will be permanently deleted.\n\nAre you sure you want to continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Continue',
          style: 'destructive',
          onPress: () => {
            // Second confirmation step
            Alert.alert(
              'Final Confirmation',
              'Type to confirm: This will permanently delete your account and all associated data. This cannot be reversed.',
              [
                { text: 'Cancel', style: 'cancel' },
                {
                  text: 'Delete My Account',
                  style: 'destructive',
                  onPress: performDeleteAccount,
                },
              ]
            );
          },
        },
      ]
    );
  };

  const performDeleteAccount = async () => {
    try {
      const result = await authApi.deleteAccount();
      if (result.success) {
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
        Alert.alert(
          'Account Deleted',
          'Your account has been permanently deleted.',
          [{ text: 'OK', onPress: () => authLogout() }]
        );
      }
    } catch (error: any) {
      const message = error?.response?.data?.message || error?.message || 'Failed to delete account. Please try again.';
      Alert.alert('Cannot Delete Account', message);
    }
  };

  // Handle refresh
  const onRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const displayName = profile || user;

  if (isLoading && !profile) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl
            refreshing={isLoading}
            onRefresh={onRefresh}
            colors={['#006B3F']}
            tintColor="#006B3F"
          />
        }
      >
        {/* Profile Header */}
        <View style={styles.header}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={80}
              label={getInitials()}
              style={styles.avatar}
              labelStyle={styles.avatarText}
            />
            <View style={styles.salonBadge}>
              <Ionicons name="business" size={14} color="#FFFFFF" />
            </View>
          </View>
          <Text variant="headlineSmall" style={styles.name} numberOfLines={1}>
            {displayName?.firstName} {displayName?.lastName}
          </Text>
          <Text variant="bodyMedium" style={styles.salonName} numberOfLines={1}>
            {salon?.businessName || 'Your Salon'}
          </Text>
          <View style={styles.contactRow}>
            <Ionicons name="call-outline" size={14} color="#6B7280" />
            <Text variant="bodySmall" style={styles.contactText}>
              {displayName?.phoneNumber}
            </Text>
            {displayName?.email && (
              <>
                <Text style={styles.contactSeparator}>•</Text>
                <Ionicons name="mail-outline" size={14} color="#6B7280" />
                <Text variant="bodySmall" style={styles.contactText}>
                  {displayName.email}
                </Text>
              </>
            )}
          </View>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsRow}>
          <View style={styles.statItem}>
            <Text style={styles.statValue}>{stats?.totalBookings || 0}</Text>
            <Text style={styles.statLabel}>Total Bookings</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <View style={styles.ratingRow}>
              <Ionicons name="star" size={16} color="#FCD116" />
              <Text style={[styles.statValue, { color: '#FCD116' }]}>
                {stats?.averageRating ? stats.averageRating.toFixed(1) : '-'}
              </Text>
            </View>
            <Text style={styles.statLabel}>Rating</Text>
          </View>
          <View style={styles.statDivider} />
          <View style={styles.statItem}>
            <Text style={[styles.statValue, { color: '#006B3F' }]}>
              GH₵{parseFloat(String(stats?.totalRevenue || 0)).toLocaleString()}
            </Text>
            <Text style={styles.statLabel}>Revenue</Text>
          </View>
        </View>

        {/* Payout Section */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="wallet-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Payouts
            </Text>
          </View>
          <Divider style={styles.sectionDivider} />
          
          {/* Available Balance - Highlighted */}
          <View style={styles.balanceCard}>
            <View style={styles.balanceHeader}>
              <Ionicons name="cash-outline" size={24} color="#006B3F" />
              <Text style={styles.balanceLabel}>Available to Withdraw</Text>
            </View>
            {payoutBalance ? (
              <Text style={styles.balanceValue}>
                GH₵{(payoutBalance.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </Text>
            ) : (
              <ActivityIndicator size="small" color="#006B3F" style={{ marginTop: 8 }} />
            )}
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Balance Details */}
          <View style={styles.balanceDetails}>
            <View style={styles.balanceDetailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="arrow-up-circle-outline" size={18} color="#10B981" />
                <Text style={styles.detailLabel}>Total Paid Out</Text>
              </View>
              {payoutBalance ? (
                <Text style={[styles.detailValue, { color: '#10B981' }]}>
                  GH₵{(payoutBalance.paidOutBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              ) : (
                <ActivityIndicator size="small" color="#10B981" />
              )}
            </View>

            <View style={styles.balanceDetailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="hourglass-outline" size={18} color="#F59E0B" />
                <Text style={styles.detailLabel}>Pending ({payoutBalance?.heldCount || 0})</Text>
              </View>
              {payoutBalance ? (
                <Text style={[styles.detailValue, { color: '#F59E0B' }]}>
                  GH₵{(payoutBalance.availableBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              ) : (
                <ActivityIndicator size="small" color="#F59E0B" />
              )}
            </View>

            <View style={styles.balanceDetailRow}>
              <View style={styles.detailLeft}>
                <Ionicons name="refresh-circle-outline" size={18} color="#EF4444" />
                <Text style={styles.detailLabel}>Refunded</Text>
              </View>
              {payoutBalance ? (
                <Text style={[styles.detailValue, { color: '#EF4444' }]}>
                  GH₵{(payoutBalance.refundedBalance || 0).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </Text>
              ) : (
                <ActivityIndicator size="small" color="#EF4444" />
              )}
            </View>
          </View>

          <Divider style={styles.sectionDivider} />

          {/* Payout Actions */}
          <View style={styles.payoutActions}>
            <TouchableOpacity 
              style={[
                styles.requestPayoutButton,
                (!payoutBalance || payoutBalance.availableBalance <= 0) && styles.requestPayoutButtonDisabled,
              ]}
              onPress={() => {
                if (payoutBalance && payoutBalance.availableBalance > 0) {
                  navigation.navigate('RequestPayout', {
                    availableBalance: payoutBalance.availableBalance,
                    salonId: salon?.id,
                  });
                }
              }}
              disabled={!payoutBalance || payoutBalance.availableBalance <= 0}
            >
              <Ionicons name="download-outline" size={18} color={payoutBalance && payoutBalance.availableBalance > 0 ? '#FFFFFF' : '#9CA3AF'} />
              <Text style={[styles.requestPayoutText, { color: payoutBalance && payoutBalance.availableBalance > 0 ? '#FFFFFF' : '#9CA3AF' }]}>
                Request Payout
              </Text>
            </TouchableOpacity>
            <TouchableOpacity 
              style={styles.payoutAccountRow}
              onPress={() => navigation.navigate('EditSalon')}
            >
              <Ionicons name="card-outline" size={18} color="#006B3F" />
              <Text style={styles.payoutAccountText}>Manage Account</Text>
            </TouchableOpacity>
          </View>

          {/* Payout History Link */}
          <TouchableOpacity
            style={styles.payoutHistoryButton}
            onPress={() => navigation.navigate('PayoutHistory')}
          >
            <Ionicons name="time-outline" size={18} color="#006B3F" />
            <Text style={styles.payoutHistoryText}>View Payout History</Text>
            <Ionicons name="chevron-forward" size={18} color="#9CA3AF" />
          </TouchableOpacity>
        </Surface>

        {/* Edit Profile Section */}
        {isEditing ? (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="create-outline" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>
                Edit Profile
              </Text>
            </View>
            <Divider style={styles.sectionDivider} />
            <TextInput
              label="First Name *"
              value={firstName}
              onChangeText={(text) => {
                setFirstName(text);
                setTouched({ ...touched, firstName: true });
              }}
              onBlur={() => setTouched({ ...touched, firstName: true })}
              error={touched.firstName && !!errors.firstName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
            {touched.firstName && errors.firstName && (
              <HelperText type="error">{errors.firstName}</HelperText>
            )}

            <TextInput
              label="Last Name"
              value={lastName}
              onChangeText={setLastName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              left={<TextInput.Icon icon="account-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={(text) => {
                setEmail(text);
                setTouched({ ...touched, email: true });
              }}
              onBlur={() => setTouched({ ...touched, email: true })}
              error={touched.email && !!errors.email}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              left={<TextInput.Icon icon="email-outline" color="#6B7280" />}
              theme={{ roundness: 10 }}
            />
            {touched.email && errors.email && (
              <HelperText type="error">{errors.email}</HelperText>
            )}

            <View style={styles.editActions}>
              <Button
                mode="outlined"
                onPress={handleCancelEdit}
                style={styles.cancelButton}
                textColor="#6B7280"
                theme={{ roundness: 10 }}
              >
                Cancel
              </Button>
              <Button
                mode="contained"
                onPress={handleSaveProfile}
                loading={updateMutation.isPending}
                disabled={updateMutation.isPending}
                style={styles.saveButton}
                buttonColor="#006B3F"
                theme={{ roundness: 10 }}
              >
                Save
              </Button>
            </View>
          </Surface>
        ) : (
          <TouchableOpacity onPress={() => setIsEditing(true)}>
            <Surface style={styles.section} elevation={0}>
              <View style={styles.editProfileHeader}>
                <View style={styles.editProfileInfo}>
                  <Ionicons name="person-circle-outline" size={20} color="#006B3F" />
                  <Text style={styles.editProfileText}>Edit Profile</Text>
                </View>
                <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
              </View>
            </Surface>
          </TouchableOpacity>
        )}

        {/* Menu Items */}
        <Surface style={styles.section} elevation={0}>
          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('EditSalon')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
              <Ionicons name="storefront-outline" size={20} color="#006B3F" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Salon Settings</Text>
              <Text style={styles.menuSubtitle}>Edit your salon details and hours</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => navigation.navigate('CompletionSettings')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="checkmark-done-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Completion Settings</Text>
              <Text style={styles.menuSubtitle}>Auto-completion, QR check-in & reminders</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Surface>

        {/* Settings Section */}
        <Surface style={styles.section} elevation={0}>
          <Text style={styles.sectionLabel}>Settings</Text>
          
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF9E7' }]}>
              <Ionicons name="notifications-outline" size={20} color="#D4A017" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Notifications</Text>
              <Text style={styles.menuSubtitle}>Receive booking reminders</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              color="#006B3F"
            />
          </View>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Coming Soon', 'Language settings will be available soon.')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F3F4F6' }]}>
              <Ionicons name="language-outline" size={20} color="#6B7280" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Language</Text>
              <Text style={styles.menuSubtitle}>English</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity 
            style={styles.menuItem}
            onPress={() => Alert.alert('Help', 'Contact support at support@groomlinkgh.com')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#F0FDF4' }]}>
              <Ionicons name="help-circle-outline" size={20} color="#10B981" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Help & Support</Text>
              <Text style={styles.menuSubtitle}>Get help with your account</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => navigation.navigate('PlatformFeedback')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#FEF9E7' }]}>
              <Ionicons name="heart-outline" size={20} color="#FCD116" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Rate GroomLink</Text>
              <Text style={styles.menuSubtitle}>Share your feedback about the app</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>

          <Divider style={styles.menuDivider} />

          <TouchableOpacity
            style={styles.menuItem}
            onPress={() => Linking.openURL('https://uk.trustpilot.com/review/groomlinkgh.com')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#E0F7FA' }]}>
              <Ionicons name="star-outline" size={20} color="#00B67A" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Review us on Trustpilot</Text>
              <Text style={styles.menuSubtitle}>Help others discover GroomLink</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
          </TouchableOpacity>
        </Surface>

        {/* Contact Support Button */}
        <TouchableOpacity 
          style={styles.contactSupportButton} 
          onPress={() => navigation.navigate('Chat' as never)}
        >
          <View style={[styles.menuIcon, { backgroundColor: '#E8F5E9' }]}>
            <Ionicons name="chatbubble-ellipses-outline" size={20} color="#006B3F" />
          </View>
          <Text style={styles.contactSupportText}>Contact Support</Text>
          <Ionicons name="chevron-forward" size={20} color="#9CA3AF" />
        </TouchableOpacity>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="log-out-outline" size={20} color="#CE1126" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
        </TouchableOpacity>

        {/* Delete Account Button */}
        <TouchableOpacity style={styles.deleteAccountButton} onPress={handleDeleteAccount}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="trash-outline" size={20} color="#DC2626" />
          </View>
          <View style={styles.menuContent}>
            <Text style={styles.deleteAccountText}>Delete Account</Text>
            <Text style={styles.deleteAccountSubtitle}>Permanently remove your account and data</Text>
          </View>
        </TouchableOpacity>

        {/* App Version */}
        <Text style={styles.version}>
          GroomLink Partners v{APP_VERSION}
        </Text>

        {/* Arthium Labs Footer */}
        <TouchableOpacity 
          style={styles.arthiumFooter}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Text style={styles.arthiumText}>An Arthium Labs Product</Text>
        </TouchableOpacity>
      </ScrollView>
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
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  header: {
    alignItems: 'center',
    paddingVertical: 20,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: theme.accent,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  salonBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: theme.warning,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.surface,
  },
  name: {
    fontWeight: 'bold',
    color: theme.text,
    marginBottom: 2,
  },
  salonName: {
    color: theme.accent,
    fontWeight: '500',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    color: theme.textSecondary,
  },
  contactSeparator: {
    color: theme.border,
    marginHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginBottom: 16,
  },
  statItem: {
    flex: 1,
    alignItems: 'center',
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: theme.border,
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: theme.text,
  },
  statLabel: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 12,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    padding: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.text,
  },
  sectionDivider: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.textSecondary,
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 8,
    textTransform: 'uppercase',
  },
  editProfileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
  },
  editProfileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  editProfileText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
  },
  input: {
    backgroundColor: theme.surface,
    marginHorizontal: 16,
    marginBottom: 12,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    padding: 16,
    paddingTop: 8,
  },
  cancelButton: {
    borderColor: theme.border,
    flex: 1,
  },
  saveButton: {
    flex: 1,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  menuIcon: {
    width: 40,
    height: 40,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  menuContent: {
    flex: 1,
    marginLeft: 12,
  },
  menuTitle: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
  },
  menuSubtitle: {
    fontSize: 12,
    color: theme.textTertiary,
    marginTop: 2,
  },
  menuDivider: {
    marginHorizontal: 16,
  },
  contactSupportButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  contactSupportText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#006B3F',
    marginLeft: 12,
    flex: 1,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.danger,
    marginLeft: 12,
  },
  deleteAccountButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  deleteAccountText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#DC2626',
  },
  deleteAccountSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  version: {
    textAlign: 'center',
    color: theme.textTertiary,
    marginTop: 24,
    fontSize: 12,
  },
  // Arthium Labs Footer
  arthiumFooter: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  arthiumText: {
    fontSize: 12,
    color: theme.textTertiary,
    opacity: 0.7,
  },
  // Payout Styles
  balanceCard: {
    backgroundColor: '#E8F5E9',
    borderRadius: 12,
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 8,
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
    fontSize: 28,
    fontWeight: 'bold',
    color: '#006B3F',
  },
  balanceDetails: {
    paddingHorizontal: 16,
  },
  balanceDetailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
  },
  detailLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  detailLabel: {
    fontSize: 14,
    color: theme.textSecondary,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  payoutActions: {
    flexDirection: 'row',
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  requestPayoutButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#006B3F',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  requestPayoutButtonDisabled: {
    backgroundColor: '#E5E7EB',
  },
  requestPayoutText: {
    fontSize: 14,
    fontWeight: '600',
  },
  payoutAccountRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 12,
    gap: 8,
  },
  payoutAccountText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#006B3F',
  },
  payoutHistoryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
    gap: 10,
    marginTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#E5E7EB',
  },
  payoutHistoryText: {
    flex: 1,
    fontSize: 14,
    fontWeight: '600',
    color: '#006B3F',
  },
});
