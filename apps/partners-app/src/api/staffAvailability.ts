import apiClient from './client';

export interface StaffAvailability {
  staffId: string;
  staffName: string;
  isAvailable: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: string[];
  lastUpdated?: string;
}

export interface UpdateAvailabilityData {
  isAvailable?: boolean;
  workingHours?: {
    start: string;
    end: string;
  };
  workingDays?: string[];
}

export const staffAvailabilityApi = {
  /**
   * Get all staff with their current availability for a salon.
   * Uses the existing staff endpoint and augments with availability state.
   */
  getStaffAvailability: async (salonId: string): Promise<StaffAvailability[]> => {
    const response = await apiClient.get(`/salon-owner/${salonId}/staff`);
    const staffList = Array.isArray(response.data?.data)
      ? response.data.data
      : (response.data?.data?.staff || []);

    // Map to availability interface — server may include availability field
    // or we derive from isActive + local state
    return staffList.map((s: any) => ({
      staffId: s.id,
      staffName: s.fullName,
      isAvailable: s.isAvailable !== undefined ? s.isAvailable : s.isActive,
      workingHours: s.workingHours || { start: '08:00', end: '18:00' },
      workingDays: s.workingDays || ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
      lastUpdated: s.updatedAt,
    }));
  },

  /**
   * Toggle a staff member's availability status
   */
  toggleAvailability: async (salonId: string, staffId: string, isAvailable: boolean): Promise<void> => {
    await apiClient.put(`/salon-owner/${salonId}/staff/${staffId}`, {
      isActive: isAvailable,
      isAvailable,
    });
  },

  /**
   * Update working hours for a staff member
   */
  updateWorkingHours: async (salonId: string, staffId: string, data: UpdateAvailabilityData): Promise<void> => {
    await apiClient.put(`/salon-owner/${salonId}/staff/${staffId}`, {
      ...data,
      isActive: data.isAvailable,
    });
  },
};
