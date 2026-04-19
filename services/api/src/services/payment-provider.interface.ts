/**
 * Unified Payment Provider Interface
 * 
 * This interface defines the contract that all payment providers must implement.
 * It allows GroomLink to support multiple payment gateways (Hubtel, Paystack, etc.)
 * without changing the business logic.
 * 
 * Key Benefits:
 * - Easy to add new payment providers
 * - Consistent API across all providers
 * - Seamless fallback between providers
 * - Provider-agnostic business logic
 */

export interface PaymentCredentials {
  [key: string]: string;
}

export interface PaymentInitializationRequest {
  amount: number; // Amount in GHS (not pesewas)
  email: string;
  phoneNumber?: string;
  reference: string;
  bookingId: string;
  metadata?: Record<string, any>;
}

export interface PaymentInitializationResponse {
  success: boolean;
  message: string;
  reference?: string;
  redirectUrl?: string; // For Paystack checkout
  accessCode?: string; // For Paystack inline
  authorizationUrl?: string; // Alternative redirect URL
}

export interface PaymentVerificationResponse {
  success: boolean;
  status: string; // 'success', 'failed', 'pending'
  message: string;
  data?: any; // Provider-specific response data
  amount?: number;
  customerEmail?: string;
  customerPhone?: string;
}

export interface RefundRequest {
  transactionReference: string;
  amount: number; // Amount to refund (partial or full)
  reason: string;
}

export interface RefundResponse {
  success: boolean;
  message: string;
  refundReference?: string;
  refundedAmount?: number;
}

export interface PayoutRecipient {
  name: string;
  email?: string;
  bankCode?: string;
  accountNumber?: string;
  accountName?: string;
  mobileMoneyProvider?: string; // 'mtn', 'vod', 'tgo'
  mobileMoneyNumber?: string;
  payoutType: 'bank' | 'mobile_money';
}

export interface PayoutRequest {
  recipient: PayoutRecipient;
  amount: number;
  reference: string;
  reason?: string;
}

export interface PayoutResponse {
  success: boolean;
  message: string;
  payoutReference?: string;
  recipientCode?: string;
}

export interface WebhookPayload {
  rawBody: string;
  headers: Record<string, string>;
  signature?: string;
}

export interface WebhookResponse {
  success: boolean;
  message: string;
  eventType?: string;
  transactionReference?: string;
  status?: string;
}

/**
 * Unified interface that all payment providers must implement.
 * This allows switching between Hubtel and Paystack without changing business logic.
 */
export interface IPaymentProvider {
  /**
   * Get the provider name (e.g., 'hubtel', 'paystack')
   */
  getName(): string;

  /**
   * Initialize a payment transaction
   * @returns Payment initialization response with redirect URL or access code
   */
  initializePayment(request: PaymentInitializationRequest, credentials: PaymentCredentials): Promise<PaymentInitializationResponse>;

  /**
   * Verify payment status after callback or webhook
   */
  verifyPayment(reference: string, credentials: PaymentCredentials): Promise<PaymentVerificationResponse>;

  /**
   * Process refund for a transaction
   */
  processRefund(request: RefundRequest, credentials: PaymentCredentials): Promise<RefundResponse>;

  /**
   * Register a recipient for payouts (bank account or mobile money)
   */
  registerRecipient(recipient: PayoutRecipient, credentials: PaymentCredentials): Promise<PayoutResponse>;

  /**
   * Send payout to salon owner (instant transfer)
   */
  sendPayout(request: PayoutRequest, credentials: PaymentCredentials): Promise<PayoutResponse>;

  /**
   * Handle webhook from provider
   */
  handleWebhook(payload: WebhookPayload, credentials: PaymentCredentials): Promise<WebhookResponse>;

  /**
   * Verify webhook signature for security
   */
  verifyWebhookSignature(payload: WebhookPayload, credentials: PaymentCredentials): boolean;
}
