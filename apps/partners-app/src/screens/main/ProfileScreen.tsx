import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Avatar,
  Button,
  Divider,
  List,
  Surface,
  Switch,
  TextInput,
  ActivityIndicator,
  HelperText,
  Text,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { authApi } from '../../api/auth';
import { salonApi } from '../../api/salon';
import { useAuthStore } from '../../store/authStore';
import { MainStackParamList } from '../../types/navigation';
import { CompletionSettings } from '../../types';
import Constants from 'expo-constants';

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

  // Completion settings state
  const [completionSettings, setCompletionSettings] = useState<CompletionSettings>({
    autoCompletionHours: 2,
    requiresCustomerConfirmation: false,
    completionReminderEnabled: true,
    qrCheckinEnabled: false,
  });
  const [hasSettingsChanges, setHasSettingsChanges] = useState(false);

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

  // Fetch completion settings
  const { data: fetchedCompletionSettings } = useQuery({
    queryKey: ['completionSettings', salon?.id],
    queryFn: () => (salon ? salonApi.getCompletionSettings(salon.id) : null),
    enabled: !!salon?.id,
  });

  // Update completion settings when fetched
  useEffect(() => {
    if (fetchedCompletionSettings && !hasSettingsChanges) {
      setCompletionSettings(fetchedCompletionSettings);
    }
  }, [fetchedCompletionSettings, hasSettingsChanges]);

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

  // Update completion settings mutation
  const updateCompletionSettingsMutation = useMutation({
    mutationFn: (settings: Partial<CompletionSettings>) => {
      if (!salon?.id) throw new Error('No salon found');
      return salonApi.updateCompletionSettings(salon.id, settings);
    },
    onSuccess: () => {
      setHasSettingsChanges(false);
      queryClient.invalidateQueries({ queryKey: ['completionSettings'] });
      Alert.alert('Success', 'Completion settings updated successfully');
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update settings: ${error.message}`);
    },
  });

  // Handle completion settings change
  const handleCompletionSettingChange = <K extends keyof CompletionSettings>(
    key: K,
    value: CompletionSettings[K]
  ) => {
    setCompletionSettings((prev) => ({ ...prev, [key]: value }));
    setHasSettingsChanges(true);
  };

  // Handle save completion settings
  const handleSaveCompletionSettings = () => {
    updateCompletionSettingsMutation.mutate(completionSettings);
  };

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
          <Text variant="headlineSmall" style={styles.name}>
            {displayName?.firstName} {displayName?.lastName}
          </Text>
          <Text variant="bodyMedium" style={styles.salonName}>
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
            onPress={() => navigation.getParent()?.navigate('Staff')}
          >
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="people-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Manage Staff</Text>
              <Text style={styles.menuSubtitle}>Add or edit team members</Text>
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
        </Surface>

        {/* Service Completion Settings */}
        <Surface style={styles.section} elevation={0}>
          <Text style={styles.sectionLabel}>Service Completion</Text>
          
          {/* Auto-completion hours */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#EFF6FF' }]}>
              <Ionicons name="time-outline" size={20} color="#3B82F6" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Auto-completion</Text>
              <Text style={styles.menuSubtitle}>
                Automatically complete after {completionSettings.autoCompletionHours} hour(s)
              </Text>
            </View>
            <View style={styles.stepperContainer}>
              <TouchableOpacity
                style={[styles.stepperButton, completionSettings.autoCompletionHours <= 1 && styles.stepperButtonDisabled]}
                onPress={() => {
                  if (completionSettings.autoCompletionHours > 1) {
                    handleCompletionSettingChange('autoCompletionHours', completionSettings.autoCompletionHours - 1);
                  }
                }}
                disabled={completionSettings.autoCompletionHours <= 1}
              >
                <Ionicons name="remove" size={18} color={completionSettings.autoCompletionHours <= 1 ? '#D1D5DB' : '#3B82F6'} />
              </TouchableOpacity>
              <Text style={styles.stepperValue}>{completionSettings.autoCompletionHours}</Text>
              <TouchableOpacity
                style={[styles.stepperButton, completionSettings.autoCompletionHours >= 6 && styles.stepperButtonDisabled]}
                onPress={() => {
                  if (completionSettings.autoCompletionHours < 6) {
                    handleCompletionSettingChange('autoCompletionHours', completionSettings.autoCompletionHours + 1);
                  }
                }}
                disabled={completionSettings.autoCompletionHours >= 6}
              >
                <Ionicons name="add" size={18} color={completionSettings.autoCompletionHours >= 6 ? '#D1D5DB' : '#3B82F6'} />
              </TouchableOpacity>
            </View>
          </View>

          <Divider style={styles.menuDivider} />

          {/* Customer confirmation toggle */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#FEF3C7' }]}>
              <Ionicons name="checkmark-circle-outline" size={20} color="#D97706" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Customer Confirmation</Text>
              <Text style={styles.menuSubtitle}>Require customer to confirm completion</Text>
            </View>
            <Switch
              value={completionSettings.requiresCustomerConfirmation}
              onValueChange={(value) => handleCompletionSettingChange('requiresCustomerConfirmation', value)}
              color="#006B3F"
            />
          </View>

          <Divider style={styles.menuDivider} />

          {/* Completion reminders toggle */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#DBEAFE' }]}>
              <Ionicons name="notifications-outline" size={20} color="#2563EB" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>Completion Reminders</Text>
              <Text style={styles.menuSubtitle}>Send reminders to complete service</Text>
            </View>
            <Switch
              value={completionSettings.completionReminderEnabled}
              onValueChange={(value) => handleCompletionSettingChange('completionReminderEnabled', value)}
              color="#006B3F"
            />
          </View>

          <Divider style={styles.menuDivider} />

          {/* QR check-in toggle */}
          <View style={styles.menuItem}>
            <View style={[styles.menuIcon, { backgroundColor: '#D1FAE5' }]}>
              <Ionicons name="qr-code-outline" size={20} color="#059669" />
            </View>
            <View style={styles.menuContent}>
              <Text style={styles.menuTitle}>QR Check-in</Text>
              <Text style={styles.menuSubtitle}>Allow customers to check in via QR</Text>
            </View>
            <Switch
              value={completionSettings.qrCheckinEnabled}
              onValueChange={(value) => handleCompletionSettingChange('qrCheckinEnabled', value)}
              color="#006B3F"
            />
          </View>

          {/* Save button */}
          {hasSettingsChanges && (
            <View style={styles.saveButtonContainer}>
              <Button
                mode="contained"
                onPress={handleSaveCompletionSettings}
                loading={updateCompletionSettingsMutation.isPending}
                disabled={updateCompletionSettingsMutation.isPending}
                buttonColor="#006B3F"
                theme={{ roundness: 10 }}
                style={styles.saveSettingsButton}
              >
                Save Settings
              </Button>
            </View>
          )}
        </Surface>

        {/* Logout Button */}
        <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
          <View style={[styles.menuIcon, { backgroundColor: '#FEF2F2' }]}>
            <Ionicons name="log-out-outline" size={20} color="#CE1126" />
          </View>
          <Text style={styles.logoutText}>Logout</Text>
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#F9FAFB',
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
    backgroundColor: '#006B3F',
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
    backgroundColor: '#FCD116',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#FFFFFF',
  },
  name: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 2,
  },
  salonName: {
    color: '#006B3F',
    fontWeight: '500',
    marginBottom: 8,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    color: '#6B7280',
  },
  contactSeparator: {
    color: '#D1D5DB',
    marginHorizontal: 4,
  },
  statsRow: {
    flexDirection: 'row',
    backgroundColor: '#FFFFFF',
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
    backgroundColor: '#F3F4F6',
  },
  statValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#111827',
  },
  statLabel: {
    fontSize: 12,
    color: '#6B7280',
    marginTop: 4,
  },
  ratingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  section: {
    backgroundColor: '#FFFFFF',
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
    color: '#111827',
  },
  sectionDivider: {
    marginHorizontal: 16,
    marginBottom: 12,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#6B7280',
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
    color: '#111827',
  },
  input: {
    backgroundColor: '#FFFFFF',
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
    borderColor: '#E5E7EB',
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
    color: '#111827',
  },
  menuSubtitle: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 2,
  },
  menuDivider: {
    marginHorizontal: 16,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 14,
    padding: 14,
    marginTop: 4,
  },
  logoutText: {
    fontSize: 15,
    fontWeight: '500',
    color: '#CE1126',
    marginLeft: 12,
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
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
    color: '#9CA3AF',
    opacity: 0.7,
  },
  // Stepper styles
  stepperContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stepperButton: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stepperButtonDisabled: {
    backgroundColor: '#F3F4F6',
  },
  stepperValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#111827',
    minWidth: 24,
    textAlign: 'center',
  },
  // Save button styles
  saveButtonContainer: {
    padding: 16,
    paddingTop: 8,
  },
  saveSettingsButton: {
    borderRadius: 10,
  },
});
