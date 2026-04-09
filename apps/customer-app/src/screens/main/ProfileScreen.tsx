import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
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
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

// Design System Colors
const COLORS = {
  primaryGreen: '#006B3F',
  accentGold: '#FCD116',
  accentRed: '#CE1126',
  dark: '#1a1a2e',
  background: '#F9FAFB',
  cardBackground: '#FFFFFF',
  textPrimary: '#111827',
  textSecondary: '#6B7280',
  border: '#E5E7EB',
};

// App version - would normally come from app config
const APP_VERSION = '1.0.0';

export default function ProfileScreen() {
  const navigation = useNavigation<any>();
  const queryClient = useQueryClient();
  const { user, setUser, logout } = useAuthStore();

  const [isEditing, setIsEditing] = useState(false);
  const [firstName, setFirstName] = useState(user?.firstName || '');
  const [lastName, setLastName] = useState(user?.lastName || '');
  const [email, setEmail] = useState(user?.email || '');
  const [notificationsEnabled, setNotificationsEnabled] = useState(true);
  const [showLogoutDialog, setShowLogoutDialog] = useState(false);

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Profile Header */}
        <View style={styles.profileHeader}>
          <View style={styles.avatarContainer}>
            <Avatar.Text
              size={100}
              label={getInitials()}
              style={styles.avatar}
              labelStyle={styles.avatarLabel}
            />
            <TouchableOpacity style={styles.editAvatarButton}>
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
                />
                <TextInput
                  label="Last Name"
                  value={lastName}
                  onChangeText={setLastName}
                  mode="outlined"
                  style={styles.input}
                  outlineColor={COLORS.border}
                  activeOutlineColor={COLORS.primaryGreen}
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
                onValueChange={setNotificationsEnabled}
                color={COLORS.primaryGreen}
              />
            )}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('language-outline', 'Language', undefined, (
              <View style={styles.settingRight}>
                <Text variant="bodyMedium" style={styles.settingValue}>English</Text>
                <Ionicons name="chevron-forward" size={20} color={COLORS.border} />
              </View>
            ))}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('help-circle-outline', 'Help & Support')}
            <Divider style={styles.settingDivider} />
            {renderSettingItem('document-text-outline', 'Terms & Privacy')}
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
      </Portal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
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
  avatarContainer: {
    position: 'relative',
    marginBottom: 16,
  },
  avatar: {
    backgroundColor: COLORS.primaryGreen,
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
});
