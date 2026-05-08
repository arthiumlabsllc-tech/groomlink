/**
 * Hubtel Payment Provider Implementation
 * 
 * Implements the IPaymentProvider interface for Hubtel integration.
 * Wraps the existing HubtelPaymentProvider class to conform to the unified interface.
 * 
 * Supports:
 * - Mobile Money (MTN MoMo, Vodafone Cash, AirtelTigo Money)
 * - Webhooks for payment notifications
 * - Payment verification
 * 
 * Note: Hubtel does not support direct payouts through their API.
 * Payouts must be handled manually or through a different provider.
 */

import axios from 'axios';
import crypto from 'crypto';
import logger from '../config/logger';
import {
  IPaymentProvider,
  PaymentCredentials,
  PaymentInitializationRequest,
  PaymentInitializationResponse,
  PaymentVerificationResponse,
  RefundRequest,
  RefundResponse,
  PayoutRecipient,
  PayoutRequest,
  PayoutResponse,
  WebhookPayload,
  WebhookResponse,
} from './payment-provider.interface';
import { PaymentProvider } from '@prisma/client';

export interface HubtelCredentials extends PaymentCredentials {
  apiId: string;
  apiSecret: string;
  merchantAccountId: string;
}

export class HubtelPaymentProvider implements IPaymentProvider {
  private static BASE_URL = 'https://api.hubtel.com/v1/receivemoney';
  private static SEND_MONEY_URL = 'https://api.hubtel.com/v1/sendmoney/send';

  getName(): string {
    return 'hubtel';
  }

  /**
   * Map payment provider enum to Hubtel channel code
   */
  private getChannel(provider: PaymentProvider): string {
    const channelMap: Record<string, string> = {
      [PaymentProvider.MTN_MOMO]: 'mtn-gh',
      [PaymentProvider.VODAFONE_CASH]: 'vod-gh',
      [PaymentProvider.AIRTELTIGO_MONEY]: 'tgo-gh',
      [PaymentProvider.CASH]: 'cash',
    };
    return channelMap[provider] || 'mtn-gh';
  }

