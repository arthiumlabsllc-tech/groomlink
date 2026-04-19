# Paystack Implementation Quick Reference

## 🎯 Key Implementation Details

### Mobile Money Bank Codes (Ghana)

```typescript
// Correct Paystack Ghana mobile money codes
const providerMap = {
  mtn: 'MTN',           // MTN Mobile Money
  vod: 'VOD-MOMO',      // Vodafone Cash
  vodafone: 'VOD-MOMO', // Alternative name
  tgo: 'ATL-MOMO',      // AirtelTigo Money
  airteltigo: 'ATL-MOMO' // Alternative name
};
```

### Payment Channels

```typescript
// Available Paystack payment channels
channels: ['card', 'mobile_money', 'bank_transfer', 'ussd', 'qr']

// Examples:
// Card only
channels: ['card']

// Mobile money only
channels: ['mobile_money']

// Multiple options (recommended)
channels: ['mobile_money', 'card']
```

### Amount Conversion

```typescript
// IMPORTANT: Paystack expects amount in pesewas (GHS * 100)
const amountInGHS = 100; // GHS 100.00
const amountInPesewas = Math.round(amountInGHS * 100); // 10000 pesewas

// Always convert back when receiving from Paystack
const amountReceived = transaction.amount / 100; // Convert to GHS
```

## 📋 Common Use Cases

### 1. Initialize Mobile Money Payment

```typescript
import { initializePayment } from './services/payment.service';

const result = await initializePayment(userId, {
  bookingId: 'booking-uuid',
  provider: PaymentProvider.MTN_MOMO,
  phoneNumber: '+233541234567',
});

// Result
{
  success: true,
  reference: 'GL-1234567890-abc123',
  redirectUrl: 'https://checkout.paystack.com/...',
  accessCode: 'abc123',
  message: 'Payment initialized...'
}
```

### 2. Initialize Card Payment

```typescript
// Customer will enter card details on Paystack checkout
const result = await initializePayment(userId, {
  bookingId: 'booking-uuid',
  provider: PaymentProvider.MTN_MOMO, // Provider doesn't matter for card
  phoneNumber: '+233541234567',
});

// Metadata can specify preferred channel
metadata: {
  paymentMethod: 'card' // Forces card-only channel
}
```

### 3. Verify Payment

```typescript
import { verifyAndCompletePayment } from './services/payment.service';

const result = await verifyAndCompletePayment(paymentId, reference);

if (result.success) {
  // Payment verified
  // Booking status = CONFIRMED
  // Escrow account created
  // Notifications sent
}
```

### 4. Register Payout Recipient (Bank)

```typescript
import { paymentProviderRegistry } from './services/payment-provider.registry';

const paystack = await paymentProviderRegistry.getProvider('paystack');

const result = await paystack.provider.registerRecipient({
  name: 'John Doe',
  payoutType: 'bank',
  bankCode: '044', // Fidelity Bank
  accountNumber: '1234567890',
  accountName: 'John Doe',
}, paystack.credentials);

// Result
{
  success: true,
  recipientCode: 'RCP_abc123',
  message: 'Payout recipient registered successfully'
}
```

### 5. Register Payout Recipient (Mobile Money)

```typescript
const result = await paystack.provider.registerRecipient({
  name: 'John Doe',
  payoutType: 'mobile_money',
  mobileMoneyProvider: 'mtn', // 'mtn', 'vod', 'tgo'
  mobileMoneyNumber: '0541234567',
}, paystack.credentials);

// Uses correct bank code: 'MTN' for MTN MoMo
```

### 6. Send Payout

```typescript
const payoutResult = await paystack.provider.sendPayout({
  recipient: {
    name: 'John Doe',
    payoutType: 'bank',
    recipientCode: 'RCP_abc123', // From registration
  },
  amount: 100.00, // GHS
  reference: 'payout-uuid',
  reason: 'Booking payout #12345',
}, paystack.credentials);

// Result
{
  success: true,
  payoutReference: 'TRF_abc123',
  recipientCode: 'RCP_abc123',
  message: 'Payout sent successfully'
}
```

### 7. Process Refund

```typescript
const refundResult = await paystack.provider.processRefund({
  transactionReference: 'GL-1234567890-abc123',
  amount: 50.00, // Partial refund (or full amount)
  reason: 'Customer cancelled booking',
}, paystack.credentials);

// Result
{
  success: true,
  refundReference: 'RFD_abc123',
  refundedAmount: 50.00,
  message: 'Refund processed successfully'
}
```

## 🔧 Provider Configuration

### Option 1: Environment Variables

```env
# Paystack credentials
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_SECRET_KEY=sk_live_xxxx

# Active gateway
PAYMENT_GATEWAY=paystack

# Callback URLs
PAYSTACK_CALLBACK_URL=https://groomlinkgh.com/api/payments/callback/paystack
```

