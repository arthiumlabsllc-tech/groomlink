import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { useMutation, useQueryClient, useQuery } from '@tanstack/react-query';
import {
  TextInput,
  Button,
  Menu,
  ActivityIndicator,
  HelperText,
  Surface,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { servicesApi, CreateServiceData, UpdateServiceData, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

type AddServiceRouteProp = RouteProp<MainStackParamList, 'AddService'>;

const DURATION_OPTIONS = [
  { label: '15 min', value: 15 },
  { label: '30 min', value: 30 },
  { label: '45 min', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

const CATEGORY_OPTIONS = [
  { label: 'Haircut', value: 'HAIRCUT', icon: 'cut' },
  { label: 'Styling', value: 'STYLING', icon: 'scissors' },
  { label: 'Coloring', value: 'COLORING', icon: 'color-palette' },
  { label: 'Treatment', value: 'TREATMENT', icon: 'medkit' },
  { label: 'Nails', value: 'NAILS', icon: 'hand-left' },
  { label: 'Facial', value: 'FACIAL', icon: 'happy' },
  { label: 'Other', value: 'OTHER', icon: 'ellipsis-horizontal' },
];

interface FormErrors {
  name?: string;
  price?: string;
  duration?: string;
  category?: string;
}

export default function AddServiceScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddServiceRouteProp>();
  const queryClient = useQueryClient();

  const isEditMode = !!route.params?.serviceId;
  const existingService = route.params?.service;

  // Fetch salon to get salon ID
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const salonId = salon?.id;

  // Form state
  const [name, setName] = useState(existingService?.name || '');
  const [price, setPrice] = useState(existingService?.price?.toString() || '');
  const [duration, setDuration] = useState<number>(existingService?.duration || 30);
  const [category, setCategory] = useState(existingService?.category || 'HAIRCUT');
  const [description, setDescription] = useState(existingService?.description || '');

  // Menu visibility
  const [durationMenuVisible, setDurationMenuVisible] = useState(false);

  // Form validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    name: false,
    price: false,
  });

  // Create service mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateServiceData) => servicesApi.createService(salonId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to create service: ${error.message}`);
    },
  });

  // Update service mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateServiceData) =>
      servicesApi.updateService(salonId!, route.params!.serviceId!, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update service: ${error.message}`);
    },
  });

  // Delete service mutation
  const deleteMutation = useMutation({
    mutationFn: () => servicesApi.deleteService(salonId!, route.params!.serviceId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['services', salonId] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to delete service: ${error.message}`);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!name.trim()) {
      newErrors.name = 'Service name is required';
    }

    const priceNum = parseFloat(price);
    if (!price.trim()) {
      newErrors.price = 'Price is required';
    } else if (isNaN(priceNum) || priceNum < 0) {
      newErrors.price = 'Please enter a valid price';
    }

    if (!duration) {
      newErrors.duration = 'Duration is required';
    }

    if (!category) {
      newErrors.category = 'Category is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSave = () => {
    if (!validateForm() || !salonId) return;

    const data: CreateServiceData | UpdateServiceData = {
      name: name.trim(),
      price: parseFloat(price),
      duration,
      category,
      description: description.trim() || undefined,
    };

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as CreateServiceData);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Service',
      'Are you sure you want to delete this service? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const isLoading = createMutation.isPending || updateMutation.isPending || deleteMutation.isPending;

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
          {/* Service Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Service Name *</Text>
            <TextInput
              value={name}
              onChangeText={(text) => {
                setName(text);
                setTouched({ ...touched, name: true });
              }}
              onBlur={() => setTouched({ ...touched, name: true })}
              error={touched.name && !!errors.name}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="e.g., Haircut, Manicure"
              theme={{ roundness: 12 }}
            />
            {touched.name && errors.name && (
              <HelperText type="error">{errors.name}</HelperText>
            )}
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Price *</Text>
            <TextInput
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                setTouched({ ...touched, price: true });
              }}
              onBlur={() => setTouched({ ...touched, price: true })}
              error={touched.price && !!errors.price}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              left={<TextInput.Affix text="GH₵ " />}
              theme={{ roundness: 12 }}
            />
            {touched.price && errors.price && (
              <HelperText type="error">{errors.price}</HelperText>
            )}
          </View>

          {/* Category */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Category *</Text>
            <View style={styles.categoryGrid}>
              {CATEGORY_OPTIONS.map((cat) => {
                const isSelected = category === cat.value;
                return (
                  <TouchableOpacity
                    key={cat.value}
                    style={[
                      styles.categoryChip,
                      isSelected && styles.categoryChipSelected,
                    ]}
                    onPress={() => setCategory(cat.value)}
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
          </View>

          {/* Duration */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Duration *</Text>
            <View style={styles.durationGrid}>
              {DURATION_OPTIONS.map((opt) => {
                const isSelected = duration === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.durationChip,
                      isSelected && styles.durationChipSelected,
                    ]}
                    onPress={() => setDuration(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.durationChipText,
                      isSelected && styles.durationChipTextSelected,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Description (Optional)</Text>
            <TextInput
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Describe your service..."
              theme={{ roundness: 12 }}
            />
          </View>

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <Button
              mode="contained"
              onPress={handleSave}
              loading={isLoading}
              disabled={isLoading || !salonId}
              style={styles.saveButton}
              buttonColor="#006B3F"
              theme={{ roundness: 12 }}
              contentStyle={styles.buttonContent}
            >
              {isEditMode ? 'Update Service' : 'Save Service'}
            </Button>

            {isEditMode && (
              <Button
                mode="outlined"
                onPress={handleDelete}
                loading={deleteMutation.isPending}
                disabled={isLoading}
                style={styles.deleteButton}
                textColor="#CE1126"
                theme={{ roundness: 12 }}
                contentStyle={styles.buttonContent}
              >
                Delete Service
              </Button>
            )}
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F9FAFB',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 20,
  },
  inputGroup: {
    marginBottom: 20,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#374151',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 120,
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
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
    gap: 8,
  },
  categoryChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  categoryChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  categoryChipTextSelected: {
    color: '#FFFFFF',
  },
  durationGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  durationChip: {
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 10,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: '#E5E7EB',
  },
  durationChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  durationChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  durationChipTextSelected: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  buttonContainer: {
    marginTop: 16,
    marginBottom: 32,
  },
  saveButton: {
    marginBottom: 12,
  },
  deleteButton: {
    borderColor: '#CE1126',
  },
  buttonContent: {
    paddingVertical: 8,
  },
});
