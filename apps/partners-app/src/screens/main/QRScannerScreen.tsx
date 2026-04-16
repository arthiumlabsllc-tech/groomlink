import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Alert,
  Dimensions,
  TouchableOpacity,
} from 'react-native';
import {
  Text,
  Button,
  Surface,
  TextInput,
  Portal,
  Dialog,
  ActivityIndicator,
} from 'react-native-paper';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { Ionicons } from '@expo/vector-icons';
import { SafeAreaView } from 'react-native-safe-area-context';
import { bookingsApi } from '../../api/bookings';
import { MainStackParamList } from '../../types';

// Try to import expo-barcode-scanner, fallback to null if not installed
let BarCodeScanner: any = null;
let BarCodeScannerConstants: any = null;
try {
  const barcodeScanner = require('expo-barcode-scanner');
  BarCodeScanner = barcodeScanner.BarCodeScanner;
  BarCodeScannerConstants = barcodeScanner;
} catch (e) {
  // expo-barcode-scanner not installed
}

interface BarCodeScannerResult {
  type: string;
  data: string;
}

type QRScannerRouteProp = RouteProp<MainStackParamList, 'QRScanner'>;

interface QRData {
  bookingId?: string;
  checkinCode?: string;
  [key: string]: any;
}

export default function QRScannerScreen() {
  const navigation = useNavigation();
  const route = useRoute<QRScannerRouteProp>();
  const queryClient = useQueryClient();
  const { bookingId } = route.params || {};
  
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const [manualCodeVisible, setManualCodeVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);

  // Request camera permission on mount
  useEffect(() => {
    (async () => {
      if (!BarCodeScanner) {
        setHasPermission(false);
        return;
      }
      const { status } = await BarCodeScanner.requestPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  // Check-in mutation
  const checkinMutation = useMutation({
    mutationFn: async (data: { qrData?: string; checkinCode?: string; bookingId?: string }) => {
      return bookingsApi.checkinByQR(data);
    },
    onSuccess: (data) => {
      setIsProcessing(false);
      queryClient.invalidateQueries({ queryKey: ['booking', data.id] });
      queryClient.invalidateQueries({ queryKey: ['salonBookings'] });
      queryClient.invalidateQueries({ queryKey: ['queue'] });
      
      Alert.alert(
        'Check-in Successful',
        `Customer: ${data.customer.firstName} ${data.customer.lastName}\nService: ${data.service.name}${data.queuePosition ? `\nQueue Position: #${data.queuePosition}` : ''}`,
        [
          {
            text: 'OK',
            onPress: () => navigation.goBack(),
          },
        ]
      );
    },
    onError: (error: any) => {
      setIsProcessing(false);
      setScanned(false);
      Alert.alert(
        'Check-in Failed',
        error.response?.data?.message || 'Failed to check in. Please try again.'
      );
    },
  });

  const handleBarCodeScanned = useCallback((result: BarCodeScannerResult) => {
    if (scanned || isProcessing) return;
    
    setScanned(true);
    setIsProcessing(true);
    
    try {
      // Parse QR data - could be JSON or just a code string
      let qrData: QRData = {};
      try {
        qrData = JSON.parse(result.data);
      } catch {
        // If not valid JSON, treat as plain checkin code
        qrData = { checkinCode: result.data };
      }
      
      // Call the checkin API
      checkinMutation.mutate({
        qrData: result.data,
        bookingId: qrData.bookingId || bookingId,
        checkinCode: qrData.checkinCode,
      });
    } catch (error) {
      setIsProcessing(false);
      setScanned(false);
      Alert.alert('Invalid QR Code', 'The scanned QR code is not valid.');
    }
  }, [scanned, isProcessing, bookingId, checkinMutation]);

  const handleManualCheckin = () => {
    if (!manualCode.trim()) {
      Alert.alert('Error', 'Please enter a check-in code.');
      return;
    }
    
    setManualCodeVisible(false);
    setIsProcessing(true);
    
    checkinMutation.mutate({
      checkinCode: manualCode.trim(),
      bookingId,
    });
  };

  const handleScanAgain = () => {
    setScanned(false);
  };

  // BarCodeScanner not installed
  if (!BarCodeScanner) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="qr-code-outline" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>QR Scanner Not Available</Text>
          <Text style={styles.permissionText}>
            Please install expo-barcode-scanner to use the QR scanning feature.{'\n\n'}
            Run: expo install expo-barcode-scanner
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            buttonColor="#006B3F"
          >
            Go Back
          </Button>
          
          {/* Manual entry is still available */}
          <Button
            mode="outlined"
            onPress={() => setManualCodeVisible(true)}
            style={[styles.manualEntryButton, { marginTop: 12 }]}
            textColor="#006B3F"
            icon="keyboard"
          >
            Enter Code Manually
          </Button>
        </View>
        
        {/* Manual Entry Dialog */}
        <Portal>
          <Dialog
            visible={manualCodeVisible}
            onDismiss={() => setManualCodeVisible(false)}
            style={styles.dialog}
          >
            <Dialog.Title style={styles.dialogTitle}>Enter Check-in Code</Dialog.Title>
            <Dialog.Content>
              <Text style={styles.dialogText}>
                Enter the check-in code provided by the customer
              </Text>
              <TextInput
                mode="outlined"
                placeholder="e.g., ABC123"
                value={manualCode}
                onChangeText={setManualCode}
                autoCapitalize="characters"
                style={styles.codeInput}
                outlineColor="#E5E7EB"
                activeOutlineColor="#006B3F"
                theme={{ roundness: 10 }}
              />
            </Dialog.Content>
            <Dialog.Actions style={styles.dialogActions}>
              <Button
                onPress={() => setManualCodeVisible(false)}
                textColor="#6B7280"
              >
                Cancel
              </Button>
              <Button
                onPress={handleManualCheckin}
                loading={checkinMutation.isPending}
                disabled={checkinMutation.isPending || !manualCode.trim()}
                textColor="#006B3F"
              >
                Check In
              </Button>
            </Dialog.Actions>
          </Dialog>
        </Portal>
      </SafeAreaView>
    );
  }

  // Permission handling
  if (hasPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
          <Text style={styles.permissionText}>Requesting camera permission...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.permissionContainer}>
          <Ionicons name="camera-off" size={64} color="#9CA3AF" />
          <Text style={styles.permissionTitle}>Camera Access Denied</Text>
          <Text style={styles.permissionText}>
            Please grant camera permission in your device settings to scan QR codes.
          </Text>
          <Button
            mode="contained"
            onPress={() => navigation.goBack()}
            style={styles.backButton}
            buttonColor="#006B3F"
          >
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButtonContainer}>
          <Ionicons name="arrow-back" size={24} color="#111827" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Scan QR Code</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.cameraContainer}>
        <BarCodeScanner
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
          style={StyleSheet.absoluteFillObject}
          barCodeTypes={[BarCodeScannerConstants?.Constants?.BarCodeType?.qr || 'qr']}
        />
        
        {/* Scan overlay */}
        <View style={styles.overlay}>
          <View style={styles.overlayTop} />
          <View style={styles.overlayMiddle}>
            <View style={styles.overlaySide} />
            <View style={styles.scanFrame}>
              {/* Corner markers */}
              <View style={[styles.corner, styles.cornerTopLeft]} />
              <View style={[styles.corner, styles.cornerTopRight]} />
              <View style={[styles.corner, styles.cornerBottomLeft]} />
              <View style={[styles.corner, styles.cornerBottomRight]} />
              
              {/* Scan line */}
              {!scanned && !isProcessing && (
                <View style={styles.scanLine} />
              )}
              
              {/* Processing indicator */}
              {isProcessing && (
                <View style={styles.processingOverlay}>
                  <ActivityIndicator size="large" color="#006B3F" />
                  <Text style={styles.processingText}>Processing...</Text>
                </View>
              )}
              
              {/* Scanned state */}
              {scanned && !isProcessing && (
                <View style={styles.scannedOverlay}>
                  <Ionicons name="checkmark-circle" size={48} color="#10B981" />
                  <Text style={styles.scannedText}>QR Code Scanned</Text>
                </View>
              )}
            </View>
            <View style={styles.overlaySide} />
          </View>
          <View style={styles.overlayBottom} />
        </View>
      </View>

      {/* Instructions */}
      <Surface style={styles.instructionsContainer} elevation={0}>
        <Ionicons name="scan-outline" size={32} color="#006B3F" />
        <Text style={styles.instructionsTitle}>Scan Customer QR Code</Text>
        <Text style={styles.instructionsText}>
          Position the QR code within the frame to check in the customer
        </Text>
        
        {scanned && !isProcessing && (
          <Button
            mode="contained"
            onPress={handleScanAgain}
            style={styles.scanAgainButton}
            buttonColor="#006B3F"
            icon="refresh"
          >
            Scan Again
          </Button>
        )}
      </Surface>

      {/* Manual Entry Button */}
      <View style={styles.manualEntryContainer}>
        <Button
          mode="outlined"
          onPress={() => setManualCodeVisible(true)}
          style={styles.manualEntryButton}
          textColor="#006B3F"
          icon="keyboard"
          disabled={isProcessing}
        >
          Enter Code Manually
        </Button>
      </View>

      {/* Manual Entry Dialog */}
      <Portal>
        <Dialog
          visible={manualCodeVisible}
          onDismiss={() => setManualCodeVisible(false)}
          style={styles.dialog}
        >
          <Dialog.Title style={styles.dialogTitle}>Enter Check-in Code</Dialog.Title>
          <Dialog.Content>
            <Text style={styles.dialogText}>
              Enter the check-in code provided by the customer
            </Text>
            <TextInput
              mode="outlined"
              placeholder="e.g., ABC123"
              value={manualCode}
              onChangeText={setManualCode}
              autoCapitalize="characters"
              style={styles.codeInput}
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              theme={{ roundness: 10 }}
            />
          </Dialog.Content>
          <Dialog.Actions style={styles.dialogActions}>
            <Button
              onPress={() => setManualCodeVisible(false)}
              textColor="#6B7280"
            >
              Cancel
            </Button>
            <Button
              onPress={handleManualCheckin}
              loading={checkinMutation.isPending}
              disabled={checkinMutation.isPending || !manualCode.trim()}
              textColor="#006B3F"
            >
              Check In
            </Button>
          </Dialog.Actions>
        </Dialog>
      </Portal>
    </SafeAreaView>
  );
}

