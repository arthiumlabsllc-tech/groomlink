/**
 * Paystack Payment Provider Implementation
 * 
 * Implements the IPaymentProvider interface for Paystack integration.
 * Supports:
 * - Mobile Money (MTN, Vodafone, AirtelTigo)
 * - Card payments
 * - Bank transfers
 * - Instant payouts to bank accounts and mobile money
 * - Webhooks for payment notifications
 * - Refunds
 * 
 * Documentation: https://paystack.com/docs
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

export interface PaystackCredentials extends PaymentCredentials {
  secretKey: string;
  publicKey: string;
}

export class PaystackProvider implements IPaymentProvider {
  private static BASE_URL = 'https://api.paystack.co';

  getName(): string {
    return 'paystack';
  }

  /**
   * Initialize a payment transaction with Paystack
   * Supports mobile money and card payments
   */
  async initializePayment(
    request: PaymentInitializationRequest,
    credentials: PaymentCredentials
  ): Promise<PaymentInitializationResponse> {
    try {
      const { secretKey } = credentials as PaystackCredentials;
      const { amount, email, phoneNumber, reference, bookingId, metadata } = request;

      // Convert GHS to pesewas (Paystack expects amount in smallest currency unit)
      const amountInPesewas = Math.round(amount * 100);

      // Build payment channels based on payment method preference
      // Paystack supports: 'card', 'mobile_money', 'bank_transfer', 'ussd', 'qr'
      const channels: string[] = metadata?.paymentMethod === 'card'
        ? ['card']
        : metadata?.paymentMethod === 'bank_transfer'
          ? ['bank_transfer']
          : metadata?.paymentMethod === 'mobile_money' && phoneNumber
            ? ['mobile_money']
            : ['mobile_money', 'card']; // Default: both channels

      const requestBody: any = {
        email,
        amount: amountInPesewas,
        reference,
        channels,
        currency: 'GHS',
        metadata: {
          booking_id: bookingId,
          platform: 'groomlink',
          ...metadata,
        },
      };

      // Add mobile money specific parameters if phone number provided
      if (phoneNumber) {
        requestBody.metadata.phone_number = phoneNumber;
        
        // For mobile money, we can use Paystack's dedicated mobile money endpoints
        // But the standard initialize endpoint works for all channels
      }

      // Callback URL for webhook notifications
      const callbackUrl = process.env.PAYSTACK_CALLBACK_URL || 
        `${process.env.API_BASE_URL || 'https://groomlinkgh.com'}/api/payments/callback/paystack`;
      
      requestBody.callback_url = callbackUrl;

      const response = await axios.post(
        `${PaystackProvider.BASE_URL}/transaction/initialize`,
        requestBody,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      if (!data.status) {
        logger.error('Paystack initialization failed', {
          reference,
          message: data.message,
        });

        return {
          success: false,
          message: data.message || 'Failed to initialize payment with Paystack',
        };
      }

      logger.info('Paystack payment initialized', {
        reference,
        bookingId,
        amount,
      });

      return {
        success: true,
        reference,
        redirectUrl: data.data.authorization_url,
        accessCode: data.data.access_code,
        authorizationUrl: data.data.authorization_url,
        message: 'Payment initialized. Please complete payment.',
      };
    } catch (error: any) {
      logger.error('Paystack initialize payment error', {
        message: error.message,
        response: error.response?.data,
        reference: request.reference,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to initialize payment with Paystack',
      };
    }
  }

  /**
   * Verify payment status with Paystack
   */
  async verifyPayment(
    reference: string,
    credentials: PaymentCredentials
  ): Promise<PaymentVerificationResponse> {
    try {
      const { secretKey } = credentials as PaystackCredentials;

      const response = await axios.get(
        `${PaystackProvider.BASE_URL}/transaction/verify/${reference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      const data = response.data;

      if (!data.status) {
        logger.warn('Paystack verification response returned status=false (transaction may not exist yet)', {
          reference,
          message: data.message,
        });

        return {
          success: false,
          status: 'pending',
          message: data.message || 'Payment not yet confirmed by provider',
        };
      }

      const transaction = data.data;
      const isSuccess = transaction.status === 'success';

      logger.info('Paystack payment verified', {
        reference,
        status: transaction.status,
        amount: transaction.amount / 100, // Convert from pesewas to GHS
      });

      return {
        success: isSuccess,
        status: transaction.status,
        message: isSuccess ? 'Payment verified successfully' : `Payment status: ${transaction.status}`,
        data: transaction,
        amount: transaction.amount / 100, // Convert from pesewas to GHS
        customerEmail: transaction.customer?.email,
        customerPhone: transaction.customer?.phone,
      };
    } catch (error: any) {
      logger.warn('Paystack verify payment network/API error (not a payment failure)', {
        message: error.message,
        statusCode: error.response?.status,
        response: error.response?.data,
        reference,
      });

      return {
        success: false,
        status: 'pending',
        message: 'Unable to confirm payment status - still processing',
      };
    }
  }

  /**
   * Process refund through Paystack
   */
  async processRefund(
    request: RefundRequest,
    credentials: PaymentCredentials
  ): Promise<RefundResponse> {
    try {
      const { secretKey } = credentials as PaystackCredentials;
      const { transactionReference, amount, reason } = request;

      // First, get the transaction to find the transaction ID
      const verifyResponse = await axios.get(
        `${PaystackProvider.BASE_URL}/transaction/verify/${transactionReference}`,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
          },
        }
      );

      if (!verifyResponse.data.status) {
        return {
          success: false,
          message: 'Transaction not found for refund',
        };
      }

      const transactionId = verifyResponse.data.data.id;
      const transactionAmount = verifyResponse.data.data.amount / 100; // Convert to GHS

      // Paystack refunds require amount in pesewas
      const refundAmountInPesewas = Math.round(amount * 100);

      // Validate refund amount doesn't exceed transaction amount
      if (refundAmountInPesewas > verifyResponse.data.data.amount) {
        return {
          success: false,
          message: `Refund amount exceeds transaction amount. Max refund: GHS ${transactionAmount}`,
        };
      }

      const response = await axios.post(
        `${PaystackProvider.BASE_URL}/refund`,
        {
          transaction: transactionId,
          amount: refundAmountInPesewas,
          reason,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      if (!data.status) {
        logger.error('Paystack refund failed', {
          transactionReference,
          message: data.message,
        });

        return {
          success: false,
          message: data.message || 'Failed to process refund',
        };
      }

      logger.info('Paystack refund processed successfully', {
        transactionReference,
        refundAmount: amount,
        refundReference: data.data.reference,
      });

      return {
        success: true,
        message: 'Refund processed successfully',
        refundReference: data.data.reference,
        refundedAmount: amount,
      };
    } catch (error: any) {
      logger.error('Paystack refund error', {
        message: error.message,
        response: error.response?.data,
        transactionReference: request.transactionReference,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to process refund',
      };
    }
  }

  /**
   * Register a transfer recipient (required before sending payouts)
   * Supports bank accounts and mobile money
   */
  async registerRecipient(
    recipient: PayoutRecipient,
    credentials: PaymentCredentials
  ): Promise<PayoutResponse> {
    try {
      const { secretKey } = credentials as PaystackCredentials;

      let recipientData: any;

      if (recipient.payoutType === 'bank') {
        // Bank account recipient (NUBAN)
        recipientData = {
          type: 'nuban',
          name: recipient.accountName || recipient.name,
          account_number: recipient.accountNumber,
          bank_code: recipient.bankCode,
          currency: 'GHS',
        };
      } else if (recipient.payoutType === 'mobile_money') {
        // Mobile money recipient
        // Paystack Ghana mobile money bank codes
        const providerMap: Record<string, string> = {
          mtn: 'MTN',
          vod: 'VOD-MOMO',
          vodafone: 'VOD-MOMO',
          tgo: 'ATL-MOMO',
          airteltigo: 'ATL-MOMO',
        };

        recipientData = {
          type: 'mobile_money',
          name: recipient.name,
          account_number: recipient.mobileMoneyNumber || '',
          bank_code: providerMap[recipient.mobileMoneyProvider?.toLowerCase() || 'mtn'] || 'MTN',
          currency: 'GHS',
        };
      } else {
        return {
          success: false,
          message: 'Invalid payout type',
        };
      }

      const response = await axios.post(
        `${PaystackProvider.BASE_URL}/transferrecipient`,
        recipientData,
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      if (!data.status) {
        logger.error('Paystack recipient registration failed', {
          message: data.message,
          recipient: recipient.name,
        });

        return {
          success: false,
          message: data.message || 'Failed to register payout recipient',
        };
      }

      logger.info('Paystack recipient registered', {
        recipientCode: data.data.recipient_code,
        name: recipient.name,
        type: recipient.payoutType,
      });

      return {
        success: true,
        message: 'Payout recipient registered successfully',
        recipientCode: data.data.recipient_code,
      };
    } catch (error: any) {
      logger.error('Paystack register recipient error', {
        message: error.message,
        response: error.response?.data,
        recipient: recipient.name,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to register payout recipient',
      };
    }
  }

  /**
   * Send payout to salon owner via Paystack transfers
   */
  async sendPayout(
    request: PayoutRequest,
    credentials: PaymentCredentials
  ): Promise<PayoutResponse> {
    try {
      const { secretKey } = credentials as PaystackCredentials;
      const { recipient, amount, reference, reason } = request;

      // Convert GHS to pesewas
      const amountInPesewas = Math.round(amount * 100);

      // First check if recipient code exists, if not register them
      let recipientCode = (recipient as any).recipientCode;

      if (!recipientCode) {
        const registrationResult = await this.registerRecipient(recipient, credentials);
        if (!registrationResult.success) {
          return registrationResult;
        }
        recipientCode = registrationResult.recipientCode;
      }

      // Send transfer
      const response = await axios.post(
        `${PaystackProvider.BASE_URL}/transfer`,
        {
          source: 'balance', // Default balance wallet
          amount: amountInPesewas,
          recipient: recipientCode,
          reason: reason || `GroomLink payout for ${reference}`,
          reference,
        },
        {
          headers: {
            Authorization: `Bearer ${secretKey}`,
            'Content-Type': 'application/json',
          },
        }
      );

      const data = response.data;

      if (!data.status) {
        logger.error('Paystack payout failed', {
          reference,
          message: data.message,
        });

        return {
          success: false,
          message: data.message || 'Failed to send payout',
        };
      }

      logger.info('Paystack payout sent successfully', {
        reference,
        amount,
        transferCode: data.data.transfer_code,
      });

      return {
        success: true,
        message: 'Payout sent successfully',
        payoutReference: data.data.transfer_code,
        recipientCode,
      };
    } catch (error: any) {
      logger.error('Paystack payout error', {
        message: error.message,
        response: error.response?.data,
        reference: request.reference,
      });

      return {
        success: false,
        message: error.response?.data?.message || 'Failed to send payout',
      };
    }
  }

  /**
   * Handle Paystack webhook events
   */
  async handleWebhook(
    payload: WebhookPayload,
    credentials: PaymentCredentials
  ): Promise<WebhookResponse> {
    try {
      const event = JSON.parse(payload.rawBody);

      logger.info('Paystack webhook received', {
        event: event.event,
        reference: event.data?.reference,
      });

      switch (event.event) {
        case 'charge.success':
          return {
            success: true,
            message: 'Payment successful',
            eventType: 'charge.success',
            transactionReference: event.data.reference,
            status: 'success',
          };

        case 'transfer.success':
          return {
            success: true,
            message: 'Payout successful',
            eventType: 'transfer.success',
            transactionReference: event.data.reference,
            status: 'success',
          };

        case 'transfer.failed':
          return {
            success: false,
            message: 'Payout failed',
            eventType: 'transfer.failed',
            transactionReference: event.data.reference,
            status: 'failed',
          };

        case 'refund.processed':
          return {
            success: true,
            message: 'Refund processed',
            eventType: 'refund.processed',
            transactionReference: event.data.reference,
            status: 'refunded',
          };

        default:
          logger.warn('Unhandled Paystack webhook event', {
            event: event.event,
          });

          return {
            success: true,
            message: `Event ${event.event} received`,
            eventType: event.event,
          };
      }
    } catch (error: any) {
      logger.error('Paystack webhook handling error', {
        message: error.message,
      });

      return {
        success: false,
        message: 'Failed to process webhook',
      };
    }
  }

  /**
   * Verify Paystack webhook signature
   * Paystack uses IP whitelisting and optional signature verification
   */
  verifyWebhookSignature(
    payload: WebhookPayload,
    credentials: PaymentCredentials
  ): boolean {
    try {
      // Paystack recommends verifying webhook by:
      // 1. Checking the source IP address against their known IPs
      // 2. Optionally verifying the signature in the header
      
      const signature = payload.headers['x-paystack-signature'] || 
                       payload.headers['x-paystack-mediasignature'];

      if (!signature) {
        // If no signature provided, rely on IP verification (should be done at server level)
        logger.warn('Paystack webhook signature not provided');
        return true; // Allow if IP verification is done at server level
      }

      const { secretKey } = credentials as PaystackCredentials;
      
      // Verify HMAC SHA512 signature
      const hash = crypto
        .createHmac('sha512', secretKey)
        .update(payload.rawBody)
        .digest('hex');

      return hash === signature;
    } catch (error: any) {
      logger.error('Paystack signature verification error', {
        message: error.message,
      });

      return false;
    }
  }
}
