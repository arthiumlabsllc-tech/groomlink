import prisma from '../config/database';
import logger from '../config/logger';
import axios from 'axios';

const PAYSTACK_BASE_URL = 'https://api.paystack.co';

// Ghana bank codes mapping for Paystack
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

// Mobile money provider codes for Paystack
const MOMO_PROVIDER_CODES: Record<string, string> = {
  'mtn': 'MTN',
  'vodafone': 'VOD',
  'vod': 'VOD',
  'airteltigo': 'ATL',
  'tgo': 'ATL',
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
  paystackRecipientCode: string | null;
  isVerified: boolean;
}

// Helper function to get Paystack secret key from SiteSettings
async function getPaystackSecretKey(): Promise<string | null> {
  const settings = await prisma.siteSettings.findUnique({
    where: { id: 'default' }
  });
  
  if (!settings || !settings.paystackSecretKey) {
    logger.warn('Paystack secret key not configured in SiteSettings');
    return null;
  }
  
  return settings.paystackSecretKey;
}

/**
 * Setup or update payout account for a salon
 * Creates a Paystack transfer recipient and stores the details
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
      if (!data.momoProvider || !data.momoNumber) {
        throw new Error('Mobile money provider and phone number are required for mobile money payouts');
      }
    } else {
      throw new Error('Invalid payout type. Must be "bank" or "mobile_money"');
    }

    // Get Paystack secret key
    const secretKey = await getPaystackSecretKey();
    if (!secretKey) {
      throw new Error('Paystack is not configured. Please contact support.');
    }

    // Get salon details for the recipient name
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: { businessName: true, paystackRecipientCode: true }
    });

    if (!salon) {
      throw new Error('Salon not found');
    }

    // Prepare Paystack transfer recipient payload
    let recipientPayload: any;
    
    if (data.payoutType === 'bank') {
      const paystackBankCode = (data.bankCode && GHANA_BANK_CODES[data.bankCode]) || data.bankCode;
      
      recipientPayload = {
        type: 'nuban',
        name: data.bankAccountName,
        account_number: data.bankAccountNumber,
        bank_code: paystackBankCode,
        currency: 'GHS',
        description: `Payout account for ${salon.businessName}`,
      };
    } else {
      // Mobile money
      const providerCode = MOMO_PROVIDER_CODES[data.momoProvider!.toLowerCase()];
      if (!providerCode) {
        throw new Error(`Invalid mobile money provider: ${data.momoProvider}`);
      }

      recipientPayload = {
        type: 'mobile_money',
        name: data.bankAccountName || salon.businessName,
        account_number: data.momoNumber,
        bank_code: providerCode,
        currency: 'GHS',
        description: `Mobile money payout for ${salon.businessName}`,
      };
    }

    // Create or update Paystack transfer recipient
    let recipientCode: string;
    
    try {
      const response = await axios.post(
        `${PAYSTACK_BASE_URL}/transferrecipient`,
        recipientPayload,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.data.status) {
        throw new Error(response.data.message || 'Failed to create transfer recipient');
      }

      recipientCode = response.data.data.recipient_code;
      
      logger.info(`Paystack transfer recipient created for salon ${salonId}`, {
        recipientCode,
        payoutType: data.payoutType
      });
    } catch (paystackError: any) {
      logger.error('Paystack transfer recipient creation failed:', {
        salonId,
        error: paystackError.message,
        response: paystackError.response?.data
      });
      
      const errorMessage = paystackError.response?.data?.message || paystackError.message;
      throw new Error(`Failed to verify payout account: ${errorMessage}`);
    }

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
        paystackRecipientCode: recipientCode,
      },
    });

    logger.info(`Payout account setup completed for salon ${salonId}`, {
      payoutType: data.payoutType,
      recipientCode
    });

    return {
      id: updatedSalon.id,
      payoutType: updatedSalon.payoutType,
      bankCode: updatedSalon.bankCode,
      bankAccountNumber: updatedSalon.bankAccountNumber,
      bankAccountName: updatedSalon.bankAccountName,
      momoProvider: updatedSalon.momoProvider,
      momoNumber: updatedSalon.momoNumber,
      paystackRecipientCode: updatedSalon.paystackRecipientCode,
      isVerified: !!updatedSalon.paystackRecipientCode,
    };
  } catch (error) {
    logger.error('Error setting up payout account:', { salonId, error });
    throw error;
  }
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
        paystackRecipientCode: true,
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
      paystackRecipientCode: salon.paystackRecipientCode ? '***verified***' : null,
      isVerified: !!salon.paystackRecipientCode,
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
  paystackRecipientCode: string | null;
  bankAccountNumber: string | null;
  momoNumber: string | null;
} | null> {
  try {
    const salon = await prisma.salon.findUnique({
      where: { id: salonId },
      select: {
        payoutType: true,
        paystackRecipientCode: true,
        bankAccountNumber: true,
        momoNumber: true,
      },
    });

    if (!salon) {
      return null;
    }

    return {
      payoutType: salon.payoutType,
      paystackRecipientCode: salon.paystackRecipientCode,
      bankAccountNumber: salon.bankAccountNumber,
      momoNumber: salon.momoNumber,
    };
  } catch (error) {
    logger.error('Error fetching internal payout account:', { salonId, error });
    throw error;
  }
}

/**
 * List available Ghana banks supported by Paystack
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
 * List supported mobile money providers
 */
export function getSupportedMomoProviders(): { code: string; name: string }[] {
  return [
    { code: 'mtn', name: 'MTN Mobile Money' },
    { code: 'vodafone', name: 'Vodafone Cash' },
    { code: 'airteltigo', name: 'AirtelTigo Money' },
  ];
}
