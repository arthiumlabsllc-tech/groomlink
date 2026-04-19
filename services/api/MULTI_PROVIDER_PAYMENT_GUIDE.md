# Multi-Provider Payment System Implementation Guide

## Overview

This document describes the implementation of the multi-provider payment system for GroomLink, supporting both **Hubtel** and **Paystack** as payment gateways.

## Architecture

### Core Components

1. **Payment Provider Interface** (`payment-provider.interface.ts`)
   - Unified interface that all payment providers must implement
   - Ensures consistent API across different providers

2. **Hubtel Provider** (`hubtel.provider.ts`)
   - Implements IPaymentProvider for Hubtel
   - Supports Mobile Money (MTN, Vodafone, AirtelTigo)
   - Note: Does not support automatic payouts

3. **Paystack Provider** (`paystack.provider.ts`)
   - Implements IPaymentProvider for Paystack
   - Supports Cards + Mobile Money
   - Supports automatic payouts to bank accounts and mobile money
   - Supports refunds

4. **Provider Registry** (`payment-provider.registry.ts`)
   - Central registry for managing payment providers
   - Handles provider selection and fallback logic
   - Loads credentials from SiteSettings or environment variables

## Database Schema Changes

### 1. PaymentProvider Enum (Updated)

```prisma
enum PaymentProvider {
  MTN_MOMO
  VODAFONE_CASH
  AIRTELTIGO_MONEY
  CASH
  PAYSTACK // NEW: Paystack provider
}
```

### 2. Payment Model (Enhanced)

New fields added:
- `paystackTransactionId` - Paystack transaction ID
- `paystackAccessCode` - Paystack inline access code
- `paymentGateway` - Which gateway was used ('hubtel' or 'paystack')
- `gatewayTransactionId` - Gateway-specific transaction ID

### 3. EscrowAccount Model (Enhanced)

New fields for payout tracking:
- `paystackPayoutReference` - Paystack transfer reference
- `paystackRecipientCode` - Paystack recipient code for transfers
- `payoutGateway` - Which gateway handles payouts ('hubtel' or 'paystack')

### 4. SiteSettings Model (Already Has Paystack Fields)

Existing fields:
- `paymentGateway` - Active gateway ('hubtel' or 'paystack')
- `paystackPublicKey` - Paystack public key
- `paystackSecretKey` - Paystack secret key
- `hubtelApiId` - Hubtel API ID
- `hubtelApiSecret` - Hubtel API secret
- `hubtelMerchantAccountId` - Hubtel merchant account ID

## Setup Instructions

### Step 1: Run Database Migration

```bash
cd services/api
npx prisma migrate dev --name add_paystack_multi_provider
npx prisma generate
```

### Step 2: Configure Payment Providers

#### Option A: Via Admin Settings (Recommended)

1. Login to admin panel
2. Navigate to Settings → Payment Configuration
3. Enter credentials for desired providers:

**Hubtel Configuration:**
- Hubtel API ID
- Hubtel API Secret
- Hubtel Merchant Account ID

**Paystack Configuration:**
- Paystack Public Key
- Paystack Secret Key

4. Select active payment gateway from dropdown
5. Save settings

#### Option B: Via Environment Variables

Add to `.env` file:

```env
# Hubtel Configuration
HUBTEL_API_ID=your_hubtel_api_id
HUBTEL_API_SECRET=your_hubtel_api_secret
HUBTEL_MERCHANT_ACCOUNT_ID=your_hubtel_merchant_account_id

# Paystack Configuration
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_SECRET_KEY=sk_live_xxxx

# Callback URLs
PAYSTACK_CALLBACK_URL=https://groomlinkgh.com/api/payments/callback/paystack
HUBTEL_PAYMENT_WEBHOOK_URL=https://groomlinkgh.com/api/payments/webhook/hubtel

# Select Active Gateway (hubtel or paystack)
PAYMENT_GATEWAY=paystack
```

### Step 3: Restart API Server

```bash
# Development
npm run dev

# Production
pm2 restart api
```

## API Usage

### Initialize Payment

The payment service automatically uses the active provider:

```typescript
import { initializePayment } from './services/payment.service';

const result = await initializePayment(userId, {
  bookingId: 'booking-uuid',
  provider: PaymentProvider.MTN_MOMO, // Customer's payment method
  phoneNumber: '+233XXXXXXXXX',
});

// Result contains provider-specific data
if (result.success) {
  // For Paystack: result.redirectUrl or result.accessCode
  // For Hubtel: result.checkout_url
}
```

### Verify Payment

```typescript
import { verifyAndCompletePayment } from './services/payment.service';

const result = await verifyAndCompletePayment(paymentId, reference);

if (result.success) {
  // Payment verified and booking confirmed
  // Escrow account created automatically
}
```

### Process Payout (Paystack Only)

