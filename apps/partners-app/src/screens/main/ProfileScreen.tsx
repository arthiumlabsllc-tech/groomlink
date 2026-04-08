import React, { useState, useCallback } from 'react';
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
  Card,
  Divider,
  List,
  Surface,
  Switch,
  TextInput,
  ActivityIndicator,
  HelperText,
  Text,
} from 'react-native-paper';
import { authApi } from '../../api/auth';
import { useAuthStore } from '../../store/authStore';
import { MainStackParamList } from '../../types/navigation';
import Constants from 'expo-constants';

type NavigationProp = NativeStackNavigationProp<MainStackParamList>;

const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

interface FormErrors {
  firstName?: string;
  lastName?: string;
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
    lastName: false,
    email: false,
  });

  // Settings state
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);

  // Fetch fresh profile data
  const { data: profile, isLoading, refetch } = useQuery({
    queryKey: ['profile'],
    queryFn: authApi.getProfile,
  });

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

    if (!lastName.trim()) {
      newErrors.lastName = 'Last name is required';
    } else if (lastName.trim().length < 2) {
      newErrors.lastName = 'Last name must be at least 2 characters';
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
    setTouched({ firstName: false, lastName: false, email: false });
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
          <Avatar.Text
            size={80}
            label={getInitials()}
            style={styles.avatar}
            labelStyle={styles.avatarText}
          />
          <Text variant="headlineSmall" style={styles.name}>
            {displayName?.firstName} {displayName?.lastName}
          </Text>
          <Text variant="bodyMedium" style={styles.phone}>
            {displayName?.phoneNumber}
          </Text>
          {displayName?.email && (
            <Text variant="bodyMedium" style={styles.email}>
              {displayName.email}
            </Text>
          )}
        </View>

        {/* Edit Profile Section */}
        <Surface style={styles.section} elevation={1}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Edit Profile
            </Text>
            {!isEditing && (
              <Button
                mode="text"
                onPress={() => setIsEditing(true)}
                textColor="#006B3F"
                compact
              >
                Edit
              </Button>
            )}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
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
                outlineColor="#E0E0E0"
                activeOutlineColor="#006B3F"
                style={styles.input}
              />
              {touched.firstName && errors.firstName && (
                <HelperText type="error">{errors.firstName}</HelperText>
              )}

              <TextInput
                label="Last Name *"
                value={lastName}
                onChangeText={(text) => {
                  setLastName(text);
                  setTouched({ ...touched, lastName: true });
                }}
                onBlur={() => setTouched({ ...touched, lastName: true })}
                error={touched.lastName && !!errors.lastName}
                mode="outlined"
                outlineColor="#E0E0E0"
                activeOutlineColor="#006B3F"
                style={styles.input}
              />
              {touched.lastName && errors.lastName && (
                <HelperText type="error">{errors.lastName}</HelperText>
              )}

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
                outlineColor="#E0E0E0"
                activeOutlineColor="#006B3F"
                style={styles.input}
                keyboardType="email-address"
                autoCapitalize="none"
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
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.profileInfo}>
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>First Name</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{displayName?.firstName}</Text>
              </View>
              <Divider />
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Last Name</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{displayName?.lastName}</Text>
              </View>
              <Divider />
              <View style={styles.infoRow}>
                <Text variant="bodyMedium" style={styles.infoLabel}>Email</Text>
                <Text variant="bodyMedium" style={styles.infoValue}>{displayName?.email || 'Not set'}</Text>
              </View>
            </View>
          )}
        </Surface>

        {/* Salon Settings Card */}
        <TouchableOpacity onPress={() => navigation.navigate('EditSalon')}>
          <Surface style={styles.section} elevation={1}>
            <List.Item
              title="Salon Settings"
              description="Edit your salon details and business hours"
              left={(props) => <List.Icon {...props} icon="store" color="#006B3F" />}
              right={(props) => <List.Icon {...props} icon="chevron-right" />}
              titleStyle={styles.listTitle}
            />
          </Surface>
        </TouchableOpacity>

        {/* Settings Section */}
        <Surface style={styles.section} elevation={1}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Settings
          </Text>
          
          <List.Item
            title="Notifications"
            description="Receive booking and reminder notifications"
            left={(props) => <List.Icon {...props} icon="bell" />}
            right={() => (
              <Switch
                value={notificationsEnabled}
                onValueChange={setNotificationsEnabled}
                color="#006B3F"
              />
            )}
            titleStyle={styles.listTitle}
          />
          
          <Divider />
          
          <List.Item
            title="Language"
            description="English"
            left={(props) => <List.Icon {...props} icon="translate" />}
            right={(props) => <List.Icon {...props} icon="chevron-right" />}
            titleStyle={styles.listTitle}
            onPress={() => Alert.alert('Coming Soon', 'Language settings will be available soon.')}
          />
        </Surface>

        {/* Logout Button */}
        <Button
          mode="outlined"
          onPress={handleLogout}
          style={styles.logoutButton}
          textColor="#D32F2F"
          icon="logout"
        >
          Logout
        </Button>

        {/* App Version */}
        <Text variant="bodySmall" style={styles.version}>
          GroomLink Partners v{APP_VERSION}
        </Text>
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
    paddingVertical: 24,
  },
  avatar: {
    backgroundColor: '#006B3F',
    marginBottom: 16,
  },
  avatarText: {
    color: '#FFFFFF',
    fontSize: 32,
    fontWeight: 'bold',
  },
  name: {
    fontWeight: 'bold',
    color: '#111827',
    marginBottom: 4,
  },
  phone: {
    color: '#6B7280',
  },
  email: {
    color: '#6B7280',
  },
  section: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#111827',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: 8,
  },
  profileInfo: {
    paddingHorizontal: 16,
    paddingBottom: 8,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 12,
  },
  infoLabel: {
    color: '#6B7280',
  },
  infoValue: {
    color: '#111827',
    fontWeight: '500',
  },
  editForm: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  input: {
    backgroundColor: '#FFFFFF',
    marginTop: 8,
  },
  editActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
    marginTop: 16,
  },
  cancelButton: {
    borderColor: '#E0E0E0',
    borderRadius: 8,
  },
  saveButton: {
    borderRadius: 8,
    paddingHorizontal: 24,
  },
  listTitle: {
    color: '#111827',
  },
  logoutButton: {
    borderColor: '#D32F2F',
    borderRadius: 8,
    marginTop: 8,
  },
  version: {
    textAlign: 'center',
    color: '#9CA3AF',
    marginTop: 24,
  },
});