  /**
   * Initialize a payment transaction with Hubtel
   */
  async initializePayment(
    request: PaymentInitializationRequest,
    credentials: PaymentCredentials
  ): Promise<PaymentInitializationResponse> {
    try {
      const { apiId, apiSecret, merchantAccountId } = credentials as HubtelCredentials;
      const { amount, email, phoneNumber, reference, bookingId } = request;

      // Hubtel expects amount in GHS (not pesewas)
      // Map the selected mobile money provider to Hubtel channel
      const provider = request.provider as any;
      const channel = provider ? this.getChannel(provider) : 'mtn-gh';

      // Ensure phone number has +233 prefix
      let customerMsisdn = phoneNumber || '';
      if (customerMsisdn && !customerMsisdn.startsWith('+')) {
        customerMsisdn = `+${customerMsisdn}`;
      }

      const webhookUrl = process.env.HUBTEL_PAYMENT_WEBHOOK_URL || 
        `${process.env.API_BASE_URL || 'https://groomlinkgh.com'}/api/payments/webhook/hubtel`;

      const requestBody: any = {
        CustomerName: email || 'Customer',
        CustomerEmail: email,
        CustomerMsisdn: customerMsisdn,
        Channel: channel,
        Amount: amount,
        ClientReference: reference,
        Description: `GroomLink Booking ${bookingId}`,
        PrimaryCallbackUrl: webhookUrl,
        SecondaryCallbackUrl: webhookUrl,
      };

      // Include merchant account if configured (required for some Hubtel accounts)
      if (merchantAccountId) {
        requestBody.MerchantAccount = merchantAccountId;
      }

      const authHeader = this.getAuthHeader(apiId, apiSecret);

      const response = await axios.post(
        `${HubtelPaymentProvider.BASE_URL}/receive`,
        requestBody,
        {
          headers: authHeader,
        }
      );

      const data = response.data;

      // Hubtel returns ResponseCode in the body - validate it
      const responseCode = data?.ResponseCode;
      const responseDesc = data?.ResponseDescription || data?.Message || '';

      logger.info('Hubtel payment initialized', {
        reference,
        bookingId,
        amount,
        responseCode,
        responseDesc,
        hubtelTransactionId: data?.Data?.TransactionId,
        hubtelStatus: data?.Data?.TransactionStatus,
      });

      // ResponseCode "0000" = Success, "0001" = Pending (also acceptable for init)
      const isSuccess = responseCode === '0000' || responseCode === '0001' || !responseCode;

      if (!isSuccess) {
        logger.error('Hubtel payment initialization failed', {
          reference,
          responseCode,
          responseDesc,
          requestBody: { ...requestBody, CustomerMsisdn: '***REDACTED***' },
        });

        return {
          success: false,
          reference,
          message: `Hubtel error (${responseCode}): ${responseDesc || 'Failed to initialize payment'}`,
        };
      }

      return {
        success: true,
        reference,
        redirectUrl: data?.checkoutUrl || data?.redirectUrl || undefined,
        message: responseDesc || 'Payment initialized. Please complete payment on your phone.',
      };
    } catch (error: any) {
      logger.error('Hubtel initialize payment error', {
        message: error.message,
        response: error.response?.data,
        reference: request.reference,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize payment with Hubtel',
      };
    }
  }

  /**
   * Verify payment status with Hubtel
   */
  async verifyPayment(
    reference: string,
    credentials: PaymentCredentials
  ): Promise<PaymentVerificationResponse> {
    try {
      const { apiId, apiSecret } = credentials as HubtelCredentials;

      const authHeader = this.getAuthHeader(apiId, apiSecret);

      const response = await axios.get(
        `${HubtelPaymentProvider.BASE_URL}/status?ClientReference=${reference}`,
        {
          headers: authHeader,
        }
      );

      const data = response.data;
      const isSuccessful = data.Status === '0000' && data.Data?.TransactionStatus === 'success';

      logger.info('Hubtel payment verified', {
        reference,
        status: data.Status,
        transactionStatus: data.Data?.TransactionStatus,
      });

      return {
        success: isSuccessful,
        status: isSuccessful ? 'success' : (data.Data?.TransactionStatus || 'unknown'),
        message: isSuccessful ? 'Payment verified successfully' : `Payment status: ${data.Data?.TransactionStatus || 'unknown'}`,
        data,
        amount: data.Data?.Amount,
      };
    } catch (error: any) {
      logger.error('Hubtel verify payment error', {
        message: error.message,
        response: error.response?.data,
        reference,
      });

      return {
        success: false,
        status: 'failed',
        message: 'Failed to verify payment with Hubtel',
      };
    }
  }

  /**
   * Process refund through Hubtel
   * Note: Hubtel may not support direct refunds via API
   */
  async processRefund(
    _request: RefundRequest,
    _credentials: PaymentCredentials
  ): Promise<RefundResponse> {
    logger.warn('Hubtel refund not implemented - manual refund required');
    
    return {
      success: false,
      message: 'Hubtel does not support automatic refunds. Please process manually.',
    };
  }

  /**
   * Send payout to salon owner via Hubtel Send Money API
   * Supports mobile money payouts (MTN, Vodafone, AirtelTigo)
   */
  async sendPayout(
    request: PayoutRequest,
    credentials: PaymentCredentials
  ): Promise<PayoutResponse> {
    try {
      const { apiId, apiSecret } = credentials as HubtelCredentials;
      const { recipient, amount, reference, reason } = request;

      // Hubtel payouts only support mobile money, not bank transfers
      if (recipient.payoutType !== 'mobile_money') {
        logger.warn('Hubtel only supports mobile money payouts', {
          requestedType: recipient.payoutType,
        });
        return {
          success: false,
          message: 'Hubtel only supports mobile money payouts. Use Paystack for bank transfers.',
        };
      }

      // Map mobile money provider to Hubtel channel
      const channelMap: Record<string, string> = {
        mtn: 'mtn-gh',
        vod: 'vod-gh',
        vodafone: 'vod-gh',
        tgo: 'tgo-gh',
        airteltigo: 'tgo-gh',
      };

      const channel = channelMap[recipient.mobileMoneyProvider?.toLowerCase() || 'mtn'] || 'mtn-gh';

      // Ensure phone number has +233 prefix
      let recipientPhone = recipient.mobileMoneyNumber || '';
      if (recipientPhone && !recipientPhone.startsWith('+')) {
        recipientPhone = `+${recipientPhone}`;
      }

      const authHeader = this.getAuthHeader(apiId, apiSecret);

      const response = await axios.post(
        HubtelPaymentProvider.SEND_MONEY_URL,
        {
          RecipientName: recipient.name,
          RecipientMsisdn: recipientPhone,
          Channel: channel,
          Amount: amount, // Hubtel expects amount in GHS (not pesewas)
          ClientReference: reference,
          Description: reason || `GroomLink payout for ${reference}`,
        },
        {
          headers: authHeader,
          timeout: 30000, // 30 second timeout
        }
      );

      const data = response.data;

      if (!data || data.ResponseCode !== '0000') {
        logger.error('Hubtel payout failed', {
          reference,
          responseCode: data?.ResponseCode,
          message: data?.ResponseDescription,
        });

        return {
          success: false,
          message: data?.ResponseDescription || 'Failed to send payout',
        };
      }

      logger.info('Hubtel payout sent successfully', {
        reference,
        amount,
        recipient: recipient.name,
        channel,
      });

      return {
        success: true,
        message: 'Payout sent successfully',
        payoutReference: data.TransactionId || reference,
      };
    } catch (error: any) {
      logger.error('Hubtel payout error', {
        message: error.message,
        response: error.response?.data,
        reference: request.reference,
      });

      return {
        success: false,
        message: error.response?.data?.ResponseDescription || 'Failed to send payout',
      };
    }
  }

  /**
   * Register a payout recipient
   * Note: Hubtel doesn't require pre-registration of recipients for mobile money
   * This method is provided for interface compatibility
   */
  async registerRecipient(
    recipient: PayoutRecipient,
    _credentials: PaymentCredentials
  ): Promise<PayoutResponse> {
    try {
      // Hubtel doesn't require recipient registration for mobile money payouts
      // We can generate a recipient code for tracking purposes
      const recipientCode = `HUB-${recipient.payoutType}-${Date.now()}`;

      logger.info('Hubtel recipient code generated (no registration required)', {
        recipientCode,
        name: recipient.name,
        type: recipient.payoutType,
      });

      return {
        success: true,
        message: 'Hubtel does not require recipient registration. Use phone number directly.',
        recipientCode,
      };
    } catch (error: any) {
      logger.error('Hubtel recipient registration error', {
        message: error.message,
      });

      return {
        success: false,
        message: 'Failed to process recipient registration',
      };
    }
  }

  /**
   * Handle Hubtel webhook events
   */
  async handleWebhook(
    payload: WebhookPayload,
    credentials: PaymentCredentials
  ): Promise<WebhookResponse> {
    try {
      const event = JSON.parse(payload.rawBody);

      logger.info('Hubtel webhook received', {
        reference: event.ClientReference,
        status: event.Data?.TransactionStatus,
      });

      const isSuccess = event.Data?.TransactionStatus === 'success';

      return {
        success: isSuccess,
        message: isSuccess ? 'Payment successful' : `Payment status: ${event.Data?.TransactionStatus}`,
        eventType: 'payment.notification',
        transactionReference: event.ClientReference,
        status: isSuccess ? 'success' : 'failed',
      };
    } catch (error: any) {
      logger.error('Hubtel webhook handling error', {
        message: error.message,
      });

      return {
        success: false,
        message: 'Failed to process webhook',
      };
    }
  }

  /**
   * Verify Hubtel webhook signature
   * Hubtel uses HMAC-SHA512 of request body with API secret
   */
  verifyWebhookSignature(
    payload: WebhookPayload,
    credentials: PaymentCredentials
  ): boolean {
    try {
      const { apiSecret } = credentials as HubtelCredentials;
      const signature = payload.headers['x-hubtel-signature'] || 
                       payload.headers['x-signature'];

      if (!signature) {
        logger.warn('Hubtel webhook signature not provided');
        return true; // Allow if IP verification is done at server level
      }

      const hash = crypto
        .createHmac('sha512', apiSecret)
        .update(payload.rawBody)
        .digest('hex');

      return hash === signature;
    } catch (error: any) {
      logger.error('Hubtel signature verification error', {
        message: error.message,
      });

      return false;
    }
  }

  /**
   * Build Hubtel Basic Auth header
   */
  private getAuthHeader(apiId: string, apiSecret: string): Record<string, string> {
    const credentials = Buffer.from(`${apiId}:${apiSecret}`).toString('base64');
    return {
      'Authorization': `Basic ${credentials}`,
      'Content-Type': 'application/json',
    };
  }
}
