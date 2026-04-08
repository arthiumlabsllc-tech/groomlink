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
  Checkbox,
  ActivityIndicator,
  HelperText,
  Divider,
  Surface,
} from 'react-native-paper';
import { staffApi, CreateStaffData, UpdateStaffData, StaffMember } from '../../api/staff';
import { servicesApi, Service } from '../../api/services';
import { salonApi } from '../../api/salon';
import { MainStackParamList } from '../../types/navigation';

type AddStaffRouteProp = RouteProp<MainStackParamList, 'AddStaff'>;

const ROLE_OPTIONS = [
  { label: 'Stylist', value: 'Stylist' },
  { label: 'Barber', value: 'Barber' },
  { label: 'Nail Technician', value: 'Nail Technician' },
  { label: 'Spa Therapist', value: 'Spa Therapist' },
  { label: 'Manager', value: 'Manager' },
  { label: 'Other', value: 'Other' },
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

  const availableServices = servicesData?.services || [];

  // Form state
  const [fullName, setFullName] = useState(existingStaff?.fullName || '');
  const [phoneNumber, setPhoneNumber] = useState(existingStaff?.phoneNumber || '');
  const [email, setEmail] = useState(existingStaff?.email || '');
  const [role, setRole] = useState(existingStaff?.specialty || 'Stylist');
  const [selectedServices, setSelectedServices] = useState<string[]>(
    existingStaff?.workerServices?.map((ws) => ws.service.id) || []
  );

  // Menu visibility
  const [roleMenuVisible, setRoleMenuVisible] = useState(false);

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
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to create staff member: ${error.message}`);
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
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to update staff member: ${error.message}`);
    },
  });

  // Delete staff mutation
  const deleteMutation = useMutation({
    mutationFn: () => staffApi.deleteStaff(salonId!, route.params!.staffId!),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['staff', salonId] });
      navigation.goBack();
    },
    onError: (error: Error) => {
      Alert.alert('Error', `Failed to delete staff member: ${error.message}`);
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
      specialty: role,
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
            <TextInput
              label="Full Name *"
              value={fullName}
              onChangeText={(text) => {
                setFullName(text);
                setTouched({ ...touched, fullName: true });
              }}
              onBlur={() => setTouched({ ...touched, fullName: true })}
              error={touched.fullName && !!errors.fullName}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={styles.input}
              placeholder="Enter full name"
            />
            {touched.fullName && errors.fullName && (
              <HelperText type="error">{errors.fullName}</HelperText>
            )}
          </View>

          {/* Phone Number */}
          <View style={styles.inputGroup}>
            <TextInput
              label="Phone Number *"
              value={phoneNumber}
              onChangeText={(text) => {
                setPhoneNumber(text);
                setTouched({ ...touched, phoneNumber: true });
              }}
              onBlur={() => setTouched({ ...touched, phoneNumber: true })}
              error={touched.phoneNumber && !!errors.phoneNumber}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="phone-pad"
              placeholder="+233 XX XXX XXXX"
            />
            {touched.phoneNumber && errors.phoneNumber && (
              <HelperText type="error">{errors.phoneNumber}</HelperText>
            )}
          </View>

          {/* Email */}
          <View style={styles.inputGroup}>
            <TextInput
              label="Email (Optional)"
              value={email}
              onChangeText={setEmail}
              mode="outlined"
              outlineColor="#E0E0E0"
              activeOutlineColor="#006B3F"
              style={styles.input}
              keyboardType="email-address"
              autoCapitalize="none"
              placeholder="email@example.com"
            />
          </View>

          {/* Role Dropdown */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Role/Title *</Text>
            <Menu
              visible={roleMenuVisible}
              onDismiss={() => setRoleMenuVisible(false)}
              anchor={
                <TouchableOpacity
                  style={styles.menuAnchor}
                  onPress={() => setRoleMenuVisible(true)}
                >
                  <Text style={styles.menuAnchorText}>
                    {ROLE_OPTIONS.find((o) => o.value === role)?.label || 'Select role'}
                  </Text>
                </TouchableOpacity>
              }
            >
              {ROLE_OPTIONS.map((option) => (
                <Menu.Item
                  key={option.value}
                  onPress={() => {
                    setRole(option.value);
                    setRoleMenuVisible(false);
                  }}
                  title={option.label}
                />
              ))}
            </Menu>
            {errors.role && (
              <HelperText type="error">{errors.role}</HelperText>
            )}
          </View>

          {/* Services Multi-select */}
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Services They Can Perform</Text>
            <Surface style={styles.servicesContainer}>
              {availableServices.length === 0 ? (
                <Text style={styles.noServicesText}>
                  No services available. Add services first.
                </Text>
              ) : (
                availableServices.map((service: Service) => (
                  <TouchableOpacity
                    key={service.id}
                    style={styles.serviceItem}
                    onPress={() => toggleServiceSelection(service.id)}
                  >
                    <View style={styles.serviceCheckbox}>
                      <Checkbox
                        status={selectedServices.includes(service.id) ? 'checked' : 'unchecked'}
                        onPress={() => toggleServiceSelection(service.id)}
                        color="#006B3F"
                      />
                      <View style={styles.serviceInfo}>
                        <Text style={styles.serviceName}>{service.name}</Text>
                        <Text style={styles.serviceCategory}>{service.category}</Text>
                      </View>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </Surface>
            <Text style={styles.hint}>
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
                textColor="#D32F2F"
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
  servicesContainer: {
    borderRadius: 8,
    padding: 8,
    backgroundColor: '#FAFAFA',
  },
  serviceItem: {
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  serviceCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  serviceInfo: {
    marginLeft: 8,
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    color: '#212121',
  },
  serviceCategory: {
    fontSize: 12,
    color: '#757575',
    marginTop: 2,
  },
  noServicesText: {
    fontSize: 14,
    color: '#9E9E9E',
    textAlign: 'center',
    padding: 16,
  },
  hint: {
    fontSize: 12,
    color: '#9E9E9E',
    marginTop: 8,
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
