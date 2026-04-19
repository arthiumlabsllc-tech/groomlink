import apiClient from './client';

export interface SubmitFeedbackParams {
  rating: number;
  comment?: string;
  email?: string;
}

export const platformAPI = {
  // Submit feedback
  submitFeedback: async (params: SubmitFeedbackParams) => {
    const response = await apiClient.post('/platform/feedback', params);
    return response.data;
  },
};
