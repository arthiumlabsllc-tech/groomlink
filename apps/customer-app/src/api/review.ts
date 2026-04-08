import apiClient from './client';
import { Review } from '../types';

export interface CreateReviewData {
  bookingId: string;
  rating: number;
  comment?: string;
}

export const reviewApi = {
  // Get reviews for a salon
  getSalonReviews: async (salonId: string): Promise<Review[]> => {
    const response = await apiClient.get(`/reviews/salon/${salonId}`);
    return response.data.data;
  },

  // Create a review
  createReview: async (data: CreateReviewData): Promise<Review> => {
    const response = await apiClient.post('/reviews', data);
    return response.data.data;
  },
};
