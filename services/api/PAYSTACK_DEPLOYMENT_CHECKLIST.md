# Paystack Multi-Provider Payment System - Deployment Checklist

## Pre-Deployment Tasks

### 1. Database Migration

```bash
cd /home/ubuntu/Desktop/GroomLink/services/api

# Generate migration
npx prisma migrate dev --name add_paystack_multi_provider_support

# Generate Prisma client
npx prisma generate

# Verify migration
npx prisma db pull
```

### 2. Environment Configuration

Add to `.env` file:

```env
# ===== Paystack Configuration =====
PAYSTACK_PUBLIC_KEY=pk_live_xxxx  # Replace with actual key
PAYSTACK_SECRET_KEY=sk_live_xxxx  # Replace with actual key

# Paystack Webhook URL (must be publicly accessible)
PAYSTACK_CALLBACK_URL=https://groomlinkgh.com/api/payments/callback/paystack

# ===== Hubtel Configuration (if still using) =====
HUBTEL_API_ID=your_hubtel_api_id
HUBTEL_API_SECRET=your_hubtel_api_secret
HUBTEL_MERCHANT_ACCOUNT_ID=your_hubtel_merchant_account_id
HUBTEL_PAYMENT_WEBHOOK_URL=https://groomlinkgh.com/api/payments/webhook/hubtel

# ===== Payment Gateway Selection =====
# Options: 'hubtel' or 'paystack'
PAYMENT_GATEWAY=paystack

# Frontend URL for redirects
FRONTEND_URL=https://groomlinkgh.com
API_BASE_URL=https://groomlinkgh.com
```

### 3. Paystack Dashboard Setup

1. **Login to Paystack Dashboard**: https://dashboard.paystack.com

2. **Get API Keys**:
   - Go to Settings → API Keys & Webhooks
   - Copy Public Key and Secret Key
   - Use test keys first (`pk_test_...`, `sk_test_...`)

3. **Configure Webhook**:
   - Go to Settings → API Keys & Webhooks → Webhooks
   - Add webhook URL: `https://groomlinkgh.com/api/payments/webhook/paystack`
   - Click "Save"

4. **Enable Mobile Money** (if not enabled):
   - Contact Paystack support to enable Ghana Mobile Money
   - Verify MTN, Vodafone, AirtelTigo are enabled

5. **Test Mode Setup**:
   - Use test keys for initial deployment
   - Test with test cards: `4084 0808 0808 0808`
   - Switch to live keys after testing

### 4. Admin Panel Configuration

1. **Login to Admin Panel**
2. **Navigate to Settings → Payment Configuration**
3. **Enter Paystack Credentials**:
   - Paystack Public Key
   - Paystack Secret Key
4. **Set Active Gateway**: Select "Paystack"
5. **Save Settings**

## Deployment Steps

### Step 1: Backup Database

```bash
# Create database backup
pg_dump -U postgres groomlink > backup_$(date +%Y%m%d_%H%M%S).sql
```

### Step 2: Deploy Code Changes

```bash
# Navigate to project root
cd /home/ubuntu/Desktop/GroomLink

# Pull latest changes (if using git)
git pull origin main

# Or sync files manually
```

### Step 3: Install Dependencies

```bash
cd services/api

# Install dependencies
pnpm install
```

### Step 4: Run Database Migration

```bash
# Run migration
npx prisma migrate deploy

# Regenerate Prisma client
npx prisma generate
```

### Step 5: Build Application

```bash
# Build TypeScript
pnpm run build
```

### Step 6: Restart API Server

```bash
# If using PM2
pm2 restart api

# Or using systemd
sudo systemctl restart groomlink-api

# Or manually
pm2 start dist/index.js --name api
```

### Step 7: Verify Deployment

```bash
# Check logs
pm2 logs api --lines 100

# Verify payment provider registry initialized
grep "Payment provider registry initialized" ~/.pm2/logs/api-out.log

# Test API endpoint
curl -X GET https://groomlinkgh.com/api/payments/config
```

## Testing Checklist

