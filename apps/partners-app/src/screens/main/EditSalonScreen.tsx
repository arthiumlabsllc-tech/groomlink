import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  TextInput,
  Button,
  Menu,
  Divider,
  ActivityIndicator,
  HelperText,
  Surface,
  Switch,
  Card,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';
import { salonApi, CreateSalonData } from '../../api/salon';
import { OpeningHours } from '../../types';
import { useAppTheme } from '../../theme/ThemeContext';
import type { AppTheme } from '../../theme/colors';

const BUSINESS_CATEGORIES = [
  { label: 'Barbershop', value: 'BARBERSHOP', icon: 'cut' },
  { label: 'Hair Salon', value: 'HAIR_SALON', icon: 'scissors' },
  { label: 'Nail Salon', value: 'NAIL_SALON', icon: 'hand-left' },
  { label: 'Pedicure Salon', value: 'PEDICURE_SALON', icon: 'footsteps' },
  { label: 'Spa', value: 'SPA', icon: 'leaf' },
  { label: 'Beauty Salon', value: 'BEAUTY_SALON', icon: 'sparkles' },
];

const DAYS_OF_WEEK = [
  { key: 'monday', label: 'Mon', fullLabel: 'Monday' },
  { key: 'tuesday', label: 'Tue', fullLabel: 'Tuesday' },
  { key: 'wednesday', label: 'Wed', fullLabel: 'Wednesday' },
  { key: 'thursday', label: 'Thu', fullLabel: 'Thursday' },
  { key: 'friday', label: 'Fri', fullLabel: 'Friday' },
  { key: 'saturday', label: 'Sat', fullLabel: 'Saturday' },
  { key: 'sunday', label: 'Sun', fullLabel: 'Sunday' },
] as const;

const TIME_OPTIONS = (() => {
  const times: { label: string; value: string }[] = [];
  for (let hour = 0; hour < 24; hour++) {
    for (let minute = 0; minute < 60; minute += 30) {
      const h = hour.toString().padStart(2, '0');
      const m = minute.toString().padStart(2, '0');
      const displayHour = hour % 12 || 12;
      const ampm = hour < 12 ? 'AM' : 'PM';
      times.push({
        label: `${displayHour}:${m} ${ampm}`,
        value: `${h}:${m}`,
      });
    }
  }
  return times;
})();

const MAX_GALLERY_IMAGES = 20;
const MAX_GALLERY_VIDEOS = 5;
const MAX_PICK_PER_BATCH = 5;
const MAX_VIDEO_SIZE_BYTES = 50 * 1024 * 1024; // 50MB

interface FormErrors {
  businessName?: string;
  address?: string;
  city?: string;
  phone?: string;
}

type DayHours = {
  open: string;
  close: string;
  isOpen: boolean;
};

type HoursState = {
  [K in typeof DAYS_OF_WEEK[number]['key']]: DayHours;
};

