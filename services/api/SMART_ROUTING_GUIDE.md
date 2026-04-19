# Smart Routing Implementation Guide

## 🎯 Overview

The Payment Provider Registry now includes **smart routing** capabilities that automatically select the best payment provider based on the payment method or payout type.

---

## 🧠 Smart Routing Logic

### Payment Method Routing

```typescript
// Cards → Paystack (better card processing)
if (paymentMethod === 'card') {
  return 'paystack';
}

// Mobile Money → Hubtel (better Ghana coverage, 24/7)
if (paymentMethod === 'mobile_money') {
  return 'hubtel'; // Fallback to Paystack if Hubtel unavailable
}

// Bank Transfer → Paystack (only provider with bank support)
if (paymentMethod === 'bank_transfer') {
  return 'paystack';
}
```

### Payout Routing

```typescript
// Mobile Money Payouts → Hubtel (24/7 instant)
if (payoutType === 'mobile_money') {
  return 'hubtel'; // Fallback to Paystack
}

// Bank Payouts → Paystack (only provider with bank transfers)
if (payoutType === 'bank') {
  return 'paystack';
}
```

---

## 📊 Provider Strengths

| Feature | Hubtel | Paystack | Best For |
|---------|--------|----------|----------|
| **Mobile Money (Ghana)** | ✅ Excellent | ✅ Good | Hubtel (better coverage) |
| **Card Payments** | ❌ No | ✅ Excellent | Paystack |
| **Bank Transfers** | ❌ No | ✅ Yes | Paystack |
| **Payout Speed** | 24/7 instant | Business days | Hubtel (MoMo) |
| **Refunds** | ❌ Manual | ✅ Automatic | Paystack |
| **Reliability** | ✅ High | ✅ High | Both |

---

## 💡 Usage Examples

### 1. Initialize Payment with Smart Routing

```typescript
import { paymentProviderRegistry } from './services/payment-provider.registry';

// Customer wants to pay with mobile money
const provider = await paymentProviderRegistry.getProviderForPaymentMethod('mobile_money');

if (provider) {
  const result = await provider.provider.initializePayment({
    amount: 100.00,
    email: 'customer@example.com',
    phoneNumber: '+233541234567',
    reference: 'GL-123456',
    bookingId: 'booking-uuid',
  }, provider.credentials);
  
  // Result: Uses Hubtel (best for mobile money)
}
```

### 2. Initialize Card Payment

```typescript
// Customer wants to pay with card
const provider = await paymentProviderRegistry.getProviderForPaymentMethod('card');

if (provider) {
  const result = await provider.provider.initializePayment({
    amount: 100.00,
    email: 'customer@example.com',
    reference: 'GL-123456',
    bookingId: 'booking-uuid',
    metadata: {
      paymentMethod: 'card',
    },
  }, provider.credentials);
  
  // Result: Uses Paystack (only provider with card support)
}
```

### 3. Process Mobile Money Payout

```typescript
// Salon owner wants MoMo payout (24/7 instant)
const provider = await paymentProviderRegistry.getProviderForPayout('mobile_money');

if (provider) {
  const result = await provider.provider.sendPayout({
    recipient: {
      name: 'Salon Owner',
      payoutType: 'mobile_money',
      mobileMoneyProvider: 'mtn',
      mobileMoneyNumber: '0541234567',
    },
    amount: 100.00,
    reference: 'payout-uuid',
    reason: 'Booking payout',
  }, provider.credentials);
  
  // Result: Uses Hubtel (24/7 instant payouts)
}
```

### 4. Process Bank Payout

```typescript
// Salon owner wants bank transfer
const provider = await paymentProviderRegistry.getProviderForPayout('bank');

if (provider) {
  const result = await provider.provider.sendPayout({
    recipient: {
      name: 'Salon Owner',
      payoutType: 'bank',
      bankCode: '044',
      accountNumber: '1234567890',
      accountName: 'Account Name',
    },
    amount: 500.00,
    reference: 'payout-uuid',
  }, provider.credentials);
  
  // Result: Uses Paystack (only provider with bank transfers)
}
```

---

## 🔧 API Integration

### Updated Payment Controller

```typescript
// controllers/payment.controller.ts

export async function initializePayment(req: AuthenticatedRequest, res: Response): Promise<void> {
  const { bookingId, provider, phoneNumber, paymentMethod } = req.body;
  
  // Use smart routing based on payment method
  const routingResult = await paymentProviderRegistry.getProviderForPaymentMethod(
    paymentMethod || 'mobile_money'
  );
  
  if (!routingResult) {
    errorResponse(res, 'NO_PROVIDER', 'No payment provider available');
    return;
  }
  
  // Use the routed provider
  const result = await routingResult.provider.initializePayment({
    amount: booking.totalAmount,
    email: customer.email,
    phoneNumber,
    reference,
    bookingId,
    metadata: { paymentMethod },
  }, routingResult.credentials);
  
  successResponse(res, result);
}
```

### Updated Payout Service

```typescript
// services/payout.service.ts

export async function processPayout(salonId: string, amount: number, payoutType: 'bank' | 'mobile_money') {
  // Use smart routing for payouts
  const routingResult = await paymentProviderRegistry.getProviderForPayout(payoutType);
  
  if (!routingResult) {
    throw new Error(`No provider available for ${payoutType} payouts`);
  }
  
  const result = await routingResult.provider.sendPayout({
    recipient: salon.payoutDetails,
    amount,
    reference: `payout-${salonId}-${Date.now()}`,
  }, routingResult.credentials);
  
  return result;
}
```

