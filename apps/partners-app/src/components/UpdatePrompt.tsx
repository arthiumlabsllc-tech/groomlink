import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Platform,
} from 'react-native';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';
import { useAppTheme } from '../theme/ThemeContext';

const API_BASE = 'https://groomlinkgh.com/api';

interface VersionInfo {
  updateAvailable: boolean;
  mandatory: boolean;
  latestVersion: string | null;
  updateUrl: string | null;
  message: string | null;
}

/**
 * UpdatePrompt
 * Checks for app updates on mount and shows a prompt if an update is available.
 * - mandatory=true → blocking modal (no dismiss button)
 * - mandatory=false → dismissible popup
 */
export default function UpdatePrompt({ children }: { children: React.ReactNode }) {
  const { theme } = useAppTheme();
  const [versionInfo, setVersionInfo] = useState<VersionInfo | null>(null);
  const [dismissed, setDismissed] = useState(false);

  useEffect(() => {
    checkForUpdate();
  }, []);

  const checkForUpdate = async () => {
    try {
      const currentVersion = Constants.expoConfig?.version || '1.0.0';
      const response = await axios.get(`${API_BASE}/config/app-version`, {
        params: {
          app: 'partners',
          platform: Platform.OS,
          currentVersion,
        },
        timeout: 5000,
      });
      if (response.data?.success && response.data?.data) {
        setVersionInfo(response.data.data);
      }
    } catch (error) {
      console.log('Version check failed:', error);
    }
  };

  const openStore = () => {
    if (versionInfo?.updateUrl) {
      Linking.openURL(versionInfo.updateUrl);
    }
  };

  const showPrompt = versionInfo?.updateAvailable && !dismissed;
  const isBlocking = versionInfo?.mandatory === true;

  if (!showPrompt) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <Modal
        visible={true}
        transparent={false}
        animationType="fade"
        statusBarTranslucent
      >
        <View style={[styles.overlay, { backgroundColor: 'rgba(0,0,0,0.7)' }]}>
          <View style={[styles.card, { backgroundColor: theme.surface }]}>
            {/* Icon */}
            <View style={[styles.iconContainer, { backgroundColor: `${theme.primary}14` }]}>
              <MaterialIcons name="system-update" size={48} color={theme.primary} />
            </View>

            {/* Title */}
            <Text style={[styles.title, { color: theme.text }]}>
              {isBlocking ? 'Update Required' : 'Update Available'}
            </Text>

            {/* Message */}
            <Text style={[styles.message, { color: theme.textSecondary }]}>
              {versionInfo?.message || 'A new version of GroomLink Partners is available!'}
            </Text>

            {/* Version info */}
            {versionInfo?.latestVersion && (
              <Text style={[styles.versionText, { color: theme.textTertiary }]}>
                Latest version: {versionInfo.latestVersion}
              </Text>
            )}

            {/* Update button */}
            <TouchableOpacity
              style={[styles.updateButton, { backgroundColor: theme.primary }]}
              onPress={openStore}
              activeOpacity={0.8}
            >
              <MaterialIcons name="download" size={20} color="#fff" />
              <Text style={styles.updateButtonText}>Update Now</Text>
            </TouchableOpacity>

            {/* Dismiss button (only for optional updates) */}
            {!isBlocking && (
              <TouchableOpacity
                style={styles.dismissButton}
                onPress={() => setDismissed(true)}
                activeOpacity={0.7}
              >
                <Text style={[styles.dismissText, { color: theme.textSecondary }]}>Maybe Later</Text>
              </TouchableOpacity>
            )}

            {/* Blocking notice */}
            {isBlocking && (
              <Text style={[styles.blockingNotice, { color: '#CE1126' }]}>
                You must update to continue using GroomLink Partners
              </Text>
            )}
          </View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    borderRadius: 24,
    padding: 32,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.2,
    shadowRadius: 24,
    elevation: 12,
  },
  iconContainer: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 13,
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: 'row',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 28,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    width: '100%',
  },
  updateButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  dismissButton: {
    marginTop: 14,
    paddingVertical: 8,
  },
  dismissText: {
    fontSize: 14,
    fontWeight: '500',
  },
  blockingNotice: {
    marginTop: 14,
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
