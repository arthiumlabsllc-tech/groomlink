import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  Modal,
  TouchableOpacity,
  Linking,
  StyleSheet,
  Platform,
  ActivityIndicator,
} from 'react-native';
import Constants from 'expo-constants';
import { MaterialIcons } from '@expo/vector-icons';
import axios from 'axios';

const API_BASE = 'https://api.groomlinkgh.com/api';

interface VersionInfo {
  updateAvailable: boolean;
  mandatory: boolean;
  latestVersion: string | null;
  updateUrl: string | null;
  message: string | null;
}

/**
 * UpdatePromptModal
 * Checks for app updates on mount and shows a prompt if an update is available.
 * - mandatory=true → blocking modal (no dismiss button)
 * - mandatory=false → dismissible popup
 */
export default function UpdatePromptModal({ children }: { children: React.ReactNode }) {
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
          app: 'customer',
          platform: Platform.OS,
          currentVersion,
        },
        timeout: 5000,
      });
      if (response.data?.success && response.data?.data) {
        setVersionInfo(response.data.data);
      }
    } catch (error) {
      // Silently fail - don't block the app
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
        <View style={styles.overlay}>
          <View style={styles.card}>
            {/* Icon */}
            <View style={styles.iconContainer}>
              <MaterialIcons name="system-update" size={48} color="#006B3F" />
            </View>

            {/* Title */}
            <Text style={styles.title}>
              {isBlocking ? 'Update Required' : 'Update Available'}
            </Text>

            {/* Message */}
            <Text style={styles.message}>
              {versionInfo?.message || 'A new version of GroomLink is available!'}
            </Text>

            {/* Version info */}
            {versionInfo?.latestVersion && (
              <Text style={styles.versionText}>
                Latest version: {versionInfo.latestVersion}
              </Text>
            )}

            {/* Update button */}
            <TouchableOpacity
              style={styles.updateButton}
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
                <Text style={styles.dismissText}>Maybe Later</Text>
              </TouchableOpacity>
            )}

            {/* Blocking notice */}
            {isBlocking && (
              <Text style={styles.blockingNotice}>
                You must update to continue using GroomLink
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
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  card: {
    backgroundColor: '#fff',
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
    backgroundColor: 'rgba(0,107,63,0.08)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  title: {
    fontSize: 22,
    fontWeight: '700',
    color: '#111',
    textAlign: 'center',
    marginBottom: 10,
  },
  message: {
    fontSize: 15,
    color: '#555',
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: 8,
  },
  versionText: {
    fontSize: 13,
    color: '#888',
    textAlign: 'center',
    marginBottom: 24,
  },
  updateButton: {
    flexDirection: 'row',
    backgroundColor: '#006B3F',
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
    color: '#666',
    fontSize: 14,
    fontWeight: '500',
  },
  blockingNotice: {
    marginTop: 14,
    color: '#CE1126',
    fontSize: 12,
    fontWeight: '500',
    textAlign: 'center',
  },
});
