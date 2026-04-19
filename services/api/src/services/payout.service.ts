import prisma from '../config/database';
import logger from '../config/logger';
import axios from 'axios';

const HUBTEL_SEND_MONEY_URL = 'https://api.hubtel.com/v1/sendmoney/send';

// Ghana bank codes mapping
const GHANA_BANK_CODES: Record<string, string> = {
  'GCB': 'GCB',
  'ECOBANK': 'ECO',
  'STANBIC': 'STB',
  'FIDELITY': 'FID',
  'CALBANK': 'CAL',
  'ACCESS': 'ACC',
  'ABSA': 'ABS',
  'UBA': 'UBA',
  'ZENITH': 'ZEN',
  'FIRST_ATLANTIC': 'FBL',
  'ADB': 'ADB',
  'BOG': 'BOG',
  'CBG': 'CBG',
  'GTBANK': 'GTB',
  'FBN': 'FBN',
};

// Mobile money provider to Hubtel channel mapping
const MOMO_PROVIDER_CHANNELS: Record<string, string> = {
  'mtn': 'mtn-gh',
  'vodafone': 'vod-gh',
  'vod': 'vod-gh',
  'airteltigo': 'tgo-gh',
  'tgo': 'tgo-gh',
};

// Ghana phone prefix to mobile money provider mapping
const GHANA_PHONE_PREFIX_MAP: Record<string, 'mtn' | 'vodafone' | 'airteltigo'> = {
  // MTN
  '024': 'mtn',
  '054': 'mtn',
  '055': 'mtn',
  '059': 'mtn',
  // Vodafone
  '020': 'vodafone',
  '050': 'vodafone',
  '053': 'vodafone',
  '058': 'vodafone',
  // AirtelTigo
  '027': 'airteltigo',
  '057': 'airteltigo',
  '026': 'airteltigo',
  '056': 'airteltigo',
};

export interface PayoutAccountData {
  payoutType: 'bank' | 'mobile_money';
  // Bank account fields
  bankCode?: string;
  bankName?: string;
  bankAccountNumber?: string;
  bankAccountName?: string;
  // Mobile money fields
  momoProvider?: 'mtn' | 'vodafone' | 'airteltigo';
  momoNumber?: string;
}

export interface PayoutAccountResponse {
  id: string;
  payoutType: string | null;
  bankCode: string | null;
  bankAccountNumber: string | null;
  bankAccountName: string | null;
  momoProvider: string | null;
  momoNumber: string | null;
  hubtelRecipientId: string | null;
  isVerified: boolean;
}

// ---------------------------------------------------------------------------
// Hubtel credential helpers (duplicated here to avoid circular deps with
// payment.service.ts which imports escrow.service which may import this file)
// ---------------------------------------------------------------------------

interface HubtelCredentials {
  apiId: string;
  apiSecret: string;
  merchantAccountId?: string;
}

/**
 * Get Hubtel API credentials from SiteSettings DB first, then fall back to
 * environment variables. Same pattern as the old getPaystackKeys().
 */
async function getHubtelCredentials(): Promise<HubtelCredentials | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
  });

  // Check SiteSettings first
  const dbApiId = settings?.hubtelApiId;
  const dbApiSecret = settings?.hubtelApiSecret;
  const dbMerchantAccountId = settings?.hubtelMerchantAccountId;

  if (dbApiId && dbApiSecret) {
    logger.info('Hubtel credentials loaded from SiteSettings', {
      source: 'database',
    });
    return {
      apiId: dbApiId,
      apiSecret: dbApiSecret,
      merchantAccountId: dbMerchantAccountId || undefined,
    };
  }

  // Fall back to environment variables
  const envApiId = process.env.HUBTEL_API_ID;
  const envApiSecret = process.env.HUBTEL_API_SECRET;
  const envMerchantAccountId = process.env.HUBTEL_MERCHANT_ACCOUNT_ID;

  if (envApiId && envApiSecret) {
    logger.info('Hubtel credentials loaded from environment variables', {
      source: 'env_vars',
    });
    return {
      apiId: envApiId,
      apiSecret: envApiSecret,
      merchantAccountId: envMerchantAccountId || undefined,
    };
  }

  logger.warn('Hubtel credentials not configured in SiteSettings or environment variables');
  return null;
}

/**
 * Build the Basic Auth header that Hubtel APIs expect.
 * Hubtel uses Base64-encoded `apiId:apiSecret` for Authorization.
 */
function getHubtelAuthHeader(apiId: string, apiSecret: string): Record<string, string> {
  const encoded = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
  return {
    Authorization: `Basic ${encoded}`,
    'Content-Type': 'application/json',
  };
}

// ---------------------------------------------------------------------------
// Helper utilities
// ---------------------------------------------------------------------------

/**
 * Map a momoProvider string to the Hubtel channel code.
 * e.g. 'mtn' -> 'mtn-gh', 'vodafone'/'vod' -> 'vod-gh', 'airteltigo'/'tgo' -> 'tgo-gh'
 */
export function getHubtelChannel(momoProvider: string): string {
  return MOMO_PROVIDER_CHANNELS[momoProvider.toLowerCase()] || 'mtn-gh';
}

