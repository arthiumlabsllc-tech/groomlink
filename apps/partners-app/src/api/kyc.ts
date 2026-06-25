import apiClient from './client';

export type KycStatus = 'NOT_SUBMITTED' | 'PENDING' | 'APPROVED' | 'REJECTED' | 'NEEDS_INFO';

export interface KycSubmission {
  id: string;
  status: KycStatus;
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  taxIdNumber?: string;
  governmentIdUrl?: string | null;
  selfieWithIdUrl?: string | null;
  storefrontVideoUrl?: string | null;
  interiorVideoUrl?: string | null;
  businessCertUrl?: string | null;
  proofOfAddressUrl?: string | null;
  rejectionReason?: string | null;
  submittedAt?: string;
  reviewedAt?: string;
  createdAt: string;
  updatedAt: string;
}

export interface KycStatusResponse {
  hasSubmitted: boolean;
  status: KycStatus;
  submission: KycSubmission | null;
}

export interface KycSubmitData {
  businessName?: string;
  businessType?: string;
  businessAddress?: string;
  businessRegistrationNumber?: string;
  taxIdNumber?: string;
}

export type KycUploadField =
  | 'governmentId'
  | 'selfieWithId'
  | 'storefrontVideo'
  | 'interiorVideo'
  | 'businessCert'
  | 'proofOfAddress';

export interface KycUploadResponse {
  success: boolean;
  field: string;
  url: string;
}

export const kycApi = {
  /**
   * Get current KYC status
   */
  getStatus: async (): Promise<KycStatusResponse> => {
    const response = await apiClient.get('/kyc/status');
    return response.data?.data || response.data;
  },

  /**
   * Submit KYC business information form
   */
  submitKyc: async (data: KycSubmitData): Promise<KycSubmission> => {
    const response = await apiClient.post('/kyc/submit', data);
    return response.data?.data || response.data;
  },

  /**
   * Upload a KYC document (multipart/form-data)
   * @param field - document type (governmentId, selfieWithId, etc.)
   * @param uri - local file URI
   * @param mimeType - optional mime type
   */
  uploadDocument: async (field: KycUploadField, uri: string, mimeType = 'image/jpeg'): Promise<KycUploadResponse> => {
    const formData = new FormData();
    const ext = uri.split('.').pop() || 'jpg';
    formData.append('file', {
      uri,
      type: mimeType,
      name: `kyc_${field}.${ext}`,
    } as any);

    const response = await apiClient.post(`/kyc/upload/${field}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 120000, // 2 min for large video uploads
    });
    return response.data?.data || response.data;
  },
};