```typescript
import { paymentProviderRegistry } from './services/payment-provider.registry';

// Get Paystack provider
const paystack = await paymentProviderRegistry.getProvider('paystack');

if (paystack) {
  // Register recipient (one-time setup)
  const recipientResult = await paystack.provider.registerRecipient({
    name: 'Salon Owner Name',
    payoutType: 'bank', // or 'mobile_money'
    bankCode: '044', // Bank code
    accountNumber: '1234567890',
    accountName: 'Account Holder Name',
  }, paystack.credentials);

  // Send payout
  const payoutResult = await paystack.provider.sendPayout({
    recipient: {
      name: 'Salon Owner Name',
      payoutType: 'bank',
      recipientCode: recipientResult.recipientCode,
    },
    amount: 100.00, // GHS
    reference: 'payout-uuid',
    reason: 'Booking payout',
  }, paystack.credentials);
}
```

### Switch Payment Provider

```typescript
import { paymentProviderRegistry } from './services/payment-provider.registry';

// Switch to Paystack
await paymentProviderRegistry.setActiveProvider('paystack');

// Switch to Hubtel
await paymentProviderRegistry.setActiveProvider('hubtel');

// Reload configuration from database
await paymentProviderRegistry.reload();
```

## Webhook Endpoints

### Paystack Webhook

**URL:** `POST /api/payments/webhook/paystack`

**Events Handled:**
- `charge.success` - Payment successful
- `transfer.success` - Payout successful
- `transfer.failed` - Payout failed
- `refund.processed` - Refund processed

**Setup:**
1. Go to Paystack Dashboard → Settings → Webhooks
2. Add webhook URL: `https://groomlinkgh.com/api/payments/webhook/paystack`
3. Save

### Hubtel Webhook

**URL:** `POST /api/payments/webhook/hubtel`

**Already configured in Hubtel provider initialization**

## Provider Comparison

| Feature | Hubtel | Paystack |
|---------|--------|----------|
| Mobile Money (Ghana) | ✅ MTN, Vodafone, AirtelTigo | ✅ MTN, Vodafone, AirtelTigo |
| Card Payments | ❌ | ✅ Visa, Mastercard |
| Bank Transfers | ❌ | ✅ |
| Automatic Payouts | ❌ Manual only | ✅ Bank + Mobile Money |
| Refunds | ❌ Manual only | ✅ API supported |
| Webhooks | ✅ | ✅ |
| Test Mode | ✅ | ✅ |
| Recurring Payments | ❌ | ✅ |

## Recommended Configuration

### For Full Feature Support (Recommended)

**Active Provider:** Paystack

**Why:**
- Supports automatic payouts (escrow releases)
- Supports refunds via API
- Supports both cards and mobile money
- Better developer experience

### For Mobile Money Only

**Active Provider:** Hubtel

**Why:**
- Specialized for Ghana mobile money
- Simple integration
- Lower transaction fees (verify with providers)

### For Redundancy

**Setup:** Configure both providers

**Strategy:**
- Use Paystack as primary (for full features)
- Keep Hubtel as backup for mobile money
- Implement fallback logic in payment service

## Testing

### Test Mode Configuration

```env
# Enable test mode
IS_PAYMENT_TEST_MODE=true

# Use test keys
PAYSTACK_PUBLIC_KEY=pk_test_xxxx
PAYSTACK_SECRET_KEY=sk_test_xxxx
```

### Test Cards (Paystack)

- **Success:** 4084 0808 0808 0808
- **Decline:** 4084 0808 0808 0809
- **Insufficient Funds:** 4084 0808 0808 0810

### Test Mobile Money

Use actual mobile money numbers in test mode (Paystack provides test environment)

## Troubleshooting

### Provider Not Loading

**Check:**
1. Credentials configured in SiteSettings or .env
2. Database migration completed
3. Check logs: `logger.info('Payment provider registry initialized')`

### Payment Initialization Fails

**Check:**
1. Active provider has valid credentials
2. Phone number format: `+233XXXXXXXXX`
3. Amount is in GHS (not pesewas)
4. Check provider-specific error logs

### Webhook Not Receiving Events

**Check:**
1. Webhook URL is publicly accessible
2. SSL certificate valid (HTTPS required)
3. Webhook configured in provider dashboard
4. Check server logs for incoming requests

### Payouts Failing (Paystack)

**Check:**
1. Recipient registered first (get recipient_code)
2. Sufficient balance in Paystack account
3. Bank account details correct
4. Check Paystack dashboard for transfer status

## Migration from Old System

The old payment system is backward compatible. The migration is seamless:

1. Old `HubtelPaymentProvider` class still exists in `payment.service.ts`
2. New wrapper `HubtelPaymentProvider` in `hubtel.provider.ts` implements unified interface
3. Payment service will use new registry if available, fallback to old implementation if not

### Migration Steps:

1. Deploy new code
2. Run database migrations
3. Configure providers in admin panel
4. Test with test mode enabled
5. Switch to production keys
6. Monitor logs for any issues

## Future Enhancements

- [ ] Add more payment providers (Flutterwave, Stripe)
- [ ] Implement automatic fallback between providers
- [ ] Add payment analytics and reporting
- [ ] Support for recurring subscriptions
- [ ] Multi-currency support
- [ ] Payment routing based on amount, customer location, etc.

## Support

For issues or questions:
- Check logs in `/services/api/logs/`
- Review provider documentation:
  - [Paystack Docs](https://paystack.com/docs)
  - [Hubtel Docs](https://developers.hubtel.com)
- Contact development team

---

**Last Updated:** April 19, 2026
**Version:** 1.0.0
