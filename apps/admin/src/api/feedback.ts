import apiClient from './client';

export interface Feedback {
  id: string;
  rating: number;
  comment: string | null;
  userType: string;
  userId: string | null;
  email: string | null;
  appVersion: string | null;
  status: string;
  createdAt: string;
}

export interface FeedbackStats {
  total: number;
  averageRating: number;
  byUserType: Array<{
    userType: string;
    _count: number;
    _avg: { rating: number };
  }>;
  byRating: Array<{
    rating: number;
    _count: number;
  }>;
  byStatus: Array<{
    status: string;
    _count: number;
  }>;
}

export const feedbackAPI = {
  // Get all feedback with pagination
  getFeedback: async (params?: {
    page?: number;
    limit?: number;
    status?: string;
    userType?: string;
    rating?: number;
  }) => {
    const response = await apiClient.get('/platform/feedback', { params });
    return response.data;
  },

  // Get feedback statistics
  getStats: async (): Promise<{ success: boolean; data: FeedbackStats }> => {
    const response = await apiClient.get('/platform/feedback/stats');
    return response.data;
  },

  // Update feedback status
  updateStatus: async (id: string, status: string) => {
    const response = await apiClient.patch(`/platform/feedback/${id}`, { status });
    return response.data;
  },
};
