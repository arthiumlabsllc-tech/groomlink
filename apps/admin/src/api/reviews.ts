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
    email: string | null;
    avatar: string | null;
  };
  salon: {
    id: string;
    businessName: string;
    city: string;
  };
}

export interface ReviewStats {
  total: number;
  averageRating: number;
  distribution: Array<{ rating: number; count: number }>;
}

export interface PaginatedReviews {
  reviews: Review[];
  pagination: {
    page: number;
    pages: number;
    total: number;
    limit: number;
  };
  stats: ReviewStats;
}

export const reviewsApi = {
  // Get all reviews with pagination and optional rating filter
  getAll: async (params?: {
    page?: number;
    limit?: number;
    rating?: string;
  }): Promise<{ data: PaginatedReviews }> => {
    const response = await apiClient.get('/admin/reviews', { params });
    return response.data;
  },

  // Delete a review
  delete: async (id: string) => {
    const response = await apiClient.delete(`/admin/reviews/${id}`);
    return response.data;
  },
};