/**
 * Convert a Ghana local phone number to international format.
 * '024XXXXXXX' -> '+233XXXXXXXXX'
 * Also handles numbers already in +233 or 233 format.
 */
export function formatGhanaPhone(phone: string): string {
  // Remove any spaces or dashes
  const cleaned = phone.replace(/[\s-]/g, '');

  // Already in international format
  if (cleaned.startsWith('+233')) {
    return cleaned;
  }

  // Starts with 233 without the plus
  if (cleaned.startsWith('233')) {
    return `+${cleaned}`;
  }

  // Local format starting with 0
  if (cleaned.startsWith('0')) {
    return `+233${cleaned.slice(1)}`;
  }

  // Assume it's a bare number without prefix
  return `+233${cleaned}`;
}

/**
 * Validate a Ghana phone number and detect the mobile money provider
 * from the prefix.
 */
function validateAndDetectMomoProvider(phone: string): { valid: boolean; provider?: 'mtn' | 'vodafone' | 'airteltigo'; error?: string } {
  const cleaned = phone.replace(/[\s-]/g, '');

  // Accept local (0XX...) or international (+233XX...) format
  const localMatch = cleaned.match(/^0(\d{9})$/);
  const intlMatch = cleaned.match(/^\+?233(\d{9})$/);

  if (!localMatch && !intlMatch) {
    return { valid: false, error: 'Invalid Ghana phone number format. Use 024XXXXXXX or +233XXXXXXXXX' };
  }

  // Extract the prefix (first 3 digits in local format)
  const digits = localMatch ? localMatch[1] : intlMatch![1];
  const prefix = `0${digits.slice(0, 2)}`;

  const provider = GHANA_PHONE_PREFIX_MAP[prefix];
  if (!provider) {
    return { valid: false, error: `Unrecognised Ghana mobile prefix: ${prefix}` };
  }

  return { valid: true, provider };
}

// ---------------------------------------------------------------------------
// Core payout functions
// ---------------------------------------------------------------------------

/**
 * Setup or update payout account for a salon.
 * Hubtel doesn't require pre-registration of transfer recipients like Paystack
 * did. We validate the phone number, auto-detect the MoMo provider from the
 * prefix, and store payout details on the Salon model.
 */
export async function setupPayoutAccount(
  salonId: string,
  data: PayoutAccountData
): Promise<PayoutAccountResponse> {
  try {
    // Validate input
    if (!data.payoutType) {
      throw new Error('Payout type is required (bank or mobile_money)');
    }

    if (data.payoutType === 'bank') {
      if (!data.bankCode || !data.bankAccountNumber || !data.bankAccountName) {
        throw new Error('Bank code, account number, and account name are required for bank payouts');
      }
    } else if (data.payoutType === 'mobile_money') {
      if (!data.momoNumber) {
        throw new Error('Mobile money phone number is required for mobile money payouts');
      }

      // Validate phone number and detect provider
      const detection = validateAndDetectMomoProvider(data.momoNumber);
      if (!detection.valid) {
        throw new Error(detection.error!);
      }

      // Use detected provider if caller didn't supply one, or validate consistency
      if (!data.momoProvider) {
        data.momoProvider = detection.provider;
      } else if (data.momoProvider !== detection.provider) {
        logger.warn('Supplied momoProvider does not match detected provider from phone prefix', {
          supplied: data.momoProvider,
          detected: detection.provider,
        });
        // Trust the auto-detected provider
        data.momoProvider = detection.provider;
      }
    } else {
      throw new Error('Invalid payout type. Must be "bank" or "mobile_money"');
    }

    // Verify salon exists
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { businessName: true },
    });

    if (!salon) {
      throw new Error('Salon not found');
    }

    // Generate a local recipient ID for tracking (Hubtel doesn't need one)
    const hubtelRecipientId = `gl-momo-${salonId.slice(0, 8)}-${Date.now()}`;

    // Update salon record with payout details
    const updatedSalon = await prisma.salon.update({
      where: { id: salonId },
      data: {
        payoutType: data.payoutType,
        bankCode: data.payoutType === 'bank' ? data.bankCode : null,
        bankAccountNumber: data.payoutType === 'bank' ? data.bankAccountNumber : null,
        bankAccountName: data.payoutType === 'bank' ? data.bankAccountName : (data.bankAccountName || null),
        momoProvider: data.payoutType === 'mobile_money' ? data.momoProvider : null,
        momoNumber: data.payoutType === 'mobile_money' ? data.momoNumber : null,
        hubtelRecipientId,
      },
    });

    logger.info(`Payout account setup completed for salon ${salonId}`, {
      payoutType: data.payoutType,
      hubtelRecipientId,
    });

    return {
      id: updatedSalon.id,
      payoutType: updatedSalon.payoutType,
      bankCode: updatedSalon.bankCode,
      bankAccountNumber: updatedSalon.bankAccountNumber,
      bankAccountName: updatedSalon.bankAccountName,
      momoProvider: updatedSalon.momoProvider,
      momoNumber: updatedSalon.momoNumber,
      hubtelRecipientId: updatedSalon.hubtelRecipientId,
      isVerified: data.payoutType === 'mobile_money' ? !!updatedSalon.momoNumber : !!updatedSalon.bankAccountNumber,
    };
  } catch (error) {
    logger.error('Error setting up payout account:', { salonId, error });
    throw error;
  }
}

