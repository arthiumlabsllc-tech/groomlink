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
  Checkbox,
  ActivityIndicator,
  HelperText,
  Surface,
  Chip,
} from 'react-native-paper';
import { Ionicons } from '@expo/vector-icons';
import { staffApi, CreateStaffData, UpdateStaffData, StaffMember } from '../../api/staff';
import { servicesApi, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

type AddStaffRouteProp = RouteProp<MainStackParamList, 'AddStaff'>;

const ROLE_OPTIONS = [
  { label: 'Stylist', value: 'Stylist', icon: 'scissors' },
  { label: 'Barber', value: 'Barber', icon: 'cut' },
  { label: 'Nail Technician', value: 'Nail Technician', icon: 'hand-left' },
  { label: 'Spa Therapist', value: 'Spa Therapist', icon: 'leaf' },
  { label: 'Manager', value: 'Manager', icon: 'briefcase' },
  { label: 'Other', value: 'Other', icon: 'ellipsis-horizontal' },
];

interface FormErrors {
  fullName?: string;
  phoneNumber?: string;
  role?: string;
}

export default function AddStaffScreen() {
  const navigation = useNavigation();
  const route = useRoute<AddStaffRouteProp>();
  const queryClient = useQueryClient();

  const isEditMode = !!route.params?.staffId;
  const existingStaff = route.params?.staff as StaffMember | undefined;

  // Fetch salon to get salon ID
  const { data: salon } = useQuery({
    queryKey: ['mySalon'],
    queryFn: salonApi.getMySalon,
  });

  const salonId = salon?.id;

  // Fetch services for multi-select
  const { data: servicesData } = useQuery({
    queryKey: ['services', salonId],
    queryFn: () => servicesApi.getServices(salonId!),
    enabled: !!salonId,
  });

  const availableServices = servicesData || [];

  // Form state
  const [fullName, setFullName] = useState(existingStaff?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(existingStaff?.phoneNumber || '');
  const [email, setEmail] = useState(existingStaff?.email || '');
  const [role, setRole] = useState(existingStaff?.specialty || 'Stylist');
  const [selectedServices, setSelectedServices] = useState<string[]>(
    existingStaff?.workerServices?.map((ws) => ws.service.id) || []
  );

  // Form validation
  const [errors, setErrors] = useState<FormErrors>({});
  const [touched, setTouched] = useState({
    fullName: false,
    phoneNumber: false,
  });

  // Create staff mutation
  const createMutation = useMutation({
    mutationFn: (data: CreateStaffData) => staffApi.createStaff(salonId!, data),
    onSuccess: async (newStaff) => {
      // Assign selected services to the new staff member
      if (selectedServices.length > 0) {
        try {
          await Promise.all(
            selectedServices.map((serviceId) =>
              staffApi.assignServiceToStaff(salonId!, newStaff.id, { serviceId })
            )
          );
        } catch (e) {
          console.error('Failed to assign services:', e);
        }
      }
      queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const apiMessage = error.response?.data?.message || error.message || 'Unknown error';
      const errorCode = error.response?.data?.error;
      const isLimitReached = errorCode === 'STAFF_LIMIT_REACHED';
      Alert.alert(
        isLimitReached ? 'Staff Limit Reached' : 'Error',
        isLimitReached
          ? `${apiMessage}\n\nYou can upgrade your subscription to add more staff.`
          : `Failed to create staff member: ${apiMessage}`
      );
    },
  });

  // Update staff mutation
  const updateMutation = useMutation({
    mutationFn: (data: UpdateStaffData) =>
      staffApi.updateStaff(salonId!, route.params!.staffId!, data),
    onSuccess: async () => {
      // Update staff services
      const currentServiceIds = existingStaff?.workerServices?.map((ws) => ws.service.id) || [];
      const servicesToAdd = selectedServices.filter((id) => !currentServiceIds.includes(id));
      const servicesToRemove = currentServiceIds.filter((id) => !selectedServices.includes(id));

      try {
        await Promise.all([
          ...servicesToAdd.map((serviceId) =>
            staffApi.assignServiceToStaff(salonId!, route.params!.staffId!, { serviceId })
          ),
          ...servicesToRemove.map((serviceId) =>
            staffApi.removeServiceFromStaff(salonId!, route.params!.staffId!, serviceId)
          ),
        ]);
      } catch (e) {
        console.error('Failed to update services:', e);
      }

      queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const apiMessage = error.response?.data?.message || error.message || 'Unknown error';
      Alert.alert('Error', `Failed to update staff member: ${apiMessage}`);
    },
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: () => staffApi.deleteStaff(salonId!, route.params!.staffId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
      navigation.goBack();
    },
    onError: (error: any) => {
      const apiMessage = error.response?.data?.message || error.message || 'Unknown error';
      Alert.alert('Error', `Failed to delete staff member: ${apiMessage}`);
    },
  });

  const validateForm = (): boolean => {
    const newErrors: FormErrors = {};

    if (!fullName.trim()) {
      newErrors.fullName = 'Full name is required';
    }

    if (!phoneNumber.trim()) {
      newErrors.phoneNumber = 'Phone number is required';
    } else if (!/^\+?233\d{9}$/.test(phoneNumber.replace(/\s/g, ''))) {
      newErrors.phoneNumber = 'Please enter a valid Ghana phone number (+233...)';
    }

    if (!role) {
      newErrors.role = 'Role is required';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const formatPhoneNumber = (value: string) => {
    // Auto-format to +233 if starting with 0
    if (value.startsWith('0') && value.length > 1) {
      return '+233' + value.slice(1);
    }
    return value;
  };

  const handleSave = () => {
    if (!validateForm() || !salonId) return;

    const data: CreateStaffData | UpdateStaffData = {
      fullName: fullName.trim(),
      phoneNumber: formatPhoneNumber(phoneNumber.trim()),
      email: email.trim() || undefined,
      specialties: [role],
    };

    if (isEditMode) {
      updateMutation.mutate(data);
    } else {
      createMutation.mutate(data as CreateStaffData);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Remove Staff Member',
      'Are you sure you want to remove this staff member? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Remove',
          style: 'destructive',
          onPress: () => deleteMutation.mutate(),
        },
      ]
    );
  };

  const toggleServiceSelection = (serviceId: string) => {
    setSelectedServices((prev) =>
      prev.includes(serviceId)
        ? prev.filter((id) => id !== serviceId)
        : [...prev, serviceId]
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
          {/* Full Name */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Full Name *</Text>
            <TextInput
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setTouched({ ...touched, fullName: true });
              }}
              onBlur={() => setTouched({ ...touched, fullName: true })}
              error={touched.fullName && !!errors.fullName}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="Enter full name"
              left={<TextInput.Icon icon="account-outline" color="#6B7280" />}
              theme={{ roundness: 12 }}
            />
            {touched.fullName && errors.fullName && (
              <HelperText type="error">{errors.fullName}</HelperText>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Phone Number *</Text>
            <TextInput
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setTouched({ ...touched, phoneNumber: true });
              }}
              onBlur={() => setTouched({ ...touched, phoneNumber: true })}
              error={touched.phoneNumber && !!errors.phoneNumber}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+233 XX XXX XXXX"
              left={<TextInput.Icon icon="phone-outline" color="#6B7280" />}
              theme={{ roundness: 12 }}
            />
            {touched.phoneNumber && errors.phoneNumber && (
              <HelperText type="error">{errors.phoneNumber}</HelperText>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Email (Optional)</Text>
            <TextInput
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              outlineColor="#E5E7EB"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
              left={<TextInput.Icon icon="email-outline" color="#6B7280" />}
              theme={{ roundness: 12 }}
            />
          </View>

          {/* Role */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Role / Title *</Text>
            <View style={styles.roleGrid}>
              {ROLE_OPTIONS.map((opt) => {
                const isSelected = role === opt.value;
                return (
                  <TouchableOpacity
                    key={opt.value}
                    style={[
                      styles.roleChip,
                      isSelected && styles.roleChipSelected,
                    ]}
                    onPress={() => setRole(opt.value)}
                    activeOpacity={0.7}
                  >
                    <Ionicons
                      name={opt.icon as any}
                      size={18}
                      color={isSelected ? '#FFFFFF' : '#6B7280'}
                    />
                    <Text style={[
                      styles.roleChipText,
                      isSelected && styles.roleChipTextSelected,
                    ]}>
                      {opt.label}
                    </Text>
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>

          {/* Services Multi-select */}
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Services They Can Perform</Text>
            {availableServices.length === 0 ? (
              <Surface style={styles.emptyServices} elevation={0}>
                <Ionicons name="scissors-outline" size={24} color="#9CA3AF" />
                <Text style={styles.noServicesText}>
                  No services available. Add services first.
                </Text>
              </Surface>
            ) : (
              <Surface style={styles.servicesContainer} elevation={0}>
                {availableServices.map((service: Service) => {
                  const isSelected = selectedServices.includes(service.id);
                  return (
                    <TouchableOpacity
                      key={service.id}
                      style={[styles.serviceItem, isSelected && styles.serviceItemSelected]}
                      onPress={() => toggleServiceSelection(service.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.serviceCheckbox}>
                        {isSelected ? (
                          <Ionicons name="checkmark-circle" size={24} color="#006B3F" />
                        ) : (
                          <View style={styles.checkboxEmpty} />
                        )}
                      </View>
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <View style={styles.serviceMeta}>
                          <Chip style={styles.serviceCategoryChip} textStyle={styles.serviceCategoryText} compact>
                            {service.category}
                          </Chip>
                          <Text style={styles.servicePrice}>GH₵{service.price}</Text>
                        </View>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </Surface>
            )}
            <Text style={styles.selectionHint}>
              {selectedServices.length} service{selectedServices.length !== 1 ? 's' : ''} selected
            </Text>
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
              {isEditMode ? 'Update Staff Member' : 'Add Staff Member'}
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
                Remove Staff Member
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
  roleGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roleChip: {
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
  roleChipSelected: {
    backgroundColor: '#006B3F',
    borderColor: '#006B3F',
  },
  roleChipText: {
    fontSize: 14,
    color: '#374151',
    fontWeight: '500',
  },
  roleChipTextSelected: {
    color: '#FFFFFF',
  },
  emptyServices: {
    borderRadius: 12,
    padding: 24,
    alignItems: 'center',
    backgroundColor: '#F3F4F6',
  },
  noServicesText: {
    fontSize: 14,
    color: '#6B7280',
    marginTop: 8,
    textAlign: 'center',
  },
  servicesContainer: {
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    overflow: 'hidden',
  },
  serviceItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F3F4F6',
  },
  serviceItemSelected: {
    backgroundColor: '#F0FDF4',
  },
  serviceCheckbox: {
    marginRight: 12,
  },
  checkboxEmpty: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#E5E7EB',
  },
  serviceInfo: {
    flex: 1,
  },
  serviceName: {
    fontSize: 15,
    fontWeight: '500',
    color: '#111827',
    marginBottom: 4,
  },
  serviceMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  serviceCategoryChip: {
    backgroundColor: '#F3F4F6',
    height: 22,
  },
  serviceCategoryText: {
    fontSize: 11,
    color: '#6B7280',
  },
  servicePrice: {
    fontSize: 13,
    color: '#006B3F',
    fontWeight: '600',
  },
  selectionHint: {
    fontSize: 12,
    color: '#9CA3AF',
    marginTop: 8,
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