const { width } = Dimensions.get('window');
const frameSize = Math.min(width - 64, 280);

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFFFFF',
  },
  backButtonContainer: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
  },
  placeholder: {
    width: 40,
  },
  cameraContainer: {
    flex: 1,
    position: 'relative',
  },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    flexDirection: 'column',
  },
  overlayTop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayMiddle: {
    flexDirection: 'row',
    height: frameSize,
  },
  overlaySide: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  overlayBottom: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  scanFrame: {
    width: frameSize,
    height: frameSize,
    position: 'relative',
    borderRadius: 16,
    overflow: 'hidden',
  },
  corner: {
    position: 'absolute',
    width: 24,
    height: 24,
    borderColor: '#006B3F',
    borderWidth: 4,
  },
  cornerTopLeft: {
    top: 0,
    left: 0,
    borderRightWidth: 0,
    borderBottomWidth: 0,
    borderTopLeftRadius: 16,
  },
  cornerTopRight: {
    top: 0,
    right: 0,
    borderLeftWidth: 0,
    borderBottomWidth: 0,
    borderTopRightRadius: 16,
  },
  cornerBottomLeft: {
    bottom: 0,
    left: 0,
    borderRightWidth: 0,
    borderTopWidth: 0,
    borderBottomLeftRadius: 16,
  },
  cornerBottomRight: {
    bottom: 0,
    right: 0,
    borderLeftWidth: 0,
    borderTopWidth: 0,
    borderBottomRightRadius: 16,
  },
  scanLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 2,
    backgroundColor: '#006B3F',
    top: '50%',
    shadowColor: '#006B3F',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 4,
    elevation: 4,
  },
  processingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: '#FFFFFF',
    marginTop: 12,
    fontSize: 16,
    fontWeight: '500',
  },
  scannedOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scannedText: {
    color: '#FFFFFF',
    marginTop: 8,
    fontSize: 16,
    fontWeight: '500',
  },
  instructionsContainer: {
    backgroundColor: '#FFFFFF',
    padding: 24,
    alignItems: 'center',
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    marginTop: -24,
  },
  instructionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#111827',
    marginTop: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  scanAgainButton: {
    marginTop: 16,
    borderRadius: 12,
    paddingHorizontal: 24,
  },
  manualEntryContainer: {
    backgroundColor: '#FFFFFF',
    padding: 16,
    paddingBottom: 32,
  },
  manualEntryButton: {
    borderRadius: 12,
    borderColor: '#006B3F',
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#F9FAFB',
  },
  permissionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: '#111827',
    marginTop: 16,
  },
  permissionText: {
    fontSize: 14,
    color: '#6B7280',
    textAlign: 'center',
    marginTop: 8,
    lineHeight: 20,
  },
  backButton: {
    marginTop: 24,
    borderRadius: 12,
    paddingHorizontal: 32,
  },
  dialog: {
    borderRadius: 16,
    backgroundColor: '#FFFFFF',
  },
  dialogTitle: {
    fontWeight: '600',
    color: '#111827',
  },
  dialogText: {
    color: '#6B7280',
    marginBottom: 16,
  },
  codeInput: {
    backgroundColor: '#FFFFFF',
  },
  dialogActions: {
    paddingHorizontal: 20,
    paddingBottom: 16,
  },
});
