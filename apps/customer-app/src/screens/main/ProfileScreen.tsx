import React, { useState, useEffect, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  Linking,
  Image,
} from 'react-native';
import {
  Text,
  Avatar,
  Button,
  TextInput,
  Divider,
  Switch,
  Dialog,
  Portal,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import * as Notifications from 'expo-notifications';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';
import Constants from 'expo-constants';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

// Design System Colors - theme-aware factory
const createColors = (t: AppTheme) => ({
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: t.background,
  cardBackground: t.surface,
  textPrimary: t.text,
  textSecondary: t.textSecondary,
  border: t.border,
});

// App version from expo config
const APP_VERSION = Constants.expoConfig?.version || '1.0.0';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { theme, isDark } = useAppTheme();
  const COLORS = useMemo(() => createColors(theme), [theme]);
  const styles = useMemo(() => createStyles(COLORS), [COLORS]);
  const { user, setUser, logout, isAuthenticated } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [profileImage, setProfileImage] = useState<string | null>(user?.avatar || null);
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);
  const [showLanguageDialog, setShowLanguageDialog] = useState(false);

  const updateProfileMutation = useMutation({
    mutationFn: (data: Partial<{ firstName: string; lastName: string; email: string }>) =>
      authApi.updateProfile(data),
    onSuccess: (response) => {
      setUser(response.data);
      setIsEditing(false);
      queryClient.invalidateQueries({ queryKey: ['user'] });
    },
    onError: (error: any) => {
      Alert.alert('Update Failed', error.response?.data?.message || 'Please try again');
    },
  });

  const handleSaveProfile = () => {
    if (!firstName.trim() || !lastName.trim()) {
      Alert.alert('Required Fields', 'Please fill in your first and last name');
      return;
    }
    updateProfileMutation.mutate({
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      ...(email.trim() && { email: email.trim() }),
    });
  };

  const handleLogout = async () => {
    setShowLogoutDialog(false);
    try {
      await authApi.logout();
      logout();
    } catch (error) {
      // Still logout even if API call fails
      logout();
    }
  };

  const getInitials = () => {
    const first = user?.firstName?.[0] || '';
    const last = user?.lastName?.[0] || '';
    return `${first}${last}`.toUpperCase() || '?';
  };

  const getDisplayName = () => {
    if (user?.firstName && user?.lastName) {
      return `${user.firstName} ${user.lastName}`;
    }
    return user?.firstName || 'User';
  };

  // Load avatar from user on mount
  useEffect(() => {
    if (user?.avatar) {
      setProfileImage(user.avatar);
    }
  }, [user?.avatar]);

  // Image picker handler with server upload
  const pickImage = async () => {
    try {
      const permissionResult = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permissionResult.granted) {
        Alert.alert('Permission Required', 'Please allow access to your photo library to update your profile picture.');
        return;
      }

      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.8,
      });

      if (!result.canceled && result.assets[0]) {
        const uri = result.assets[0].uri;
        setProfileImage(uri);
        
        // Upload to server
        try {
          const formData = new FormData();
          formData.append('avatar', {
            uri: uri,
            type: 'image/jpeg',
            name: 'avatar.jpg',
          } as any);
          
          const response = await authApi.uploadAvatar(formData);
          
          if (response?.data?.avatar) {
            setProfileImage(response.data.avatar);
            // Update auth store user with new avatar
            setUser({ ...user, avatar: response.data.avatar } as any);
          }
        } catch (error: any) {
          console.error('Failed to upload image:', error);
          Alert.alert('Upload Failed', error.response?.data?.message || 'Failed to upload image. Please try again.');
        }
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to pick image. Please try again.');
    }
  };

  // Notification toggle handler
  const handleNotificationToggle = async (enabled: boolean) => {
    if (enabled) {
      try {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          Alert.alert('Permission Required', 'Please enable notifications in your device settings to receive updates.');
          return;
        }
        
        // Get push token for future use
        // const token = await Notifications.getExpoPushTokenAsync();
        setNotificationsEnabled(true);
      } catch (error) {
        Alert.alert('Error', 'Failed to enable notifications. Please try again.');
      }
    } else {
      setNotificationsEnabled(false);
    }
  };

  // Open terms and privacy in browser
  const openTerms = () => {
    Linking.openURL('https://groomlinkgh.com/terms').catch(() => {
      Alert.alert('Error', 'Could not open terms page. Please visit groomlinkgh.com/terms');
    });
  };

  // Open privacy policy in browser
  const openPrivacy = () => {
    Linking.openURL('https://groomlinkgh.com/privacy').catch(() => {
      Alert.alert('Error', 'Could not open privacy page. Please visit groomlinkgh.com/privacy');
    });
  };

  // Open email for support
  const openSupport = () => {
    Linking.openURL('mailto:support@groomlinkgh.com?subject=Help%20Request%20from%20GroomLink%20App').catch(() => {
      Alert.alert('Contact Support', 'Email us at support@groomlinkgh.com for help.');
    });
  };

  // Terms & Privacy handler
  const handleTermsPress = () => {
    Alert.alert(
      'Terms & Privacy',
      'View our terms and privacy policies online.',
      [
        { text: 'Terms of Service', onPress: openTerms },
        { text: 'Privacy Policy', onPress: openPrivacy },
        { text: 'Cancel', style: 'cancel' },
      ]
    );
  };

  const renderSettingItem = (icon: string, label: string, onPress?: () => void, rightElement?: React.ReactNode) => (
    <TouchableOpacity style={styles.settingItem} onPress={onPress} disabled={!onPress}>
      <View style={styles.settingLeft}>
        <View style={styles.settingIconContainer}>
          <Ionicons name={icon as any} size={20} color={COLORS.primaryGreen} />
        </View>
        <Text variant="bodyLarge" style={styles.settingText}>{label}</Text>
      </View>
      {rightElement || <Ionicons name="chevron-forward" size={20} color={COLORS.border} />}
    </TouchableOpacity>
  );

  // Unauthenticated state - show login prompt
  if (!isAuthenticated) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loginPromptContainer}>
          <View style={styles.loginPromptIconContainer}>
            <Ionicons name="person-outline" size={80} color={COLORS.primaryGreen} />
          </View>
          <Text variant="headlineSmall" style={styles.loginPromptTitle}>
            Login to Your Profile
          </Text>
          <Text variant="bodyMedium" style={styles.loginPromptSubtitle}>
            Sign in to manage your account, preferences, and settings
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.getParent()?.navigate('Auth')}
            style={styles.loginPromptButton}
            buttonColor={COLORS.primaryGreen}
          >
            Login
          </Button>
        </View>
      </SafeAreaView>
    );
  }
  
  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          {/* GroomLink Logo */}
          <View style={styles.logoContainer}>
            <Image
              source={isDark ? require('../../../assets/logo-full-white.png') : require('../../../assets/logo-full-black.png')}
              style={styles.logoImage}
              resizeMode="contain"
            />
          </View>
          <View style={styles.avatarContainer}>
            {profileImage ? (
              <Image source={{ uri: profileImage }} style={styles.profileImage} />
            ) : (
              <Avatar.Text
                size={100}
                label={getInitials()}
                style={styles.avatar}
                labelStyle={styles.avatarLabel}
              />
            )}
            <TouchableOpacity style={styles.editAvatarButton} onPress={pickImage}>
              <Ionicons name="camera" size={18} color="#fff" />
            </TouchableOpacity>
          </View>
          <Text variant="headlineSmall" style={styles.userName}>
            {getDisplayName()}
          </Text>
          <Text variant="bodyMedium" style={styles.userEmail}>
            {user?.email || user?.phoneNumber}
          </Text>
        </View>

        {/* Personal Info Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>Personal Information</Text>
            {!isEditing && (
              <TouchableOpacity onPress={() => setIsEditing(true)} style={styles.editButton}>
                <Ionicons name="pencil" size={18} color={COLORS.primaryGreen} />
              </TouchableOpacity>
            )}
          </View>

          <View style={styles.card}>
            {isEditing ? (
              <View style={styles.editForm}>
                <TextInput
                  label="First Name"
                  value={firstName}
                  onChangeText={setFirstName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primaryGreen}
                  textColor={COLORS.textPrimary}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primaryGreen}
                  textColor={COLORS.textPrimary}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <TextInput
                  label="Email (Optional)"
                  value={email}
                  onChangeText={setEmail}
                  mode="outlined"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  style={styles.input}
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primaryGreen}
                  textColor={COLORS.textPrimary}
                  placeholderTextColor={COLORS.textSecondary}
                />
                <View style={styles.editActions}>
                  <Button
                    mode="outlined"
                    onPress={() => {
                      setIsEditing(false);
                      setFirstName(user?.firstName || '');
                      setLastName(user?.lastName || '');
                      setEmail(user?.email || '');
                    }}
                    style={styles.cancelButton}
                    textColor={COLORS.textSecondary}
                  >
                    Cancel
                  </Button>
                  <Button
                    mode="contained"
                    onPress={handleSaveProfile}
                    loading={updateProfileMutation.isPending}
                    disabled={updateProfileMutation.isPending}
                    style={styles.saveButton}
                    buttonColor={COLORS.primaryGreen}
                  >
                    Save
                  </Button>
                </View>
              </View>
            ) : (
              <View style={styles.infoList}>
                <View style={styles.infoItem}>
                  <Ionicons name="person-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Full Name</Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>{getDisplayName()}</Text>
                  </View>
                </View>
                <Divider style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="call-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Phone</Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>{user?.phoneNumber}</Text>
                  </View>
                </View>
                <Divider style={styles.infoDivider} />
                <View style={styles.infoItem}>
                  <Ionicons name="mail-outline" size={20} color={COLORS.textSecondary} />
                  <View style={styles.infoContent}>
                    <Text variant="bodySmall" style={styles.infoLabel}>Email</Text>
                    <Text variant="bodyMedium" style={styles.infoValue}>{user?.email || 'Not set'}</Text>
                  </View>
                </View>
              </View>
            )}
          </View>
        </View>

        {/* Settings Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
          <View style={styles.card}>
            {renderSettingItem(
              'notifications-outline',
              'Notifications',
              undefined,
              <Switch
                value={notificationsEnabled}
                onValueChange={handleNotificationToggle}
                color={COLORS.primaryGreen}
              />
            )}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('language-outline', 'Language', () => setShowLanguageDialog(true), (
              <View style={styles.settingRight}>
                <Text variant="bodyMedium" style={styles.settingValue}>English</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
              </View>
            ))}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('heart-outline', 'Rate GroomLink', () => navigation.navigate('PlatformFeedback'))}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('help-circle-outline', 'Help & Support', openSupport)}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('document-text-outline', 'Terms & Privacy', handleTermsPress)}
          </View>
        </View>

        {/* About Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>About</Text>
          <View style={styles.card}>
            <View style={styles.aboutItem}>
              <Ionicons name="information-circle-outline" size={20} color={COLORS.primaryGreen} />
              <Text variant="bodyMedium" style={styles.aboutText}>Version {APP_VERSION}</Text>
            </View>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.logoutSection}>
          <TouchableOpacity 
            style={styles.logoutButton}
            onPress={() => setShowLogoutDialog(true)}
          >
            <Ionicons name="log-out-outline" size={22} color={COLORS.accentRed} />
            <Text style={styles.logoutText}>Logout</Text>
          </TouchableOpacity>
        </View>

        {/* Arthium Labs Footer */}
        <TouchableOpacity 
          style={styles.arthiumFooter}
          onPress={() => {}}
          activeOpacity={0.7}
        >
          <Text style={styles.arthiumText}>An Arthium Labs Product</Text>
        </TouchableOpacity>

        <View style={styles.bottomPadding} />
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showLogoutDialog}
          onDismiss={() => setShowLogoutDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Logout</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Are you sure you want to logout?
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)} textColor={COLORS.textSecondary}>
              Cancel
            </Button>
            <Button onPress={handleLogout} textColor={COLORS.accentRed}>
              Logout
            </Button>
          </Dialog.Actions>
        </Dialog>

        {/* Language Dialog */}
        <Dialog
          visible={showLanguageDialog}
          onDismiss={() => setShowLanguageDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Language</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium" style={styles.dialogText}>
              Currently only English is available. More languages coming soon!
            </Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLanguageDialog(false)} textColor={COLORS.primaryGreen}>
              OK
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const createStyles = (COLORS: ReturnType<typeof createColors>) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.background,
  },
  // Profile Header
  profileHeader: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: COLORS.cardBackground,
    borderBottomLeftRadius: 24,
    borderBottomRightRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 8,
    elevation: 4,
  },
  logoContainer: {
    marginBottom: 16,
  },
  logoImage: {
    width: 140,
    height: 40,
  },
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: COLORS.primaryGreen,
  },
  profileImage: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: COLORS.background,
  },
  avatarLabel: {
    fontSize: 36,
    fontWeight: '600',
  },
  editAvatarButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: COLORS.accentGold,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.cardBackground,
  },
  userName: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 4,
  },
  userEmail: {
    color: COLORS.textSecondary,
  },
  // Section
  section: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontWeight: '600',
    color: COLORS.textPrimary,
  },
  editButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Card
  card: {
    backgroundColor: COLORS.cardBackground,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  // Info List
  infoList: {
    gap: 12,
  },
  infoItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
  },
  infoContent: {
    marginLeft: 16,
    flex: 1,
  },
  infoLabel: {
    color: COLORS.textSecondary,
    marginBottom: 2,
  },
  infoValue: {
    color: COLORS.textPrimary,
    fontWeight: '500',
  },
  infoDivider: {
    backgroundColor: COLORS.border,
  },
  // Edit Form
  editForm: {
    gap: 12,
  },
  input: {
    backgroundColor: COLORS.background,
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderColor: COLORS.border,
    borderRadius: 12,
  },
  saveButton: {
    flex: 1,
    borderRadius: 12,
  },
  // Settings
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 14,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  settingText: {
    color: COLORS.textPrimary,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: COLORS.textSecondary,
    marginRight: 4,
  },
  settingDivider: {
    backgroundColor: COLORS.border,
  },
  // About
  aboutItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    gap: 12,
  },
  aboutText: {
    color: COLORS.textSecondary,
  },
  // Logout
  logoutSection: {
    paddingHorizontal: 16,
    marginTop: 24,
  },
  logoutButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: COLORS.cardBackground,
    paddingVertical: 16,
    borderRadius: 16,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 8,
    elevation: 4,
  },
  logoutText: {
    color: COLORS.accentRed,
    fontSize: 16,
    fontWeight: '600',
  },
  bottomPadding: {
    height: 32,
  },
  // Arthium Labs Footer
  arthiumFooter: {
    alignItems: 'center',
    marginTop: 16,
    paddingVertical: 12,
  },
  arthiumText: {
    fontSize: 12,
    color: COLORS.textSecondary,
    opacity: 0.7,
  },
  // Dialog
  dialog: {
    borderRadius: 16,
    backgroundColor: COLORS.cardBackground,
  },
  dialogTitle: {
    color: COLORS.textPrimary,
  },
  dialogText: {
    color: COLORS.textSecondary,
  },
  // Login Prompt (unauthenticated)
  loginPromptContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
  },
  loginPromptIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${COLORS.primaryGreen}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
  },
  loginPromptTitle: {
    fontWeight: 'bold',
    color: COLORS.textPrimary,
    marginBottom: 8,
  },
  loginPromptSubtitle: {
    color: COLORS.textSecondary,
    textAlign: 'center',
    paddingHorizontal: 24,
    marginBottom: 32,
    lineHeight: 20,
  },
  loginPromptButton: {
    borderRadius: 12,
    paddingHorizontal: 32,
  },
});