const defaultHours: HoursState = {
  monday: { open: '09:00', close: '18:00', isOpen: true },
  tuesday: { open: '09:00', close: '18:00', isOpen: true },
  wednesday: { open: '09:00', close: '18:00', isOpen: true },
  thursday: { open: '09:00', close: '18:00', isOpen: true },
  friday: { open: '09:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '16:00', isOpen: true },
  sunday: { open: '10:00', close: '14:00', isOpen: false },
};

export default function EditSalonScreen() {
  const navigation = useNavigation();
  const queryClient = useQueryClient();
  const { theme } = useAppTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);

  // Fetch salon data
  const { data: salon, isLoading: salonLoading } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  // Form state
  const [businessName, setBusinessName] = useState('');
  const [address, setAddress] = useState('');
  const [city, setCity] = useState('');
  const [region, setRegion] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [email, setEmail] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('BARBERSHOP');
  const [openingHours, setOpeningHours] = useState<HoursState>(defaultHours);

  // Payout account state
  const [payoutType, setPayoutType] = useState<'bank' | 'mobile_money'>('mobile_money');
  const [bankAccountNumber, setBankAccountNumber] = useState('');
  const [bankAccountName, setBankAccountName] = useState('');
  const [bankCode, setBankCode] = useState('');
  const [momoProvider, setMomoProvider] = useState<'mtn' | 'vod' | 'tgo'>('mtn');
  const [momoNumber, setMomoNumber] = useState('');

  // Image state
  const [galleryImages, setGalleryImages] = useState<string[]>([]);
  const [galleryVideos, setGalleryVideos] = useState<string[]>([]);
  const [uploadingLogo, setUploadingLogo] = useState(false);
  const [uploadingCover, setUploadingCover] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [uploadingVideos, setUploadingVideos] = useState(false);
  const [deletingImage, setDeletingImage] = useState<string | null>(null);
  const [deletingVideo, setDeletingVideo] = useState<string | null>(null);

  // Menu visibility
  const [openTimeMenus, setOpenTimeMenus] = useState<{ [key: string]: boolean }>({});
  const [closeTimeMenus, setCloseTimeMenus] = useState<{ [key: string]: boolean }>({});

  // Form validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    businessName: false,
    address: false,
    city: false,
    phone: false,
  });

  // Initialize form with salon data
  useEffect(() => {
    if (salon) {
      setBusinessName(salon.businessName || '');
      setAddress(salon.address || '');
      setCity(salon.city || '');
      setRegion((salon as any).region || '');
      setPhoneNumber(salon?.phoneNumber || (salon as any)?.phone || '');
      setEmail(salon.email || '');
      setDescription(salon.description || '');
      setType(salon.type || 'BARBERSHOP');
      setGalleryImages(salon.images || []);
      setGalleryVideos(salon.videos || []);

      // Initialize payout account fields
      const salonAny = salon as any;
      if (salonAny.payoutType) {
        setPayoutType(salonAny.payoutType);
      }
      if (salonAny.bankAccountNumber) {
        setBankAccountNumber(salonAny.bankAccountNumber);
      }
      if (salonAny.bankAccountName) {
        setBankAccountName(salonAny.bankAccountName);
      }
      if (salonAny.bankCode) {
        setBankCode(salonAny.bankCode);
      }
      if (salonAny.momoProvider) {
        setMomoProvider(salonAny.momoProvider);
      }
      if (salonAny.momoNumber) {
        setMomoNumber(salonAny.momoNumber);
      }

      // Try operatingHours first, then openingHours for backward compat
      const rawHours = (salon as any).operatingHours || salon.openingHours;
      if (rawHours && typeof rawHours === 'object') {
        const hours = rawHours as OpeningHours;
        setOpeningHours({
          monday: hours.monday || defaultHours.monday,
          tuesday: hours.tuesday || defaultHours.tuesday,
          wednesday: hours.wednesday || defaultHours.wednesday,
          thursday: hours.thursday || defaultHours.thursday,
          friday: hours.friday || defaultHours.friday,
          saturday: hours.saturday || defaultHours.saturday,
          sunday: hours.sunday || defaultHours.sunday,
        });
      }
    }
  }, [salon]);

  // Invalidate salon queries to refresh data
  const refreshSalon = useCallback(() => {
    queryClient.invalidateQueries({ queryKey: ['mySalon'] });
  }, [queryClient]);

  // --- Image Picker Helpers ---

  const pickSingleImage = async (): Promise<string | null> => {
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return null;
    return result.assets[0].uri;
  };

  const pickMultipleImages = async (remaining: number): Promise<string[]> => {
    const limit = Math.min(remaining, MAX_PICK_PER_BATCH);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: limit,
      quality: 0.8,
    });
    if (result.canceled || !result.assets?.length) return [];
    return result.assets.map((a) => a.uri);
  };

  const pickVideos = async (remaining: number): Promise<{ uri: string; mimeType?: string }[]> => {
    const limit = Math.min(remaining, MAX_PICK_PER_BATCH);
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      allowsMultipleSelection: true,
      selectionLimit: limit,
    });
    if (result.canceled || !result.assets?.length) return [];

    const valid = result.assets.filter((a) => {
      if (a.fileSize && a.fileSize > MAX_VIDEO_SIZE_BYTES) {
        Alert.alert(
          'Video Too Large',
          `One or more videos exceed the 50MB limit and were skipped.`
        );
        return false;
      }
      return true;
    });
    return valid.map((a) => ({ uri: a.uri, mimeType: a.mimeType }));
  };

  // --- Upload Handlers ---

  const handleLogoUpload = async () => {
    if (!salon) return;
    const uri = await pickSingleImage();
    if (!uri) return;

    setUploadingLogo(true);
    try {
      await salonApi.uploadLogo(salon.id, uri);
      refreshSalon();
      Alert.alert('Success', 'Logo updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload logo');
    } finally {
      setUploadingLogo(false);
    }
  };

  const handleCoverUpload = async () => {
    if (!salon) return;
    const uri = await pickSingleImage();
    if (!uri) return;

    setUploadingCover(true);
    try {
      await salonApi.uploadCover(salon.id, uri);
      refreshSalon();
      Alert.alert('Success', 'Cover image updated successfully');
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload cover image');
    } finally {
      setUploadingCover(false);
    }
  };

  const handleGalleryAdd = async () => {
    if (!salon) return;
    const remaining = MAX_GALLERY_IMAGES - galleryImages.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_GALLERY_IMAGES} gallery images.`);
      return;
    }

    const uris = await pickMultipleImages(remaining);
    if (!uris.length) return;

    setUploadingGallery(true);
    try {
      await salonApi.uploadGalleryImages(salon.id, uris);
      refreshSalon();
      Alert.alert('Success', `${uris.length} image${uris.length > 1 ? 's' : ''} added to gallery`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.message || 'Failed to upload gallery images');
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleGalleryDelete = async (imageUrl: string) => {
    if (!salon) return;

    Alert.alert(
      'Delete Image',
      'Are you sure you want to remove this image from the gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingImage(imageUrl);
            try {
              await salonApi.deleteGalleryImage(salon.id, imageUrl);
              refreshSalon();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.message || 'Failed to delete image');
            } finally {
              setDeletingImage(null);
            }
          },
        },
      ]
    );
  };

  const handleVideoAdd = async () => {
    if (!salon) return;
    const remaining = MAX_GALLERY_VIDEOS - galleryVideos.length;
    if (remaining <= 0) {
      Alert.alert('Limit Reached', `You can upload a maximum of ${MAX_GALLERY_VIDEOS} gallery videos.`);
      return;
    }

    const videos = await pickVideos(remaining);
    if (!videos.length) return;

    setUploadingVideos(true);
    try {
      await salonApi.uploadGalleryVideos(salon.id, videos);
      refreshSalon();
      Alert.alert('Success', `${videos.length} video${videos.length > 1 ? 's' : ''} added to gallery`);
    } catch (error: any) {
      Alert.alert('Error', error.response?.data?.error?.message || error.response?.data?.message || 'Failed to upload videos');
    } finally {
      setUploadingVideos(false);
    }
  };

  const handleVideoDelete = async (videoUrl: string) => {
    if (!salon) return;

    Alert.alert(
      'Delete Video',
      'Are you sure you want to remove this video from the gallery?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            setDeletingVideo(videoUrl);
            try {
              await salonApi.deleteGalleryVideo(salon.id, videoUrl);
              refreshSalon();
            } catch (error: any) {
              Alert.alert('Error', error.response?.data?.error?.message || error.response?.data?.message || 'Failed to delete video');
            } finally {
              setDeletingVideo(null);
            }
          },
        },
      ]
    );
  };

  // Update salon mutation
  const updateMutation = useMutation({
    mutationFn: (data: Partial<CreateSalonData & { openingHours?: HoursState }>) =>
      salonApi.update(salon!.id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mySalon'] });
      Alert.alert('Success', 'Salon details updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    },
    onError: (error: any) => {
      const apiError = error.response?.data?.error;
      const fieldErrors = apiError?.details?.map((d: any) => d.message).join(', ');
      Alert.alert('Error', fieldErrors || apiError?.message || error.response?.data?.message || 'Failed to update salon');
    },
  });

  // Validate form
  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!businessName.trim()) {
      newErrors.businessName = 'Salon name is required';
    }

    if (!address.trim()) {
      newErrors.address = 'Address is required';
    }

    if (!city.trim()) {
      newErrors.city = 'City is required';
    }

    if (!phoneNumber.trim()) {
      newErrors.phone = 'Phone number is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  // Convert HoursState to workingDays array for API
  const getWorkingDaysFromHours = (hours: HoursState): string[] => {
    const days: string[] = [];
    if (hours.monday.isOpen) days.push('MONDAY');
    if (hours.tuesday.isOpen) days.push('TUESDAY');
    if (hours.wednesday.isOpen) days.push('WEDNESDAY');
    if (hours.thursday.isOpen) days.push('THURSDAY');
    if (hours.friday.isOpen) days.push('FRIDAY');
    if (hours.saturday.isOpen) days.push('SATURDAY');
    if (hours.sunday.isOpen) days.push('SUNDAY');
    return days;
  };

  // Get opening/closing time envelope across ALL open days. The flat
  // openingTime/closingTime fields must span every working day — using
  // only the first open day silently discarded overtime set on other days.
  const getOpeningTime = (hours: HoursState): string => {
    const openTimes = Object.values(hours)
      .filter((h) => h.isOpen && h.open)
      .map((h) => h.open);
    if (openTimes.length === 0) return '09:00';
    return openTimes.sort()[0];
  };

  const getClosingTime = (hours: HoursState): string => {
    const closeTimes = Object.values(hours)
      .filter((h) => h.isOpen && h.close)
      .map((h) => h.close);
    if (closeTimes.length === 0) return '18:00';
    return closeTimes.sort().reverse()[0];
  };

  // Handle save
  const handleSave = () => {
    if (!validateForm() || !salon) return;

    const data: Partial<CreateSalonData & { operatingHours?: HoursState; payoutType?: string; bankAccountNumber?: string; bankAccountName?: string; bankCode?: string; momoProvider?: string; momoNumber?: string }> = {
      businessName: businessName.trim(),
      address: address.trim(),
      city: city.trim(),
      region: region.trim(),
      phoneNumber: phoneNumber.trim(),
      email: email.trim() || undefined,
      description: description.trim() || undefined,
      type,
      operatingHours: openingHours,
      workingDays: getWorkingDaysFromHours(openingHours),
      openingTime: getOpeningTime(openingHours),
      closingTime: getClosingTime(openingHours),
      // Payout account fields
      payoutType,
      bankAccountNumber: payoutType === 'bank' ? bankAccountNumber.trim() : undefined,
      bankAccountName: payoutType === 'bank' ? bankAccountName.trim() : undefined,
      bankCode: payoutType === 'bank' ? bankCode.trim() : undefined,
      momoProvider: payoutType === 'mobile_money' ? momoProvider : undefined,
      momoNumber: payoutType === 'mobile_money' ? momoNumber.trim() : undefined,
    };

    updateMutation.mutate(data);
  };

  // Toggle day open/closed
  const toggleDayOpen = (day: keyof HoursState) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        isOpen: !prev[day].isOpen,
      },
    }));
  };

  // Update time for a day
  const updateTime = (day: keyof HoursState, type: 'open' | 'close', value: string) => {
    setOpeningHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [type]: value,
      },
    }));
  };

  // Format time for display
  const formatTimeDisplay = (time: string): string => {
    if (!time || typeof time !== 'string' || !time.includes(':')) return time || '';
    const [hours, minutes] = time.split(':');
    const hour = parseInt(hours);
    const displayHour = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    return `${displayHour}:${minutes} ${ampm}`;
  };

  if (salonLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#006B3F" />
      </View>
    );
  }

  if (!salon) {
    return (
      <View style={styles.loadingContainer}>
        <Ionicons name="alert-circle-outline" size={48} color="#9CA3AF" />
        <Text style={styles.errorText}>No salon found</Text>
        <Button
          mode="contained"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          buttonColor="#006B3F"
          theme={{ roundness: 12 }}
        >
          Go Back
        </Button>
      </View>
    );
  }

  const remainingGallerySlots = MAX_GALLERY_IMAGES - galleryImages.length;
  const remainingVideoSlots = MAX_GALLERY_VIDEOS - galleryVideos.length;

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
        >
          {/* ─── Cover Image ─── */}
          <TouchableOpacity
            style={styles.coverContainer}
            onPress={handleCoverUpload}
            disabled={uploadingCover}
            activeOpacity={0.8}
          >
            {salon.coverImage ? (
              <Image source={{ uri: salon.coverImage }} style={styles.coverImage} />
            ) : (
              <View style={styles.coverPlaceholder}>
                <Ionicons name="image-outline" size={32} color="rgba(255,255,255,0.7)" />
                <Text style={styles.coverPlaceholderText}>Add Cover Photo</Text>
              </View>
            )}
            {uploadingCover && (
              <View style={styles.imageUploadingOverlay}>
                <ActivityIndicator size="large" color="#FFFFFF" />
              </View>
            )}
            <View style={styles.coverEditBadge}>
              <Ionicons name="camera" size={14} color="#FFFFFF" />
              <Text style={styles.coverEditBadgeText}>Edit</Text>
            </View>
          </TouchableOpacity>

          {/* ─── Logo ─── */}
          <View style={styles.logoRow}>
            <TouchableOpacity
              style={styles.logoContainer}
              onPress={handleLogoUpload}
              disabled={uploadingLogo}
              activeOpacity={0.8}
            >
              {salon.logo ? (
                <Image source={{ uri: salon.logo }} style={styles.logoImage} />
              ) : (
                <View style={styles.logoPlaceholder}>
                  <Text style={styles.logoPlaceholderText}>
                    {businessName ? businessName[0].toUpperCase() : 'S'}
                  </Text>
                </View>
              )}
              {uploadingLogo && (
                <View style={styles.logoUploadingOverlay}>
                  <ActivityIndicator size="small" color="#FFFFFF" />
                </View>
              )}
              <View style={styles.logoEditBadge}>
                <Ionicons name="camera" size={12} color="#FFFFFF" />
              </View>
            </TouchableOpacity>
            <View style={styles.logoInfo}>
              <Text style={styles.logoInfoTitle}>{businessName || 'Salon Name'}</Text>
              <Text style={styles.logoInfoSub}>Tap the logo to change it</Text>
            </View>
          </View>

          {/* ─── Gallery Section ─── */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="images" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Gallery</Text>
              <Text style={styles.galleryCounter}>
                {galleryImages.length}/{MAX_GALLERY_IMAGES}
              </Text>
            </View>
            <Divider style={styles.sectionDivider} />

            {galleryImages.length > 0 && (
              <View style={styles.galleryGrid}>
                {galleryImages.map((img, idx) => (
                  <View key={img + idx} style={styles.galleryItem}>
                    <Image source={{ uri: img }} style={styles.galleryImage} />
                    {deletingImage === img ? (
                      <View style={styles.galleryDeleteButton}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.galleryDeleteButton}
                        onPress={() => handleGalleryDelete(img)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {galleryImages.length === 0 && (
              <View style={styles.galleryEmpty}>
                <Ionicons name="image-outline" size={40} color="#D1D5DB" />
                <Text style={styles.galleryEmptyText}>No gallery images yet</Text>
                <Text style={styles.galleryEmptySub}>Add photos to showcase your salon</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.addPhotosButton,
                remainingGallerySlots <= 0 && styles.addPhotosButtonDisabled,
              ]}
              onPress={handleGalleryAdd}
              disabled={uploadingGallery || remainingGallerySlots <= 0}
              activeOpacity={0.7}
            >
              {uploadingGallery ? (
                <ActivityIndicator size="small" color="#006B3F" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={remainingGallerySlots > 0 ? '#006B3F' : '#9CA3AF'} />
                  <Text style={[
                    styles.addPhotosButtonText,
                    remainingGallerySlots <= 0 && styles.addPhotosButtonTextDisabled,
                  ]}>
                    Add Photos
                  </Text>
                  {remainingGallerySlots > 0 && (
                    <Text style={styles.addPhotosRemaining}>
                      (up to {Math.min(remainingGallerySlots, MAX_PICK_PER_BATCH)} at a time)
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>

            {/* Videos subsection */}
            <View style={styles.videosHeader}>
              <Ionicons name="videocam" size={18} color="#006B3F" />
              <Text style={styles.videosTitle}>Videos of Your Work</Text>
              <Text style={styles.galleryCounter}>
                {galleryVideos.length}/{MAX_GALLERY_VIDEOS}
              </Text>
            </View>

            {galleryVideos.length > 0 && (
              <View style={styles.galleryGrid}>
                {galleryVideos.map((vid, idx) => (
                  <View key={vid + idx} style={[styles.galleryItem, styles.videoTile]}>
                    <Ionicons name="play-circle" size={36} color="#FFFFFF" />
                    <Text style={styles.videoTileLabel} numberOfLines={1}>Video {idx + 1}</Text>
                    {deletingVideo === vid ? (
                      <View style={styles.galleryDeleteButton}>
                        <ActivityIndicator size="small" color="#FFFFFF" />
                      </View>
                    ) : (
                      <TouchableOpacity
                        style={styles.galleryDeleteButton}
                        onPress={() => handleVideoDelete(vid)}
                        activeOpacity={0.7}
                      >
                        <Ionicons name="close-circle" size={22} color="#EF4444" />
                      </TouchableOpacity>
                    )}
                  </View>
                ))}
              </View>
            )}

            {galleryVideos.length === 0 && (
              <View style={styles.galleryEmpty}>
                <Ionicons name="videocam-outline" size={40} color="#D1D5DB" />
                <Text style={styles.galleryEmptyText}>No videos yet</Text>
                <Text style={styles.galleryEmptySub}>Show customers your best work in action</Text>
              </View>
            )}

            <TouchableOpacity
              style={[
                styles.addPhotosButton,
                remainingVideoSlots <= 0 && styles.addPhotosButtonDisabled,
              ]}
              onPress={handleVideoAdd}
              disabled={uploadingVideos || remainingVideoSlots <= 0}
              activeOpacity={0.7}
            >
              {uploadingVideos ? (
                <ActivityIndicator size="small" color="#006B3F" />
              ) : (
                <>
                  <Ionicons name="add-circle-outline" size={20} color={remainingVideoSlots > 0 ? '#006B3F' : '#9CA3AF'} />
                  <Text style={[
                    styles.addPhotosButtonText,
                    remainingVideoSlots <= 0 && styles.addPhotosButtonTextDisabled,
                  ]}>
                    Add Videos
                  </Text>
                  {remainingVideoSlots > 0 && (
                    <Text style={styles.addPhotosRemaining}>
                      (max 50MB each)
                    </Text>
                  )}
                </>
              )}
            </TouchableOpacity>
          </Surface>

          {/* ─── Basic Information ─── */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="information-circle" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Basic Information</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <TextInput
              label="Salon Name *"
              value={businessName}
              onChangeText={(text) => {
                setBusinessName(text);
                setTouched({ ...touched, businessName: true });
              }}
              onBlur={() => setTouched({ ...touched, businessName: true })}
              error={touched.businessName && !!errors.businessName}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.accent}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={styles.input}
              placeholder="Enter salon name"
              left={<TextInput.Icon icon="storefront" color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
            />
            {touched.businessName && errors.businessName && (
              <HelperText type="error">{errors.businessName}</HelperText>
            )}

            <TextInput
              label="Address *"
              value={address}
              onChangeText={(text) => {
                setAddress(text);
                setTouched({ ...touched, address: true });
              }}
              onBlur={() => setTouched({ ...touched, address: true })}
              error={touched.address && !!errors.address}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.accent}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={styles.input}
              placeholder="Street address"
              left={<TextInput.Icon icon="map-marker-outline" color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
            />
            {touched.address && errors.address && (
              <HelperText type="error">{errors.address}</HelperText>
            )}

            <View style={styles.row}>
              <View style={styles.halfInput}>
                <TextInput
                  label="City *"
                  value={city}
                  onChangeText={(text) => {
                    setCity(text);
                    setTouched({ ...touched, city: true });
                  }}
                  onBlur={() => setTouched({ ...touched, city: true })}
                  error={touched.city && !!errors.city}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  placeholder="City"
                  theme={{ roundness: 10 }}
                />
                {touched.city && errors.city && (
                  <HelperText type="error">{errors.city}</HelperText>
                )}
              </View>
              <View style={styles.halfInput}>
                <TextInput
                  label="Phone *"
                  value={phoneNumber}
                  onChangeText={(text) => {
                    setPhoneNumber(text);
                    setTouched({ ...touched, phone: true });
                  }}
                  onBlur={() => setTouched({ ...touched, phone: true })}
                  error={touched.phone && !!errors.phone}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="+233 XX XXX XXXX"
                  left={<TextInput.Icon icon="phone-outline" color={theme.textSecondary} />}
                  theme={{ roundness: 10 }}
                />
                {touched.phone && errors.phone && (
                  <HelperText type="error">{errors.phone}</HelperText>
                )}
              </View>
            </View>

            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.accent}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="salon@example.com"
              left={<TextInput.Icon icon="email-outline" color={theme.textSecondary} />}
              theme={{ roundness: 10 }}
            />

            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              outlineColor={theme.border}
              activeOutlineColor={theme.accent}
              textColor={theme.text}
              placeholderTextColor={theme.textSecondary}
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Describe your salon..."
              theme={{ roundness: 10 }}
            />
          </Surface>

          {/* ─── Category Section ─── */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="pricetag" size={20} color={theme.accent} />
              <Text style={styles.sectionTitle}>Business Category</Text>
            </View>
            <Divider style={styles.sectionDivider} />
            <View style={styles.categoryGrid}>
              {BUSINESS_CATEGORIES.map((cat) => {
                const isSelected = type === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setType(cat.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={cat.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[
                      styles.categoryChipText,
                      isSelected && styles.categoryChipTextSelected,
                    ]}>
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </Surface>

          {/* ─── Business Hours ─── */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="time" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Business Hours</Text>
            </View>
            <Divider style={styles.sectionDivider} />
            
            {DAYS_OF_WEEK.map(({ key, label, fullLabel }) => (
              <View key={key} style={styles.dayRow}>
                <View style={styles.dayHeader}>
                  <Switch
                    value={openingHours[key].isOpen}
                    onValueChange={() => toggleDayOpen(key)}
                    color="#006B3F"
                  />
                  <Text style={[
                    styles.dayLabel,
                    !openingHours[key].isOpen && styles.dayLabelClosed
                  ]}>
                    {fullLabel}
                  </Text>
                </View>
                
                {openingHours[key].isOpen ? (
                  <View style={styles.timeRow}>
                    <Menu
                      visible={openTimeMenus[key] || false}
                      onDismiss={() => setOpenTimeMenus({ ...openTimeMenus, [key]: false })}
                      anchor={
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => setOpenTimeMenus({ ...openTimeMenus, [key]: true })}
                        >
                          <Text style={styles.timeButtonLabel}>Open</Text>
                          <Text style={styles.timeButtonValue}>
                            {formatTimeDisplay(openingHours[key].open)}
                          </Text>
                        </TouchableOpacity>
                      }
                      contentStyle={styles.timeMenuContent}
                    >
                      <ScrollView style={styles.timeMenuScroll}>
                        {TIME_OPTIONS.map((time) => (
                          <Menu.Item
                            key={time.value}
                            onPress={() => {
                              updateTime(key, 'open', time.value);
                              setOpenTimeMenus({ ...openTimeMenus, [key]: false });
                            }}
                            title={time.label}
                          />
                        ))}
                      </ScrollView>
                    </Menu>

                    <Ionicons name="arrow-forward" size={16} color="#9CA3AF" />

                    <Menu
                      visible={closeTimeMenus[key] || false}
                      onDismiss={() => setCloseTimeMenus({ ...closeTimeMenus, [key]: false })}
                      anchor={
                        <TouchableOpacity
                          style={styles.timeButton}
                          onPress={() => setCloseTimeMenus({ ...closeTimeMenus, [key]: true })}
                        >
                          <Text style={styles.timeButtonLabel}>Close</Text>
                          <Text style={styles.timeButtonValue}>
                            {formatTimeDisplay(openingHours[key].close)}
                          </Text>
                        </TouchableOpacity>
                      }
                      contentStyle={styles.timeMenuContent}
                    >
                      <ScrollView style={styles.timeMenuScroll}>
                        {TIME_OPTIONS.map((time) => (
                          <Menu.Item
                            key={time.value}
                            onPress={() => {
                              updateTime(key, 'close', time.value);
                              setCloseTimeMenus({ ...closeTimeMenus, [key]: false });
                            }}
                            title={time.label}
                          />
                        ))}
                      </ScrollView>
                    </Menu>
                  </View>
                ) : (
                  <Text style={styles.closedText}>Closed</Text>
                )}
              </View>
            ))}
          </Surface>

          {/* ─── Payout Account Section ─── */}
          <Surface style={styles.section} elevation={0}>
            <View style={styles.sectionHeader}>
              <Ionicons name="wallet" size={20} color="#006B3F" />
              <Text style={styles.sectionTitle}>Payout Account</Text>
            </View>
            <Divider style={styles.sectionDivider} />

            <Text style={styles.payoutSectionLabel}>Select Payout Method</Text>
            <View style={styles.payoutTypeRow}>
              <TouchableOpacity
                style={[
                  styles.payoutTypeButton,
                  payoutType === 'mobile_money' && styles.payoutTypeButtonSelected,
                ]}
                onPress={() => setPayoutType('mobile_money')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="phone-portrait-outline"
                  size={20}
                  color={payoutType === 'mobile_money' ? '#FFFFFF' : '#006B3F'}
                />
                <Text
                  style={[
                    styles.payoutTypeText,
                    payoutType === 'mobile_money' && styles.payoutTypeTextSelected,
                  ]}
                >
                  Mobile Money
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.payoutTypeButton,
                  payoutType === 'bank' && styles.payoutTypeButtonSelected,
                ]}
                onPress={() => setPayoutType('bank')}
                activeOpacity={0.7}
              >
                <Ionicons
                  name="business-outline"
                  size={20}
                  color={payoutType === 'bank' ? '#FFFFFF' : '#006B3F'}
                />
                <Text
                  style={[
                    styles.payoutTypeText,
                    payoutType === 'bank' && styles.payoutTypeTextSelected,
                  ]}
                >
                  Bank Account
                </Text>
              </TouchableOpacity>
            </View>

            {payoutType === 'mobile_money' ? (
              <>
                <Text style={styles.payoutFieldLabel}>Mobile Money Provider</Text>
                <View style={styles.momoProviderRow}>
                  {(
                    [
                      { value: 'mtn' as const, label: 'MTN', color: '#FFCC00' },
                      { value: 'vod' as const, label: 'Vodafone', color: '#E60000' },
                      { value: 'tgo' as const, label: 'AirtelTigo', color: '#0066CC' },
                    ] as const
                  ).map((provider) => (
                    <TouchableOpacity
                      key={provider.value}
                      style={[
                        styles.momoProviderButton,
                        momoProvider === provider.value && [
                          styles.momoProviderButtonSelected,
                          { borderColor: provider.color },
                        ],
                      ]}
                      onPress={() => setMomoProvider(provider.value)}
                      activeOpacity={0.7}
                    >
                      <View
                        style={[
                          styles.momoProviderDot,
                          { backgroundColor: provider.color },
                        ]}
                      />
                      <Text
                        style={[
                          styles.momoProviderText,
                          momoProvider === provider.value && styles.momoProviderTextSelected,
                        ]}
                      >
                        {provider.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <TextInput
                  label="Mobile Money Number *"
                  value={momoNumber}
                  onChangeText={setMomoNumber}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  keyboardType="phone-pad"
                  placeholder="024 XXX XXXX"
                  left={
                    <TextInput.Icon
                      icon="phone-outline"
                      color={theme.textSecondary}
                    />
                  }
                  theme={{ roundness: 10 }}
                />
              </>
            ) : (
              <>
                <TextInput
                  label="Bank Account Number *"
                  value={bankAccountNumber}
                  onChangeText={setBankAccountNumber}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  keyboardType="number-pad"
                  placeholder="Enter account number"
                  left={
                    <TextInput.Icon
                      icon="card-outline"
                      color={theme.textSecondary}
                    />
                  }
                  theme={{ roundness: 10 }}
                />

                <TextInput
                  label="Account Holder Name *"
                  value={bankAccountName}
                  onChangeText={setBankAccountName}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  placeholder="Enter account holder name"
                  left={
                    <TextInput.Icon
                      icon="person-outline"
                      color={theme.textSecondary}
                    />
                  }
                  theme={{ roundness: 10 }}
                />

                <TextInput
                  label="Bank Code (Optional)"
                  value={bankCode}
                  onChangeText={setBankCode}
                  mode="outlined"
                  outlineColor={theme.border}
                  activeOutlineColor={theme.accent}
                  textColor={theme.text}
                  placeholderTextColor={theme.textSecondary}
                  style={styles.input}
                  placeholder="e.g., 044"
                  left={
                    <TextInput.Icon
                      icon="information-circle-outline"
                      color={theme.textSecondary}
                    />
                  }
                  theme={{ roundness: 10 }}
                />
                <HelperText type="info" style={styles.helperText}>
                  Bank code can be found in your bank's documentation
                </HelperText>
              </>
            )}

            <View style={styles.payoutInfoBox}>
              <Ionicons name="information-circle" size={18} color="#006B3F" />
              <Text style={styles.payoutInfoText}>
                This account will be used for all payout requests. Ensure the details are accurate to avoid delays.
              </Text>
            </View>
          </Surface>

          {/* Save Button */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={updateMutation.isPending}
              disabled={updateMutation.isPending}
              style={styles.saveButton}
              buttonColor="#006B3F"
              theme={{ roundness: 12 }}
              contentStyle={styles.buttonContent}
            >
              Save Changes
            </Button>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
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
  errorText: {
    color: theme.textSecondary,
    fontSize: 16,
    marginBottom: 16,
    marginTop: 12,
  },
  backButton: {
    borderRadius: 12,
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 32,
  },

  // ─── Cover Image Styles ───
  coverContainer: {
    position: 'relative',
    width: '100%',
    height: 180,
  },
  coverImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  coverPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  coverPlaceholderText: {
    color: 'rgba(255,255,255,0.7)',
    fontSize: 14,
    fontWeight: '500',
  },
  coverEditBadge: {
    position: 'absolute',
    top: 12,
    right: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 16,
  },
  coverEditBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  imageUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },

  // ─── Logo Styles ───
  logoRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    marginTop: -36,
    marginBottom: 20,
  },
  logoContainer: {
    position: 'relative',
    width: 72,
    height: 72,
    borderRadius: 36,
    borderWidth: 3,
    borderColor: '#FFFFFF',
    overflow: 'hidden',
  },
  logoImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoPlaceholder: {
    width: '100%',
    height: '100%',
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoPlaceholderText: {
    fontSize: 28,
    fontWeight: 'bold',
    color: '#FFFFFF',
  },
  logoUploadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoEditBadge: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: theme.accent,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.surface,
  },
  logoInfo: {
    marginLeft: 12,
    flex: 1,
  },
  logoInfoTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: theme.text,
  },
  logoInfoSub: {
    fontSize: 12,
    color: theme.textSecondary,
    marginTop: 2,
  },

  // ─── Gallery Styles ───
  galleryCounter: {
    fontSize: 13,
    color: theme.textSecondary,
    marginLeft: 'auto',
    fontWeight: '500',
  },
  galleryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 12,
  },
  galleryItem: {
    position: 'relative',
    width: '31%',
    aspectRatio: 1,
    borderRadius: 10,
    overflow: 'hidden',
  },
  galleryImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  videoTile: {
    backgroundColor: '#1F2937',
    alignItems: 'center',
    justifyContent: 'center',
  },
  videoTileLabel: {
    marginTop: 4,
    fontSize: 11,
    color: '#D1D5DB',
    maxWidth: '90%',
  },
  videosHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginTop: 20,
    marginBottom: 10,
  },
  videosTitle: {
    flex: 1,
    fontSize: 15,
    fontWeight: '600',
    color: theme.text,
  },
  galleryDeleteButton: {
    position: 'absolute',
    top: 2,
    right: 2,
    justifyContent: 'center',
    alignItems: 'center',
  },
  galleryEmpty: {
    alignItems: 'center',
    paddingVertical: 24,
    marginBottom: 8,
  },
  galleryEmptyText: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.textTertiary,
    marginTop: 8,
  },
  galleryEmptySub: {
    fontSize: 13,
    color: theme.border,
    marginTop: 4,
  },
  addPhotosButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.accent,
    borderStyle: 'dashed',
    backgroundColor: theme.successBg,
  },
  addPhotosButtonDisabled: {
    borderColor: theme.border,
    backgroundColor: theme.background,
  },
  addPhotosButtonText: {
    color: theme.accent,
    fontWeight: '600',
    fontSize: 14,
  },
  addPhotosButtonTextDisabled: {
    color: theme.textTertiary,
  },
  addPhotosRemaining: {
    fontSize: 12,
    color: theme.textSecondary,
  },

  // ─── Section Styles ───
  section: {
    backgroundColor: theme.surface,
    borderRadius: 14,
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  sectionTitle: {
    fontWeight: '600',
    color: theme.text,
    fontSize: 16,
  },
  sectionDivider: {
    marginBottom: 16,
  },
  input: {
    backgroundColor: theme.surface,
    marginBottom: 12,
  },
  textArea: {
    minHeight: 100,
  },
  row: {
    flexDirection: 'row',
    gap: 12,
  },
  halfInput: {
    flex: 1,
  },
  categoryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  categoryChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 12,
    backgroundColor: theme.surfaceVariant,
    borderWidth: 1,
    borderColor: theme.border,
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: theme.accent,
    borderColor: theme.accent,
  },
  categoryChipText: {
    fontSize: 14,
    color: theme.text,
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  dayRow: {
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: theme.surfaceVariant,
  },
  dayHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dayLabel: {
    fontSize: 15,
    fontWeight: '500',
    color: theme.text,
    marginLeft: 12,
  },
  dayLabelClosed: {
    color: theme.textTertiary,
  },
  timeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 10,
    paddingLeft: 52,
    gap: 8,
  },
  timeButton: {
    borderWidth: 1,
    borderColor: theme.border,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: theme.surface,
    alignItems: 'center',
    minWidth: 85,
  },
  timeButtonLabel: {
    fontSize: 10,
    color: theme.textTertiary,
  },
  timeButtonValue: {
    fontSize: 14,
    fontWeight: '500',
    color: theme.text,
  },
  closedText: {
    fontSize: 14,
    color: theme.textTertiary,
    marginTop: 8,
    paddingLeft: 52,
  },
  timeMenuContent: {
    maxHeight: 300,
  },
  timeMenuScroll: {
    maxHeight: 280,
  },
  // Payout Account Styles
  payoutSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
    marginBottom: 12,
  },
  payoutTypeRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  payoutTypeButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 12,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  payoutTypeButtonSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  payoutTypeText: {
    fontSize: 14,
    fontWeight: '600',
    color: theme.text,
  },
  payoutTypeTextSelected: {
    color: '#FFFFFF',
  },
  payoutFieldLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.textSecondary,
    marginBottom: 8,
  },
  momoProviderRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  momoProviderButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingVertical: 10,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: theme.border,
    backgroundColor: theme.surface,
  },
  momoProviderButtonSelected: {
    backgroundColor: theme.successBg,
  },
  momoProviderDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  momoProviderText: {
    fontSize: 12,
    fontWeight: '600',
    color: theme.text,
  },
  momoProviderTextSelected: {
    color: '#006B3F',
  },
  payoutInfoBox: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 10,
    padding: 12,
    borderRadius: 10,
    backgroundColor: theme.successBg,
    marginTop: 12,
  },
  payoutInfoText: {
    flex: 1,
    fontSize: 12,
    color: theme.textSecondary,
    lineHeight: 18,
  },
  helperText: {
    marginTop: -8,
    marginBottom: 8,
  },
  buttonContainer: {
    marginTop: 8,
    marginBottom: 24,
    marginHorizontal: 16,
  },
  saveButton: {},
  buttonContent: {
    paddingVertical: 8,
  },
});