### Option 2: Database (SiteSettings)

```sql
UPDATE "SiteSettings" SET
  "paymentGateway" = 'paystack',
  "paystackPublicKey" = 'pk_live_xxxx',
  "paystackSecretKey" = 'sk_live_xxxx'
WHERE id = 'default';
```

## 🎨 Webhook Events

### Events Handled

```typescript
case 'charge.success':
  // Payment successful
  // Auto-verifies and completes booking

case 'transfer.success':
  // Payout successful
  // Updates escrow status

case 'transfer.failed':
  // Payout failed
  // Logs error for manual review

case 'refund.processed':
  // Refund completed
  // Updates payment status
```

### Webhook Verification

```typescript
// Paystack sends HMAC SHA512 signature
const signature = headers['x-paystack-signature'];

// Verify signature
const hash = crypto
  .createHmac('sha512', secretKey)
  .update(rawBody)
  .digest('hex');

return hash === signature;
```

## 📊 Test Cards

```typescript
// Paystack test cards (use in test mode)
const testCards = {
  success: '4084 0808 0808 0808',
  decline: '4084 0808 0808 0809',
  insufficientFunds: '4084 0808 0808 0810',
  requiresOtp: '4084 0808 0808 0811',
};

// Test CVV: Any 3 digits
// Test Expiry: Any future date
```

## 🚨 Error Handling

### Common Errors

```typescript
// Invalid credentials
{
  success: false,
  message: 'Invalid key'
}

// Insufficient balance (for payouts)
{
  success: false,
  message: 'Insufficient balance'
}

// Invalid recipient
{
  success: false,
  message: 'Invalid account number'
}

// Duplicate reference
{
  success: false,
  message: 'Duplicate reference'
}
```

### Error Handling Pattern

```typescript
try {
  const result = await initializePayment(userId, data);
  
  if (!result.success) {
    // Handle payment failure
    logger.error('Payment failed', { message: result.message });
    return errorResponse(res, 'PAYMENT_FAILED', result.message);
  }
  
  // Success
  return successResponse(res, result);
} catch (error) {
  // Unexpected error
  logger.error('Payment error', { error });
  return errorResponse(res, 'PAYMENT_ERROR', 'Internal server error');
}
```

## 🔍 Database Queries

### Check Payment by Provider

```sql
-- All Paystack payments
SELECT 
  id, 
  status, 
  amount, 
  "paymentGateway",
  "paystackTransactionId",
  "createdAt"
FROM payments
WHERE "paymentGateway" = 'paystack'
ORDER BY "createdAt" DESC
LIMIT 20;
```

### Success Rate by Provider

```sql
SELECT 
  "paymentGateway",
  COUNT(*) as total,
  SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) as successful,
  ROUND(
    100.0 * SUM(CASE WHEN status = 'SUCCESS' THEN 1 ELSE 0 END) / COUNT(*),
    2
  ) as success_rate
FROM payments
WHERE "paymentGateway" IS NOT NULL
GROUP BY "paymentGateway";
```

### Payout Status

```sql
SELECT 
  id,
  "payoutGateway",
  "paystackPayoutReference",
  status,
  "amountHeld",
  "releasedAt"
FROM escrow_accounts
WHERE "payoutGateway" = 'paystack'
ORDER BY "updatedAt" DESC
LIMIT 20;
```

## 📝 Important Notes

### ⚠️ Paystack Limitations

1. **Redirect-Based Flow**
   - Customers leave your site to complete payment
   - Returns via callback_url after payment

2. **Transfer Timing**
   - Bank transfers: Business days only
   - Mobile money: Usually instant
   - Consider Hubtel for instant payouts if needed

3. **Test Mode**
   - Use test keys for development
   - Test transactions don't cost money
   - Webhooks work in test mode

4. **Currency**
   - Always use GHS (Ghanaian Cedi)
   - Amounts in API are in pesewas (GHS * 100)

### ✅ Best Practices

1. **Always verify payments via webhook**
   - Don't rely solely on callback redirect
   - Webhooks are more reliable

2. **Store provider references**
   - Keep `paystackTransactionId` for refunds
   - Keep `recipientCode` for payouts

3. **Handle idempotency**
   - Webhooks may be sent multiple times
   - Check payment status before processing

4. **Log everything**
   - Payment initialization
   - Verification results
   - Webhook events
   - Errors and failures

## 🔗 Useful Links

- **Paystack Docs**: https://paystack.com/docs
- **Paystack API Reference**: https://paystack.com/docs/api
- **Ghana Mobile Money**: https://paystack.com/docs/guides/mobile-money/ghana
- **Transfer Recipients**: https://paystack.com/docs/api/transferrecipient/
- **Transfers**: https://paystack.com/docs/api/transfer/
- **Test Cards**: https://paystack.com/docs/test-cards/

---

**Last Updated:** April 19, 2026
**Version:** 1.0.0
