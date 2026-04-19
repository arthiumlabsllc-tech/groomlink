# Admin Payment Settings - Paystack Integration Guide

## 🎯 Overview

This guide shows you how to add Paystack configuration fields to your existing admin payment settings panel.

---

## ✅ What's Already Done

1. ✅ **TypeScript Types Updated** - `PaymentSettings` interface now includes Paystack fields
2. ✅ **State Management** - `paymentFormData` includes `paystackPublicKey` and `paystackSecretKey`
3. ✅ **Save Handler** - Already saves Paystack fields to backend
4. ✅ **Backend Ready** - SiteSettings table already has Paystack columns

---

## 🔧 Changes Needed in Settings.tsx

### 1. Update Gateway Selection Dropdown (Line 548-554)

**Current:**
```tsx
<select
  value={paymentFormData.paymentGateway}
  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentGateway: e.target.value })}
  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 bg-white"
>
  <option value="hubtel">Hubtel</option>
</select>
<p className="text-xs text-gray-500 mt-1">
  More payment gateways will be available in future updates
</p>
```

**Replace With:**
```tsx
<select
  value={paymentFormData.paymentGateway}
  onChange={(e) => setPaymentFormData({ ...paymentFormData, paymentGateway: e.target.value })}
  className="w-full px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 bg-white"
>
  <option value="hubtel">Hubtel (Mobile Money)</option>
  <option value="paystack">Paystack (Cards + Mobile Money)</option>
</select>
<p className="text-xs text-gray-500 mt-1">
  {paymentFormData.paymentGateway === 'hubtel' 
    ? 'Best for: Mobile Money payments with instant payouts'
    : 'Best for: Card payments, bank transfers, and wider payment support'}
</p>
```

---

### 2. Add Paystack Credentials Section (After Hubtel Fields)

Find where Hubtel credentials end (around line 650) and add this section:

```tsx
{/* Paystack Credentials Section */}
{paymentFormData.paymentGateway === 'paystack' && (
  <div className="mt-6 pt-6 border-t border-gray-200">
    <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2 mb-4">
      <img src="https://paystack.com/favicon.ico" alt="Paystack" className="w-5 h-5" />
      Paystack Configuration
    </h3>

    {/* Paystack Public Key */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 mb-2">
        Public Key
      </label>
      <div className="flex gap-2">
        <input
          type="text"
          value={paymentFormData.paystackPublicKey || ''}
          onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackPublicKey: e.target.value })}
          className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
          placeholder="pk_live_xxxxxxxxxxxxxxxxxxxx"
        />
        <button
          type="button"
          onClick={() => copyToClipboard(paymentFormData.paystackPublicKey || '', 'paystackPublicKey')}
          disabled={!paymentFormData.paystackPublicKey}
          className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Copy to clipboard"
        >
          {copiedField === 'paystackPublicKey' ? (
            <Icon name="check" size={18} className="text-green-500" />
          ) : (
            <Icon name="content_copy" size={18} className="text-gray-400" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Get from: <a href="https://dashboard.paystack.com/#/settings/developers" target="_blank" rel="noopener noreferrer" className="text-[#006B3F] hover:underline">Paystack Dashboard → Settings → API Keys</a>
      </p>
    </div>

    {/* Paystack Secret Key */}
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-600 mb-2">
        Secret Key
      </label>
      <div className="flex gap-2">
        <input
          type={showSecretKey ? 'text' : 'password'}
          value={paymentFormData.paystackSecretKey || ''}
          onChange={(e) => setPaymentFormData({ ...paymentFormData, paystackSecretKey: e.target.value })}
          className="flex-1 px-4 py-3 border-2 border-gray-100 rounded-xl focus:border-[#006B3F] focus:ring-2 focus:ring-[#006B3F]/30 transition-all duration-200 font-mono text-sm"
          placeholder="sk_live_xxxxxxxxxxxxxxxxxxxx"
        />
        <button
          type="button"
          onClick={() => setShowSecretKey(!showSecretKey)}
          className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 transition-colors"
          title={showSecretKey ? 'Hide key' : 'Show key'}
        >
          <Icon name={showSecretKey ? 'visibility_off' : 'visibility'} size={18} className="text-gray-400" />
        </button>
        <button
          type="button"
          onClick={() => copyToClipboard(paymentFormData.paystackSecretKey || '', 'paystackSecretKey')}
          disabled={!paymentFormData.paystackSecretKey}
          className="px-3 py-3 border-2 border-gray-100 rounded-xl hover:bg-gray-50 disabled:opacity-50 transition-colors"
          title="Copy to clipboard"
        >
          {copiedField === 'paystackSecretKey' ? (
            <Icon name="check" size={18} className="text-green-500" />
          ) : (
            <Icon name="content_copy" size={18} className="text-gray-400" />
          )}
        </button>
      </div>
      <p className="text-xs text-gray-500 mt-1">
        Keep this secret! Never expose it in client-side code.
      </p>
    </div>

    {/* Paystack Info Box */}
    <div className="p-4 bg-blue-50 border border-blue-200 rounded-xl">
      <div className="flex items-start gap-3">
        <Icon name="info" size={20} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <div className="text-sm text-blue-800">
          <p className="font-medium mb-1">Paystack Setup Tips:</p>
          <ul className="list-disc list-inside space-y-1 text-xs">
            <li>Enable Mobile Money in your Paystack dashboard for Ghana</li>
            <li>Configure webhook URL: <code className="bg-blue-100 px-1 rounded">https://groomlinkgh.com/api/payments/webhook/paystack</code></li>
            <li>Use test keys (pk_test/sk_test) for development</li>
            <li>Switch to live keys (pk_live/sk_live) when ready for production</li>
          </ul>
        </div>
      </div>
    </div>
  </div>
)}
```

