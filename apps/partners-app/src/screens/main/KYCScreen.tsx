import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Text, ActivityIndicator, Surface, Divider, TextInput, Button } from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { kycApi, KycStatus, KycSubmitData } from '../../api/kyc';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const STATUS_CONFIG: Record<KycStatus, { label: string; color: string; bg: string; icon: string }> = {
  NOT_SUBMITTED: { label: 'Not Submitted', color: '#6B7280', bg: '#F3F4F6', icon: 'alert-circle-outline' },
  PENDING: { label: 'Under Review', color: '#F59E0B', bg: '#FEF9E7', icon: 'hourglass-outline' },
  APPROVED: { label: 'Verified', color: '#10B981', bg: '#E8F5E9', icon: 'checkmark-circle-outline' },
  REJECTED: { label: 'Rejected', color: '#EF4444', bg: '#FEF2F2', icon: 'close-circle-outline' },
  NEEDS_INFO: { label: 'More Info Needed', color: '#3B82F6', bg: '#EFF6FF', icon: 'information-circle-outline' },
};

export default function KYCScreen() {
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const queryClient = useQueryClient();

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [businessType, setBusinessType] = useState('');
  const [businessAddress, setBusinessAddress] = useState('');
  const [regNumber, setRegNumber] = useState('');
  const [taxId, setTaxId] = useState('');
  const [uploadingField, setUploadingField] = useState<string | null>(null);

  const { data: kycStatus, isLoading, refetch } = useQuery({
    queryKey: ['kycStatus'],
    queryFn: kycApi.getStatus,
  });

  const status: KycStatus = kycStatus?.status || 'NOT_SUBMITTED';
  const submission = kycStatus?.submission;
  const statusConfig = STATUS_CONFIG[status];

  const submitMutation = useMutation({
    mutationFn: (data: KycSubmitData) => kycApi.submitKyc(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['kycStatus'] });
      Alert.alert('Success', 'Your KYC information has been submitted for review.');
    },
    onError: (error: Error) => {
      Alert.alert('Submission Failed', error.message || 'Please try again.');
    },
  });

  const handlePickAndUpload = async (field: 'governmentId' | 'selfieWithId' | 'businessCert' | 'proofOfAddress') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['images'],
        quality: 0.8,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setUploadingField(field);

      await kycApi.uploadDocument(field, asset.uri, asset.mimeType || 'image/jpeg');
      queryClient.invalidateQueries({ queryKey: ['kycStatus'] });
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.response?.data?.message || error.message || 'Could not upload file.');
    } finally {
      setUploadingField(null);
    }
  };

  const handlePickVideo = async (field: 'storefrontVideo' | 'interiorVideo') => {
    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ['videos'],
        quality: 0.6,
        allowsEditing: false,
      });

      if (result.canceled || !result.assets[0]) return;

      const asset = result.assets[0];
      setUploadingField(field);

      await kycApi.uploadDocument(field, asset.uri, asset.mimeType || 'video/mp4');
      queryClient.invalidateQueries({ queryKey: ['kycStatus'] });
    } catch (error: any) {
      Alert.alert('Upload Failed', error?.response?.data?.message || error.message || 'Could not upload video.');
    } finally {
      setUploadingField(null);
    }
  };

  const handleSubmitForm = () => {
    if (!businessName.trim()) {
      Alert.alert('Required', 'Please enter your business name.');
      return;
    }
    submitMutation.mutate({
      businessName: businessName.trim(),
      businessType: businessType.trim() || undefined,
      businessAddress: businessAddress.trim() || undefined,
      businessRegistrationNumber: regNumber.trim() || undefined,
      taxIdNumber: taxId.trim() || undefined,
    });
  };

  // Pre-fill form from existing submission
  React.useEffect(() => {
    if (submission) {
      if (submission.businessName) setBusinessName(submission.businessName);
      if (submission.businessType) setBusinessType(submission.businessType);
      if (submission.businessAddress) setBusinessAddress(submission.businessAddress);
      if (submission.businessRegistrationNumber) setRegNumber(submission.businessRegistrationNumber);
      if (submission.taxIdNumber) setTaxId(submission.taxIdNumber);
    }
  }, [submission]);

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#006B3F" />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        contentContainerStyle={styles.scrollContent}
        refreshControl={<RefreshControl refreshing={isLoading} onRefresh={refetch} colors={['#006B3F']} />}
      >
        {/* Status Card */}
        <Surface style={[styles.statusCard, { backgroundColor: statusConfig.bg }]} elevation={0}>
          <View style={styles.statusRow}>
            <Ionicons name={statusConfig.icon as any} size={28} color={statusConfig.color} />
            <View style={styles.statusText}>
              <Text style={[styles.statusLabel, { color: statusConfig.color }]}>
                {statusConfig.label}
              </Text>
              {status === 'REJECTED' && submission?.rejectionReason && (
                <Text style={styles.rejectionReason}>{submission.rejectionReason}</Text>
              )}
              {status === 'PENDING' && (
                <Text style={styles.statusSubtext}>Your documents are being reviewed</Text>
              )}
            </View>
          </View>
        </Surface>

        {/* Progress Steps */}
        <Surface style={styles.section} elevation={0}>
          <View style={styles.sectionHeader}>
            <Ionicons name="list-circle-outline" size={20} color="#006B3F" />
            <Text variant="titleMedium" style={styles.sectionTitle}>Verification Progress</Text>
          </View>
          <Divider style={styles.sectionDivider} />

          <ProgressStep label="Business Information" done={!!submission?.businessName} theme={theme} />
          <ProgressStep label="Government ID" done={!!submission?.governmentIdUrl} theme={theme} />
          <ProgressStep label="Selfie with ID" done={!!submission?.selfieWithIdUrl} theme={theme} />
          <ProgressStep label="Business Certificate" done={!!submission?.businessCertUrl} theme={theme} />
          <ProgressStep label="Proof of Address" done={!!submission?.proofOfAddressUrl} theme={theme} />
        </Surface>

        {/* Business Info Form */}
        {(status === 'NOT_SUBMITTED' || status === 'REJECTED' || status === 'NEEDS_INFO') && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="business-outline" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>Business Information</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <TextInput
              label="Business Name *"
              value={businessName}
              onChangeText={setBusinessName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              theme={{ roundness: 10 }}
            />
            <TextInput
              label="Business Type (e.g. Barbershop, Salon)"
              value={businessType}
              onChangeText={setBusinessType}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              theme={{ roundness: 10 }}
            />
            <TextInput
              label="Business Address"
              value={businessAddress}
              onChangeText={setBusinessAddress}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              theme={{ roundness: 10 }}
            />
            <TextInput
              label="Registration Number (optional)"
              value={regNumber}
              onChangeText={setRegNumber}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              theme={{ roundness: 10 }}
            />
            <TextInput
              label="Tax ID / TIN (optional)"
              value={taxId}
              onChangeText={setTaxId}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              theme={{ roundness: 10 }}
            />

            <Button
              mode="contained"
              onPress={handleSubmitForm}
              loading={submitMutation.isPending}
              disabled={submitMutation.isPending}
              style={styles.submitButton}
              buttonColor="#006B3F"
              theme={{ roundness: 10 }}
            >
              {submission ? 'Update Business Info' : 'Submit Business Info'}
            </Button>
          </Surface>
        )}

        {/* Document Uploads */}
        {(status === 'NOT_SUBMITTED' || status === 'REJECTED' || status === 'NEEDS_INFO') && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="document-text-outline" size={20} color="#006B3F" />
              <Text variant="titleMedium" style={styles.sectionTitle}>Documents</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <UploadItem
              label="Government ID"
              subtitle="Ghana Card, Passport, or Driver's License"
              uploaded={!!submission?.governmentIdUrl}
              uploading={uploadingField === 'governmentId'}
              onPress={() => handlePickAndUpload('governmentId')}
              theme={theme}
            />
            <UploadItem
              label="Selfie with ID"
              subtitle="Photo of you holding your ID"
              uploaded={!!submission?.selfieWithIdUrl}
              uploading={uploadingField === 'selfieWithId'}
              onPress={() => handlePickAndUpload('selfieWithId')}
              theme={theme}
            />
            <UploadItem
              label="Business Certificate"
              subtitle="Business registration or certificate"
              uploaded={!!submission?.businessCertUrl}
              uploading={uploadingField === 'businessCert'}
              onPress={() => handlePickAndUpload('businessCert')}
              theme={theme}
            />
            <UploadItem
              label="Proof of Address"
              subtitle="Utility bill, bank statement, or GhanaPost GPS"
              uploaded={!!submission?.proofOfAddressUrl}
              uploading={uploadingField === 'proofOfAddress'}
              onPress={() => handlePickAndUpload('proofOfAddress')}
              theme={theme}
            />
            <UploadItem
              label="Storefront Video"
              subtitle="Short video showing your shop exterior"
              uploaded={!!submission?.storefrontVideoUrl}
              uploading={uploadingField === 'storefrontVideo'}
              onPress={() => handlePickVideo('storefrontVideo')}
              theme={theme}
              isVideo
            />
            <UploadItem
              label="Interior Video"
              subtitle="Short video showing your workspace"
              uploaded={!!submission?.interiorVideoUrl}
              uploading={uploadingField === 'interiorVideo'}
              onPress={() => handlePickVideo('interiorVideo')}
              theme={theme}
              isVideo
            />
          </Surface>
        )}

        {/* Already verified */}
        {status === 'APPROVED' && (
          <Surface style={styles.section} elevation={0}>
            <View style={styles.verifiedContent}>
              <Ionicons name="shield-checkmark" size={48} color="#10B981" />
              <Text style={styles.verifiedTitle}>Your business is verified</Text>
              <Text style={styles.verifiedSubtitle}>
                Customers can see your verified badge, building trust and increasing bookings.
              </Text>
            </View>
          </Surface>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function ProgressStep({ label, done, theme }: { label: string; done: boolean; theme: AppTheme }) {
  return (
    <View style={progressStyles.row}>
      <View style={[progressStyles.circle, { backgroundColor: done ? '#10B981' : theme.surfaceVariant }]}>
        {done ? (
          <Ionicons name="checkmark" size={14} color="#FFFFFF" />
        ) : (
          <View style={progressStyles.dot} />
        )}
      </View>
      <Text style={[progressStyles.label, { color: done ? theme.text : theme.textSecondary }]}>
        {label}
      </Text>
    </View>
  );
}

const progressStyles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 10, gap: 12 },
  circle: { width: 24, height: 24, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  dot: { width: 8, height: 8, borderRadius: 4, backgroundColor: '#9CA3AF' },
  label: { fontSize: 14, fontWeight: '500' },
});

