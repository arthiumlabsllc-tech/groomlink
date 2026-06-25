import apiClient from './client';
import { Salon } from '../types';

export const discoveryApi = {
  // Get nearby salons based on user location
  getNearbySalons: async (lat: number, lng: number, radius: number = 10): Promise<Salon[]> => {
    const params = new URLSearchParams();
    params.append('lat', lat.toString());
    params.append('lng', lng.toString());
    params.append('radius', radius.toString());
    const response = await apiClient.get(`/salons/nearby?${params.toString()}`);
    return response.data.data || [];
  },

  // Get top-rated salons
  getTopRatedSalons: async (): Promise<Salon[]> => {
    const response = await apiClient.get('/salons/top-rated');
    return response.data.data || [];
  },

  // Get trending salons
  getTrendingSalons: async (): Promise<Salon[]> => {
    const response = await apiClient.get('/salons/trending');
    return response.data.data || [];
  },
};
