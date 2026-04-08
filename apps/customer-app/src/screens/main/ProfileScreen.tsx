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
  ActivityIndicator,
  List,
} from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useAuthStore } from '../../store/authStore';
import { authApi } from '../../api/auth';

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

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="headlineSmall" style={styles.headerTitle}>Profile</Text>
        </View>

        {/* Profile Card */}
        <View style={styles.profileCard}>
          <Avatar.Text
            size={80}
            label={getInitials()}
            style={styles.avatar}
            labelStyle={styles.avatarLabel}
          />
          <Text variant="headlineSmall" style={styles.userName}>
            {getDisplayName()}
          </Text>
          <Text variant="bodyMedium" style={styles.userPhone}>
            {user?.phoneNumber}
          </Text>
          {user?.email && (
            <Text variant="bodyMedium" style={styles.userEmail}>
              {user.email}
            </Text>
          )}
        </View>

        <Divider />

        {/* Edit Profile Section */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              Edit Profile
            </Text>
            {!isEditing ? (
              <TouchableOpacity onPress={() => setIsEditing(true)}>
                <Ionicons name="pencil" size={20} color="#006B3F" />
              </TouchableOpacity>
            ) : null}
          </View>

          {isEditing ? (
            <View style={styles.editForm}>
              <TextInput
                label="First Name"
                value={firstName}
                onChangeText={setFirstName}
                mode="outlined"
                style={styles.input}
                outlineColor="#ddd"
                activeOutlineColor="#006B3F"
              />
              <TextInput
                label="Last Name"
                value={lastName}
                onChangeText={setLastName}
                mode="outlined"
                style={styles.input}
                outlineColor="#ddd"
                activeOutlineColor="#006B3F"
              />
              <TextInput
                label="Email (Optional)"
                value={email}
                onChangeText={setEmail}
                mode="outlined"
                keyboardType="email-address"
                autoCapitalize="none"
                style={styles.input}
                outlineColor="#ddd"
                activeOutlineColor="#006B3F"
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
                  textColor="#666"
                >
                  Cancel
                </Button>
                <Button
                  mode="contained"
                  onPress={handleSaveProfile}
                  loading={updateProfileMutation.isPending}
                  disabled={updateProfileMutation.isPending}
                  style={styles.saveButton}
                >
                  Save
                </Button>
              </View>
            </View>
          ) : (
            <View style={styles.viewOnlyInfo}>
              <View style={styles.infoRow}>
                <Ionicons name="person-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text variant="labelSmall" style={styles.infoLabel}>Full Name</Text>
                  <Text variant="bodyMedium">{getDisplayName()}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="call-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text variant="labelSmall" style={styles.infoLabel}>Phone</Text>
                  <Text variant="bodyMedium">{user?.phoneNumber}</Text>
                </View>
              </View>
              <View style={styles.infoRow}>
                <Ionicons name="mail-outline" size={20} color="#666" />
                <View style={styles.infoContent}>
                  <Text variant="labelSmall" style={styles.infoLabel}>Email</Text>
                  <Text variant="bodyMedium">{user?.email || 'Not set'}</Text>
                </View>
              </View>
            </View>
          )}
        </View>

        <Divider />

        {/* Settings Section */}
        <View style={styles.section}>
          <Text variant="titleMedium" style={styles.sectionTitle}>Settings</Text>
          
          <View style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="notifications-outline" size={22} color="#666" />
              <Text variant="bodyLarge" style={styles.settingText}>Notifications</Text>
            </View>
            <Switch
              value={notificationsEnabled}
              onValueChange={setNotificationsEnabled}
              color="#006B3F"
            />
          </View>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="language-outline" size={22} color="#666" />
              <Text variant="bodyLarge" style={styles.settingText}>Language</Text>
            </View>
            <View style={styles.settingRight}>
              <Text variant="bodyMedium" style={styles.settingValue}>English</Text>
              <Ionicons name="chevron-forward" size={20} color="#ccc" />
            </View>
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="help-circle-outline" size={22} color="#666" />
              <Text variant="bodyLarge" style={styles.settingText}>Help & Support</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>

          <TouchableOpacity style={styles.settingItem}>
            <View style={styles.settingLeft}>
              <Ionicons name="document-text-outline" size={22} color="#666" />
              <Text variant="bodyLarge" style={styles.settingText}>Terms & Privacy</Text>
            </View>
            <Ionicons name="chevron-forward" size={20} color="#ccc" />
          </TouchableOpacity>
        </View>

        <Divider />

        {/* Logout Section */}
        <View style={styles.section}>
          <Button
            mode="outlined"
            onPress={() => setShowLogoutDialog(true)}
            style={styles.logoutButton}
            textColor="#CE1126"
            icon="logout"
          >
            Logout
          </Button>
        </View>

        {/* App Version */}
        <View style={styles.versionContainer}>
          <Text variant="bodySmall" style={styles.versionText}>
            GroomLink v{APP_VERSION}
          </Text>
        </View>
      </ScrollView>

      {/* Logout Confirmation Dialog */}
      <Portal>
        <Dialog
          visible={showLogoutDialog}
          onDismiss={() => setShowLogoutDialog(false)}
          style={styles.dialog}
        >
          <Dialog.Title>Logout</Dialog.Title>
          <Dialog.Content>
            <Text variant="bodyMedium">Are you sure you want to logout?</Text>
          </Dialog.Content>
          <Dialog.Actions>
            <Button onPress={() => setShowLogoutDialog(false)} textColor="#666">
              Cancel
            </Button>
            <Button onPress={handleLogout} textColor="#CE1126">
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
    backgroundColor: '#f5f5f5',
  },
  header: {
    padding: 16,
    backgroundColor: '#fff',
  },
  headerTitle: {
    fontWeight: 'bold',
    color: '#006B3F',
  },
  profileCard: {
    alignItems: 'center',
    padding: 24,
    backgroundColor: '#fff',
  },
  avatar: {
    backgroundColor: '#006B3F',
    marginBottom: 16,
  },
  avatarLabel: {
    fontSize: 28,
    fontWeight: '600',
  },
  userName: {
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  userPhone: {
    color: '#666',
  },
  userEmail: {
    color: '#666',
    marginTop: 2,
  },
  section: {
    padding: 16,
    backgroundColor: '#fff',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontWeight: '600',
    color: '#006B3F',
    marginBottom: 12,
  },
  viewOnlyInfo: {
    gap: 16,
  },
  infoRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  infoContent: {
    marginLeft: 12,
    flex: 1,
  },
  infoLabel: {
    color: '#888',
    marginBottom: 2,
  },
  editForm: {
    gap: 12,
  },
  input: {
    backgroundColor: '#fafafa',
  },
  editActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderColor: '#ddd',
  },
  saveButton: {
    flex: 1,
    backgroundColor: '#006B3F',
  },
  settingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 12,
  },
  settingLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  settingText: {
    marginLeft: 12,
  },
  settingRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  settingValue: {
    color: '#888',
    marginRight: 4,
  },
  logoutButton: {
    borderColor: '#CE1126',
    borderRadius: 8,
  },
  versionContainer: {
    alignItems: 'center',
    paddingVertical: 24,
  },
  versionText: {
    color: '#999',
  },
  dialog: {
    borderRadius: 12,
  },
});