function UploadItem({
  label,
  subtitle,
  uploaded,
  uploading,
  onPress,
  theme,
  isVideo,
}: {
  label: string;
  subtitle: string;
  uploaded: boolean;
  uploading: boolean;
  onPress: () => void;
  theme: AppTheme;
  isVideo?: boolean;
}) {
  return (
    <TouchableOpacity style={uploadStyles.row} onPress={onPress} disabled={uploading}>
      <View style={[uploadStyles.icon, { backgroundColor: uploaded ? '#E8F5E9' : theme.surfaceVariant }]}>
        {uploading ? (
          <ActivityIndicator size="small" color="#006B3F" />
        ) : uploaded ? (
          <Ionicons name="checkmark-circle" size={20} color="#10B981" />
        ) : (
          <Ionicons name={isVideo ? 'videocam-outline' : 'image-outline'} size={20} color={theme.textSecondary} />
        )}
      </View>
      <View style={uploadStyles.text}>
        <Text style={[uploadStyles.label, { color: theme.text }]}>{label}</Text>
        <Text style={[uploadStyles.subtitle, { color: theme.textTertiary }]}>
          {uploaded ? 'Uploaded' : subtitle}
        </Text>
      </View>
      {!uploaded && !uploading && (
        <Ionicons name="cloud-upload-outline" size={20} color="#006B3F" />
      )}
    </TouchableOpacity>
  );
}

const uploadStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  icon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  text: { flex: 1 },
  label: { fontSize: 14, fontWeight: '500' },
  subtitle: { fontSize: 12, marginTop: 2 },
});

const createStyles = (theme: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.background },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  scrollContent: { padding: 16, paddingBottom: 32 },

  statusCard: { borderRadius: 14, padding: 16, marginBottom: 16 },
  statusRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  statusText: { flex: 1 },
  statusLabel: { fontSize: 16, fontWeight: '700' },
  statusSubtext: { fontSize: 12, color: theme.textSecondary, marginTop: 4 },
  rejectionReason: { fontSize: 12, color: '#EF4444', marginTop: 4 },

  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  sectionHeader: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 16, paddingBottom: 8 },
  sectionTitle: { fontWeight: '600', color: theme.text },
  sectionDivider: { marginHorizontal: 16, marginBottom: 8 },

  input: { backgroundColor: theme.surface, marginHorizontal: 16, marginBottom: 12 },
  submitButton: { margin: 16, marginTop: 4 },

  verifiedContent: { alignItems: 'center', paddingVertical: 32, paddingHorizontal: 24, gap: 12 },
  verifiedTitle: { fontSize: 18, fontWeight: '700', color: theme.text, textAlign: 'center' },
  verifiedSubtitle: { fontSize: 14, color: theme.textSecondary, textAlign: 'center' },
});
