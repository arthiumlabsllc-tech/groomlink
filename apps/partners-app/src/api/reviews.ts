import apiClient from './client';

export interface Review {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  customer: {
    id: string;
    firstName: string;
    lastName: string;
    avatar?: string | null;
  };
  booking: {
    id: string;
    date: string;
    service: {
      name: string;
    };
  };
  reply?: {
    id: string;
    text: string;
    createdAt: string;
  } | null;
}

export interface ReviewsResponse {
  reviews: Review[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
  summary: {
    averageRating: number;
    totalReviews: number;
    ratingDistribution: Record<string, number>;
  };
}

export const reviewsApi = {
  getReviews: async (salonId: string, page = 1, limit = 20): Promise<ReviewsResponse> => {
    const response = await apiClient.get(`/salon-owner/${salonId}/reviews`, {
      params: { page, limit },
    });
    return response.data.data;
  },

  replyToReview: async (salonId: string, reviewId: string, reply: string): Promise<void> => {
    await apiClient.post(`/salon-owner/${salonId}/reviews/${reviewId}/reply`, { reply });
  },
};