/**
 * Send money to a mobile money recipient via the Hubtel Send Money API.
 * This is called by the escrow service when releasing funds to a salon.
 */
export async function initiateHubtelPayout(params: {
  recipientPhone: string;
  recipientName: string;
  amount: number; // GHS decimal
  channel: string; // e.g. 'mtn-gh', 'vod-gh', 'tgo-gh'
  reference: string;
  description: string;
}): Promise<any> {
  const credentials = await getHubtelCredentials();
  if (!credentials) {
    throw new Error('Hubtel is not configured. Please contact support.');
  }
  const { apiId, apiSecret } = credentials;
  const headers = getHubtelAuthHeader(apiId, apiSecret);

  const response = await axios.post(
    HUBTEL_SEND_MONEY_URL,
    {
      RecipientName: params.recipientName,
      RecipientMsisdn: formatGhanaPhone(params.recipientPhone), // +233XXXXXXXXX
      Channel: params.channel,
      Amount: params.amount,
      ClientReference: params.reference,
      Description: params.description,
    },
    { headers, timeout: 30000 }
  );

  return response.data;
}

/**
 * Get current payout account details for a salon
 */
export async function getPayoutAccount(salonId: string): Promise<PayoutAccountResponse | null> {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        id: true,
        payoutType: true,
        bankCode: true,
        bankAccountNumber: true,
        bankAccountName: true,
        momoProvider: true,
        momoNumber: true,
        hubtelRecipientId: true,
      },
    });

    if (!salon) {
      return null;
    }

    // Mask sensitive data
    const maskedAccountNumber = salon.bankAccountNumber
      ? `****${salon.bankAccountNumber.slice(-4)}`
      : null;
    const maskedMomoNumber = salon.momoNumber
      ? `****${salon.momoNumber.slice(-4)}`
      : null;

    return {
      id: salon.id,
      payoutType: salon.payoutType,
      bankCode: salon.bankCode,
      bankAccountNumber: maskedAccountNumber,
      bankAccountName: salon.bankAccountName,
      momoProvider: salon.momoProvider,
      momoNumber: maskedMomoNumber,
      hubtelRecipientId: salon.hubtelRecipientId ? '***verified***' : null,
      isVerified: !!salon.hubtelRecipientId,
    };
  } catch (error) {
    logger.error('Error fetching payout account:', { salonId, error });
    throw error;
  }
}

/**
 * Get raw payout account details (for internal use, e.g., escrow release)
 * This returns unmasked data and should only be used internally
 */
export async function getPayoutAccountInternal(salonId: string): Promise<{
  payoutType: string | null;
  hubtelRecipientId: string | null;
  bankAccountNumber: string | null;
  momoNumber: string | null;
  momoProvider: string | null;
} | null> {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        payoutType: true,
        hubtelRecipientId: true,
        bankAccountNumber: true,
        momoNumber: true,
        momoProvider: true,
      },
    });

    if (!salon) {
      return null;
    }

    return {
      payoutType: salon.payoutType,
      hubtelRecipientId: salon.hubtelRecipientId,
      bankAccountNumber: salon.bankAccountNumber,
      momoNumber: salon.momoNumber,
      momoProvider: salon.momoProvider,
    };
  } catch (error) {
    logger.error('Error fetching internal payout account:', { salonId, error });
    throw error;
  }
}

/**
 * List available Ghana banks supported for payouts
 */
export function getSupportedBanks(): { code: string; name: string }[] {
  return [
    { code: 'GCB', name: 'Ghana Commercial Bank' },
    { code: 'ECO', name: 'Ecobank' },
    { code: 'STB', name: 'Stanbic Bank' },
    { code: 'FID', name: 'Fidelity Bank' },
    { code: 'CAL', name: 'CalBank' },
    { code: 'ACC', name: 'Access Bank' },
    { code: 'ABS', name: 'Absa Bank' },
    { code: 'UBA', name: 'UBA Ghana' },
    { code: 'ZEN', name: 'Zenith Bank' },
    { code: 'FBL', name: 'First Atlantic Bank' },
    { code: 'ADB', name: 'Agricultural Development Bank' },
    { code: 'BOG', name: 'Bank of Ghana' },
    { code: 'CBG', name: 'Consolidated Bank Ghana' },
    { code: 'GTB', name: 'Guaranty Trust Bank' },
    { code: 'FBN', name: 'First Bank of Nigeria' },
  ];
}

/**
 * List supported mobile money providers with their Hubtel channel codes
 */
export function getSupportedMomoProviders(): { code: string; name: string; channel: string }[] {
  return [
    { code: 'mtn', name: 'MTN Mobile Money', channel: 'mtn-gh' },
    { code: 'vodafone', name: 'Vodafone Cash', channel: 'vod-gh' },
    { code: 'airteltigo', name: 'AirtelTigo Money', channel: 'tgo-gh' },
  ];
}
