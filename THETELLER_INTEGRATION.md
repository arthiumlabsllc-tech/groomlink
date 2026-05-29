# TheTeller Payment Provider Integration

## Overview

TheTeller has been successfully integrated as the **third payment provider** for GroomLink Ghana, alongside Hubtel and Paystack.

## Features

### ✅ Payment Methods Supported
- **Mobile Money**: MTN MoMo, Vodafone Cash, AirtelTigo Money, G-Money
- **Card Payments**: Visa, Mastercard, UnionPay, Tela
- **Currency**: GHS (Ghana Cedis)

### ✅ Integration Points
- Web checkout (redirect-based)
- Webhook notifications
- Payment verification API
- Admin dashboard configuration

## Architecture

### Payment Provider Hierarchy
```
1. Paystack (Primary for cards)
   - Cards: ✅
   - Mobile Money: ✅
   - Bank Transfer: ✅
   - Payouts: ✅

2. Hubtel (Primary for mobile money)
   - Cards: ❌
   - Mobile Money: ✅ (Push notifications)
   - Payouts: ✅ (Instant 24/7)

3. TheTeller (NEW - Third provider)
   - Cards: ✅ (Visa, Mastercard, UnionPay, Tela)
   - Mobile Money: ✅ (All networks + G-Money)
   - Payouts: ❌ (Not supported)
```

### Smart Routing Logic

```typescript
// Card payments
if (paymentMethod === 'card') {
  return Paystack; // Primary
  // Fallback: TheTeller
}

// Mobile money
if (paymentMethod === 'mobile_money') {
  return ActiveProvider; // Admin-selected
  // Fallback: Hubtel → TheTeller → Paystack
}

// Bank transfers
if (paymentMethod === 'bank_transfer') {
  return Paystack; // Only provider
}
```

## Files Modified

### Backend (API)
1. **`services/api/prisma/schema.prisma`**
   - Added `THETELLER` to `PaymentProvider` enum
   - Added `thetellerApiKey`, `thetellerApiUser`, `thetellerMerchantId` to `SiteSettings`

2. **`services/api/src/services/theteller.provider.ts`** (NEW)
   - Full implementation of `IPaymentProvider` interface
   - Payment initialization (Standard Checkout)
   - Payment verification
   - Webhook handling
   - Refund handling (manual via dashboard)

3. **`services/api/src/services/payment-provider.registry.ts`**
   - Registered TheTeller provider
   - Updated smart routing logic
   - Updated fallback chains

4. **`services/api/src/services/payment.service.ts`**
   - Added `handleTheTellerWebhook()` function
   - Webhook processing and payment completion

5. **`services/api/src/controllers/payment.controller.ts`**
   - Added `handleTheTellerWebhook()` endpoint
   - Added `handleTheTellerCallback()` endpoint

6. **`services/api/src/routes/payment.routes.ts`**
   - Added `/webhook/theteller` route
   - Added `/callback/theteller` routes (GET/POST)

## Configuration

### Admin Dashboard Settings

Navigate to: **Admin Dashboard → Settings → Payment Settings**

Add your TheTeller credentials:
- **API Key**: Your merchant API key
- **API User**: Your merchant API username
- **Merchant ID**: Your merchant ID

### Environment Variables (Optional)

```env
THETELLER_API_KEY=your_api_key
THETELLER_API_USER=your_api_user
THETELLER_MERCHANT_ID=your_merchant_id
THETELLER_TEST_MODE=true  # Set to false for production
THETELLER_WEBHOOK_URL=https://groomlinkgh.com/api/payments/webhook/theteller
```

## API Endpoints

### Webhook
```
POST /api/payments/webhook/theteller
```
- Receives payment notifications from TheTeller
- No authentication required (public endpoint)
- TheTeller sends: `transaction_id`, `status`, `code`, `reason`

### Callback
```
GET/POST /api/payments/callback/theteller
```
- Redirect endpoint after payment completion
- Parameters: `transaction_id`, `status`, `code`, `reason`
- Redirects to frontend payment callback page

## Testing

### 1. Test Environment

TheTeller provides a test environment:
- **Test API**: `https://test.theteller.net`
- **Test Checkout**: `https://checkout-test.theteller.net`

### 2. Test Credentials

Sign up at https://theteller.net to get test credentials:
- Test API Key
- Test API User
- Test Merchant ID