### 1. Test Mode Testing

- [ ] Configure test keys in `.env`
- [ ] Initialize test payment
- [ ] Complete payment with test card
- [ ] Verify webhook received
- [ ] Check booking status updated to CONFIRMED
- [ ] Verify escrow account created
- [ ] Test payment callback redirect

### 2. Mobile Money Testing

- [ ] Test MTN MoMo payment
- [ ] Test Vodafone Cash payment
- [ ] Test AirtelTigo Money payment
- [ ] Verify payment prompts received on phone
- [ ] Complete payment and verify webhook

### 3. Production Testing (Small Amount)

- [ ] Switch to live keys
- [ ] Create test booking with GHS 1
- [ ] Complete real payment
- [ ] Verify webhook received
- [ ] Check payment recorded in database
- [ ] Verify escrow created
- [ ] Test refund process

### 4. Payout Testing

- [ ] Register salon payout account (bank or MoMo)
- [ ] Process test payout
- [ ] Verify payout received
- [ ] Check escrow status updated

### 5. Error Handling

- [ ] Test failed payment
- [ ] Test declined card
- [ ] Test insufficient funds
- [ ] Test invalid phone number
- [ ] Test webhook signature verification
- [ ] Test duplicate webhook (idempotency)

## Monitoring

### 1. Log Monitoring

```bash
# Monitor API logs
pm2 logs api

# Filter payment-related logs
pm2 logs api | grep -i "paystack\|payment"

# Check for errors
pm2 logs api | grep -i "error"
```

### 2. Database Queries

```sql
-- Check recent payments
SELECT id, provider, status, amount, "paymentGateway", "createdAt"
FROM payments
ORDER BY "createdAt" DESC
LIMIT 20;

-- Check Paystack-specific transactions
SELECT id, "paystackTransactionId", "paystackAccessCode", status
FROM payments
WHERE "paymentGateway" = 'paystack'
ORDER BY "createdAt" DESC
LIMIT 10;

-- Check escrow accounts with Paystack payouts
SELECT id, "payoutGateway", "paystackPayoutReference", status
FROM "escrow_accounts"
WHERE "payoutGateway" = 'paystack'
ORDER BY "updatedAt" DESC
LIMIT 10;
```

### 3. Paystack Dashboard

- Monitor transactions: https://dashboard.paystack.com/transactions
- Check webhook logs: https://dashboard.paystack.com/settings/developers/webhooks
- Review settlements and payouts

## Rollback Plan

If issues occur:

### 1. Switch Back to Hubtel

```bash
# Update .env
PAYMENT_GATEWAY=hubtel

# Restart API
pm2 restart api
```

### 2. Database Rollback

```bash
# Restore from backup
psql -U postgres groomlink < backup_YYYYMMDD_HHMMSS.sql
```

### 3. Code Rollback

```bash
# Revert to previous commit
git checkout <previous-commit-hash>

# Rebuild and restart
cd services/api
pnpm run build
pm2 restart api
```

## Post-Deployment

### 1. Notify Team

- [ ] Inform team about new payment provider
- [ ] Share testing results
- [ ] Document any known issues

### 2. Update Documentation

- [ ] Update API documentation
- [ ] Update user guides
- [ ] Update troubleshooting guides

### 3. Monitor for 48 Hours

- [ ] Watch error rates
- [ ] Monitor successful payment rate
- [ ] Check webhook delivery success
- [ ] Review customer feedback

## Support Contacts

- **Paystack Support**: support@paystack.com
- **Paystack Docs**: https://paystack.com/docs
- **Internal Team**: [Add contact info]

## Success Criteria

- [ ] All payment types working (card, MoMo)
- [ ] Webhooks receiving events successfully
- [ ] Escrow accounts created automatically
- [ ] Payouts processing correctly
- [ ] Error handling working as expected
- [ ] No increase in failed payments
- [ ] Customer feedback positive

---

**Deployment Date:** _______________
**Deployed By:** _______________
**Status:** [ ] Success [ ] Failed [ ] Partial

**Notes:**