---

### 3. Add Smart Routing Info Box (Optional Enhancement)

Add this after the gateway selection dropdown:

```tsx
{/* Smart Routing Info */}
<div className="p-4 bg-gray-50 border border-gray-200 rounded-xl">
  <h4 className="text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
    <Icon name="smart_toy" size={16} className="text-[#006B3F]" />
    Smart Routing (Automatic)
  </h4>
  <div className="space-y-2 text-xs text-gray-600">
    <div className="flex items-center gap-2">
      <Icon name="check_circle" size={14} className="text-green-500" />
      <span><strong>Cards</strong> → Paystack (better card processing)</span>
    </div>
    <div className="flex items-center gap-2">
      <Icon name="check_circle" size={14} className="text-green-500" />
      <span><strong>Mobile Money</strong> → Hubtel (better Ghana coverage)</span>
    </div>
    <div className="flex items-center gap-2">
      <Icon name="check_circle" size={14} className="text-green-500" />
      <span><strong>Bank Transfers</strong> → Paystack (only option)</span>
    </div>
    <div className="flex items-center gap-2">
      <Icon name="check_circle" size={14} className="text-green-500" />
      <span><strong>MoMo Payouts</strong> → Hubtel (24/7 instant)</span>
    </div>
  </div>
</div>
```

---

## 📋 Complete Field List

### Hubtel Fields (Already Implemented):
- ✅ `hubtelApiId` - Hubtel API ID
- ✅ `hubtelApiSecret` - Hubtel API Secret
- ✅ `hubtelMerchantAccountId` - Hubtel Merchant Account ID

### Paystack Fields (Need UI):
- ⚠️ `paystackPublicKey` - Paystack Public Key (pk_live_xxx or pk_test_xxx)
- ⚠️ `paystackSecretKey` - Paystack Secret Key (sk_live_xxx or sk_test_xxx)

### Common Fields (Already Implemented):
- ✅ `paymentGateway` - Active gateway ('hubtel' or 'paystack')
- ✅ `isPaymentTestMode` - Test/Live mode toggle
- ✅ `transactionFeePercent` - Platform fee percentage

---

## 🎨 UI Layout Recommendation

