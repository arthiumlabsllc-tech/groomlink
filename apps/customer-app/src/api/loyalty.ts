import apiClient from './client';

export interface LoyaltyStatus {
  totalPoints: number;
  tier: string;
  pointsToNextTier: number;
  lifetimePoints: number;
  bookingsCount: number;
}

export interface LoyaltyReward {
  id: string;
  name: string;
  description: string;
  pointsCost: number;
  type: 'DISCOUNT' | 'FREE_SERVICE' | 'UPGRADE';
  value: number;
  validUntil?: string;
  available: boolean;
}

export interface RedeemResult {
  success: boolean;
  message: string;
  remainingPoints: number;
  code?: string;
}

export const loyaltyApi = {
  // Get loyalty status and points
  getStatus: async (): Promise<LoyaltyStatus> => {
    const response = await apiClient.get('/loyalty/status');
    return response.data.data;
  },

  // Get available rewards
  getRewards: async (): Promise<LoyaltyReward[]> => {
    const response = await apiClient.get('/loyalty/rewards');
    return response.data.data || [];
  },

  // Redeem a reward
  redeemReward: async (rewardId: string): Promise<RedeemResult> => {
    const response = await apiClient.post('/loyalty/redeem', { rewardId });
    return response.data.data;
  },
};
