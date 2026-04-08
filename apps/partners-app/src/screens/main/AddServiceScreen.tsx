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
  Divider,
  ActivityIndicator,
  HelperText,
} from 'react-native-paper';
import { servicesApi, CreateServiceData, UpdateServiceData, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

type AddServiceRouteProp = RouteProp<MainStackParamList, 'AddService'>;

const DURATION_OPTIONS = [
  { label: '15 minutes', value: 15 },
  { label: '30 minutes', value: 30 },
  { label: '45 minutes', value: 45 },
  { label: '1 hour', value: 60 },
  { label: '1.5 hours', value: 90 },
  { label: '2 hours', value: 120 },
];

const CATEGORY_OPTIONS = [
  { label: 'Haircut', value: 'HAIRCUT' },
  { label: 'Styling', value: 'STYLING' },
  { label: 'Coloring', value: 'COLORING' },
  { label: 'Treatment', value: 'TREATMENT' },
  { label: 'Nails', value: 'NAILS' },
  { label: 'Facial', value: 'FACIAL' },
  { label: 'Other', value: 'OTHER' },
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
  const [categoryMenuVisible, setCategoryMenuVisible] = useState(false);

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
            <TextInput
              label="Service Name *"
              value={name}
              onChangeText={(text) => {
                setName(text);
                setTouched({ ...touched, name: true });
              }}
              onBlur={() => setTouched({ ...touched, name: true })}
              error={touched.name && !!errors.name}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="e.g., Haircut, Manicure"
            />
            {touched.name && errors.name && (
              <HelperText type="error">{errors.name}</HelperText>
            )}
          </View>

          {/* Price */}
          <View style={styles.inputGroup}>
            <TextInput
              label="Price (GHS) *"
              value={price}
              onChangeText={(text) => {
                setPrice(text);
                setTouched({ ...touched, price: true });
              }}
              onBlur={() => setTouched({ ...touched, price: true })}
              error={touched.price && !!errors.price}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="decimal-pad"
              placeholder="0.00"
              left={<TextInput.Affix text="GHS " />}
            />
            {touched.price && errors.price && (
              <HelperText type="error">{errors.price}</HelperText>
            )}
          </View>

          {/* Duration Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Duration *</Text>
            <Menu
              visible={durationMenuVisible}
              onDismiss={() => setDurationMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.menuAnchor}
                  onPress={() => setDurationMenuVisible(true)}
                >
                  <Text style={styles.menuAnchorText}>
                    {DURATION_OPTIONS.find((o) => o.value === duration)?.label || 'Select duration'}
                  </Text>
                </TouchableOpacity>
              }
            >
              {DURATION_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setDuration(option.value);
                    setDurationMenuVisible(false);
                  }}
                  title={option.label}
                />
              ))}
            </Menu>
            {errors.duration && (
              <HelperText type="error">{errors.duration}</HelperText>
            )}
          </View>

          {/* Category Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Category *</Text>
            <Menu
              visible={categoryMenuVisible}
              onDismiss={() => setCategoryMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.menuAnchor}
                  onPress={() => setCategoryMenuVisible(true)}
                >
                  <Text style={styles.menuAnchorText}>
                    {CATEGORY_OPTIONS.find((o) => o.value === category)?.label || 'Select category'}
                  </Text>
                </TouchableOpacity>
              }
            >
              {CATEGORY_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setCategory(option.value);
                    setCategoryMenuVisible(false);
                  }}
                  title={option.label}
                />
              ))}
            </Menu>
            {errors.category && (
              <HelperText type="error">{errors.category}</HelperText>
            )}
          </View>

          {/* Description */}
          <View style={styles.inputGroup}>
            <TextInput
              label="Description (Optional)"
              value={description}
              onChangeText={setDescription}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={[styles.input, styles.textArea]}
              multiline
              numberOfLines={4}
              placeholder="Describe your service..."
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
                textColor="#D32F2F"
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
    backgroundColor: '#FFFFFF',
  },
  keyboardView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 12,
    color: '#757575',
    marginBottom: 8,
  },
  input: {
    backgroundColor: '#FFFFFF',
  },
  textArea: {
    minHeight: 120,
  },
  menuAnchor: {
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#FFFFFF',
  },
  menuAnchorText: {
    fontSize: 16,
    color: '#212121',
  },
  buttonContainer: {
    marginTop: 24,
    marginBottom: 32,
  },
  saveButton: {
    paddingVertical: 6,
    borderRadius: 8,
  },
  deleteButton: {
    marginTop: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderColor: '#D32F2F',
  },
});