---

## 🎨 Benefits

### 1. **Automatic Optimization**
- Cards always use Paystack (better processing)
- Mobile money uses Hubtel (better Ghana coverage)
- No manual configuration needed

### 2. **Fallback Support**
- If preferred provider is unavailable, automatically uses alternative
- Graceful degradation

### 3. **Performance**
- Mobile money payouts via Hubtel: Instant (24/7)
- Bank payouts via Paystack: Reliable (business days)

### 4. **Cost Optimization**
- Use best provider for each payment type
- Potentially lower fees

### 5. **Reliability**
- Multiple providers for redundancy
- Automatic failover

---

## 📈 Monitoring

### Log Examples

```
[INFO] Smart routing: Using Hubtel for mobile money payment
[INFO] Smart routing: Using Paystack for card payment
[INFO] Smart routing: Using Hubtel for mobile money payout (24/7 instant)
[INFO] Smart routing: Using Paystack for bank payout
[INFO] Smart routing: Using default provider
```

### Database Queries

```sql
-- Check provider usage by payment method
SELECT 
  p."paymentGateway",
  COUNT(*) as total_payments,
  SUM(CASE WHEN p.status = 'SUCCESS' THEN 1 ELSE 0 END) as successful
FROM payments p
GROUP BY p."paymentGateway";

-- Check payout success rate by provider
SELECT 
  e."payoutGateway",
  COUNT(*) as total_payouts,
  SUM(CASE WHEN e.status = 'released' THEN 1 ELSE 0 END) as successful
FROM escrow_accounts e
WHERE e."payoutGateway" IS NOT NULL
GROUP BY e."payoutGateway";
```

---

## ⚙️ Configuration

### Admin Settings

```sql
-- Set active providers
UPDATE "SiteSettings" SET
  "paymentGateway" = 'paystack', -- Default gateway
  "paystackPublicKey" = 'pk_live_xxx',
  "paystackSecretKey" = 'sk_live_xxx',
  "hubtelApiId" = 'your_api_id',
  "hubtelApiSecret" = 'your_api_secret',
  "hubtelMerchantAccountId" = 'your_merchant_id'
WHERE id = 'default';
```

### Environment Variables (Fallback)

```env
PAYMENT_GATEWAY=paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxx
PAYSTACK_SECRET_KEY=sk_live_xxx
HUBTEL_API_ID=your_api_id
HUBTEL_API_SECRET=your_api_secret
HUBTEL_MERCHANT_ACCOUNT_ID=your_merchant_id
```

---

## 🚀 Advanced: Custom Routing Rules

You can implement custom routing logic by extending the registry:

```typescript
// Example: Route based on amount
async getProviderForAmount(amount: number): Promise<ProviderResult | null> {
  if (amount > 1000) {
    // High-value transactions: Use Paystack (better security)
    return this.getProvider('paystack');
  }
  
  // Low-value: Use Hubtel (lower fees)
  return this.getProvider('hubtel');
}

// Example: Route based on time
async getProviderForTime(): Promise<ProviderResult | null> {
  const hour = new Date().getHours();
  
  if (hour >= 9 && hour <= 17) {
    // Business hours: Both providers available
    return this.getActiveProvider();
  }
  
  // After hours: Prefer Hubtel (24/7)
  return this.getProvider('hubtel');
}
```

---

## 📝 Best Practices

### 1. **Always Use Smart Routing**
```typescript
// ✅ Good
const provider = await paymentProviderRegistry.getProviderForPaymentMethod('mobile_money');

// ❌ Bad
const provider = await paymentProviderRegistry.getProvider('hubtel');
```

### 2. **Handle Null Cases**
```typescript
const provider = await paymentProviderRegistry.getProviderForPaymentMethod('card');

if (!provider) {
  // No provider available
  return errorResponse(res, 'NO_PROVIDER', 'Payment not available');
}
```

### 3. **Log Provider Selection**
```typescript
logger.info('Payment initialized', {
  provider: provider.name,
  paymentMethod: 'mobile_money',
  amount: 100.00,
});
```

### 4. **Monitor Routing Decisions**
```sql
-- Check routing effectiveness
SELECT 
  "paymentGateway",
  AVG(amount) as avg_amount,
  COUNT(*) FILTER (WHERE status = 'SUCCESS') * 100.0 / COUNT(*) as success_rate
FROM payments
GROUP BY "paymentGateway";
```

---

## 🔮 Future Enhancements

- [ ] A/B testing for providers
- [ ] Dynamic routing based on success rates
- [ ] Geographic routing (different providers by region)
- [ ] Load balancing between providers
- [ ] Cost-based routing (lowest fees)
- [ ] Customer preference storage

---

## 📚 Related Documentation

- **Multi-Provider Guide**: `MULTI_PROVIDER_PAYMENT_GUIDE.md`
- **Quick Reference**: `PAYSTACK_QUICK_REFERENCE.md`
- **Deployment Checklist**: `PAYSTACK_DEPLOYMENT_CHECKLIST.md`
- **Implementation Comparison**: `IMPLEMENTATION_COMPARISON.md`

---

**Last Updated:** April 19, 2026
**Version:** 2.0.0 (with Smart Routing)