```
┌─────────────────────────────────────────┐
│  Payment Gateway Settings               │
├─────────────────────────────────────────┤
│                                         │
│  [Test Mode Toggle]  🟢 Test Mode      │
│                                         │
│  Payment Gateway:                       │
│  [▼ Select Gateway                    ] │
│    - Hubtel (Mobile Money)              │
│    - Paystack (Cards + Mobile Money)    │
│                                         │
├─────────────────────────────────────────┤
│  Hubtel Configuration                   │
│  (Shows when Hubtel is selected)        │
│                                         │
│  Client ID: [________________] [Copy]  │
│  Client Secret: [____________] [👁] [Copy] │
│  Merchant Account: [_________] [Copy]  │
├─────────────────────────────────────────┤
│  Paystack Configuration                 │
│  (Shows when Paystack is selected)      │
│                                         │
│  Public Key: [_________________] [Copy] │
│  Secret Key: [_________________] [👁] [Copy] │
│                                         │
│  ℹ️ Paystack Setup Tips:                │
│  - Enable Mobile Money in dashboard     │
│  - Configure webhook URL                │
│  - Use test keys for development        │
├─────────────────────────────────────────┤
│  Smart Routing (Automatic)              │
│  ✓ Cards → Paystack                     │
│  ✓ Mobile Money → Hubtel                │
│  ✓ Bank Transfers → Paystack            │
│  ✓ MoMo Payouts → Hubtel (24/7)        │
├─────────────────────────────────────────┤
│  [Test Connection]  [Save Changes]      │
└─────────────────────────────────────────┘
```

---

## 🔍 Testing Checklist

### 1. Test Hubtel Configuration
- [ ] Enter Hubtel credentials
- [ ] Select "Hubtel" as gateway
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Test connection works

### 2. Test Paystack Configuration
- [ ] Enter Paystack test keys (pk_test/sk_test)
- [ ] Select "Paystack" as gateway
- [ ] Click "Save Changes"
- [ ] Verify success message
- [ ] Switch to test mode
- [ ] Test connection works

### 3. Test Gateway Switching
- [ ] Switch from Hubtel to Paystack
- [ ] Verify UI updates correctly
- [ ] Verify credentials are saved
- [ ] Switch back to Hubtel
- [ ] Verify original settings preserved

### 4. Test Secret Key Visibility
- [ ] Click eye icon to show/hide secret key
- [ ] Verify key is masked by default
- [ ] Verify key shows when toggled

### 5. Test Copy to Clipboard
- [ ] Click copy button for each field
- [ ] Verify success indicator (check icon)
- [ ] Verify key is copied to clipboard

---

## 📝 Environment Variables (Fallback)

Even with admin UI, keep these in `.env` as fallback:

```env
# Hubtel
HUBTEL_API_ID=your_hubtel_api_id
HUBTEL_API_SECRET=your_hubtel_api_secret
HUBTEL_MERCHANT_ACCOUNT_ID=your_hubtel_merchant_account_id

# Paystack
PAYSTACK_PUBLIC_KEY=pk_live_xxxx
PAYSTACK_SECRET_KEY=sk_live_xxxx

# Active Gateway
PAYMENT_GATEWAY=paystack  # or 'hubtel'
```

---

## 🚀 Quick Implementation Steps

1. **Open** `/apps/admin/src/pages/Settings.tsx`
2. **Find** line 548-554 (Gateway Selection dropdown)
3. **Replace** with updated dropdown (Step 1 above)
4. **Find** where Hubtel credentials end (around line 650)
5. **Add** Paystack credentials section (Step 2 above)
6. **Optional:** Add Smart Routing info box (Step 3 above)
7. **Save** and test

---

## 📚 Related Documentation

- **Multi-Provider Guide**: `/services/api/MULTI_PROVIDER_PAYMENT_GUIDE.md`
- **Smart Routing**: `/services/api/SMART_ROUTING_GUIDE.md`
- **Deployment Checklist**: `/services/api/PAYSTACK_DEPLOYMENT_CHECKLIST.md`

---

**Status:** Ready to implement  
**Estimated Time:** 15-20 minutes  
**Difficulty:** Easy (copy-paste with minor adjustments)