### 3. Test Payment Flow

1. Enable test mode in admin dashboard
2. Add TheTeller test credentials
3. Create a booking
4. Select TheTeller as payment provider
5. Complete payment with test card/mobile money
6. Verify webhook is received
7. Check payment status updated to "COMPLETED"

### 4. Test Cards

TheTeller documentation provides test card numbers for different scenarios.

## Deployment

### Deploy to VPS

```bash
python deploy_theteller_provider.py
```

This script will:
1. Upload all TheTeller-related files
2. Run Prisma database migration
3. Rebuild API Docker container
4. Verify deployment

### Verify Deployment

```bash
# Check API health
curl https://groomlinkgh.com/api/health

# Check payment config
curl https://groomlinkgh.com/api/payments/config

# Check container status
ssh root@187.124.210.205
docker ps | grep api
```

## Troubleshooting

### Issue: "TheTeller not configured"
**Solution**: Add credentials in admin dashboard or set environment variables

### Issue: Webhook not received
**Solution**: 
1. Check webhook URL is accessible: `https://groomlinkgh.com/api/payments/webhook/theteller`
2. Verify firewall allows incoming requests
3. Check API logs: `docker logs groomlink-api`

### Issue: Payment verification fails
**Solution**:
1. Verify transaction_id matches exactly (12 digits)
2. Check TheTeller API credentials are correct
3. Test with TheTeller's API directly using Postman

### Issue: Mobile money payment fails
**Solution**:
1. Ensure phone number format is correct (+233XXXXXXXXX)
2. Verify customer has sufficient balance
3. Check TheTeller supports the specific mobile network

## Comparison with Other Providers

| Feature | Hubtel | Paystack | TheTeller |
|---------|--------|----------|-----------|
| **Mobile Money** | ✅ Push | ✅ Redirect | ✅ Auto-detect |
| **Cards** | ❌ | ✅ | ✅ |
| **Bank Transfer** | ❌ | ✅ | ❌ |
| **Payouts** | ✅ 24/7 | ✅ Weekdays | ❌ |
| **Webhooks** | ✅ | ✅ | ✅ |
| **Inline Checkout** | ❌ | ✅ | ❌ |
| **G-Money** | ❌ | ❌ | ✅ |
| **UnionPay** | ❌ | ❌ | ✅ |
| **Tela** | ❌ | ❌ | ✅ |

## Pricing

TheTeller charges:
- **1.5% - 3%** per transaction (negotiable)
- No setup fees
- Competitive with Paystack and Hubtel

## Security

- Uses Basic Authentication (API Key + API User)
- Webhook signature verification not provided by TheTeller
- Security handled via API verification of transaction status
- All communication over HTTPS

## Support

- **TheTeller Support**: https://theteller.net/contact
- **Documentation**: https://theteller.net/documentation
- **Email**: support@theteller.net

## Rollback Plan

If issues occur:

1. **Disable TheTeller in admin dashboard**
   - Switch active gateway back to Paystack or Hubtel

2. **Rollback deployment**
   ```bash
   ssh root@187.124.210.205
   cd /opt/groomlink
   git log --oneline  # Find commit before TheTeller
   git revert <commit-hash>
   docker-compose -f docker-compose.prod.yml build api
   docker-compose -f docker-compose.prod.yml up -d api
   ```

3. **Database rollback** (if needed)
   ```bash
   cd /opt/groomlink/services/api
   npx prisma migrate resolve --rolled-back <migration-name>
   ```

## Future Enhancements

- [ ] Add TheTeller inline JS checkout for web
- [ ] Implement TheTeller mobile SDK for mobile apps
- [ ] Add automatic refund support (if API becomes available)
- [ ] Add payout support (if API becomes available)
- [ ] Negotiate better rates based on transaction volume

## Summary

✅ **TheTeller is now fully integrated** as your third payment provider!

**Benefits:**
- More payment options for customers
- Support for additional card types (UnionPay, Tela)
- Support for G-Money
- Competitive pricing
- Fallback option if other providers fail

**Next Steps:**
1. Sign up at https://theteller.net
2. Get your API credentials
3. Add credentials in admin dashboard
4. Test with test environment
5. Go live when ready

---

**Integration Date**: May 15, 2026  
**Status**: ✅ Ready for Testing  
**Deployment**: Not yet deployed (run `python deploy_theteller_provider.py`)
