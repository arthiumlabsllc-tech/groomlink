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

const TIER_THRESHOLDS: Record<string, number> = {
  BRONZE: 0,
  SILVER: 100,
  GOLD: 500,
  PLATINUM: 1000,
};

function getNextTierThreshold(currentTier: string): number {
  const order = ['BRONZE', 'SILVER', 'GOLD', 'PLATINUM'];
  const idx = order.indexOf(currentTier);
  if (idx < 0 || idx >= order.length - 1) return 0;
  return TIER_THRESHOLDS[order[idx + 1]] ?? 0;
}

export const loyaltyApi = {
  // Get loyalty status and points — maps GET /loyalty to LoyaltyStatus shape
  getStatus: async (): Promise<LoyaltyStatus> => {
    const response = await apiClient.get('/loyalty');
    const account = response.data.data;
    const tier: string = account?.tier || 'BRONZE';
    const lifetimePoints: number = account?.lifetimePoints ?? 0;
    const totalPoints: number = account?.points ?? 0;
    const nextThreshold = getNextTierThreshold(tier);
    const pointsToNextTier = nextThreshold > 0 ? Math.max(0, nextThreshold - lifetimePoints) : 0;

    return {
      totalPoints,
      tier,
      pointsToNextTier,
      lifetimePoints,
      bookingsCount: 0, // backend doesn't provide this directly; kept for UI compat
    };
  },

  // Get available rewards — no backend endpoint yet; return empty array gracefully
  getRewards: async (): Promise<LoyaltyReward[]> => {
    try {
      const response = await apiClient.get('/loyalty/rewards');
      return response.data.data || [];
    } catch (err: any) {
      const status = err?.response?.status;
      // 404 means rewards catalog doesn't exist yet — treat as empty, not error
      if (status === 404 || status === 501) {
        return [];
      }
      throw err;
    }
  },

  // Redeem loyalty points — matches POST /loyalty/redeem { points, bookingId? }
  redeemReward: async (rewardId: string, points: number): Promise<RedeemResult> => {
    const response = await apiClient.post('/loyalty/redeem', { points });
    const data = response.data.data;
    return {
      success: true,
      message: `Successfully redeemed ${points} points.`,
      remainingPoints: data?.newBalance ?? 0,
    };
  },
};
