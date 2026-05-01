# Booking Total Calculation - Testing Guide

## Prerequisites
- ✅ API deployed to VPS (booking.service.ts fix included)
- ✅ Customer app running (latest version with price breakdown UI)

## Test Scenarios

### Test 1: Single Customer Booking
**Steps:**
1. Open customer app
2. Browse salons and select any salon
3. Select ONE service (e.g., "Haircut - GH₵ 50.00")
4. Choose date, time, and staff
5. Proceed to payment
6. Complete payment
7. Navigate to confirmation screen

**Expected Results:**
- ✅ Price Breakdown section shows:
  - "1 Service(s) - Primary": GH₵ 50.00
  - "Subtotal": GH₵ 50.00
  - "Total Amount Paid": GH₵ 50.00
- ✅ Total matches the service price exactly

**API Verification:**
```bash
# Check booking in database
curl -s https://groomlinkgh.com/api/bookings/[BOOKING_ID] \
  -H "Authorization: Bearer [TOKEN]" | jq '{totalAmount, finalAmount}'
```

---

### Test 2: Group Booking (Multiple Guests, Same Service)
**Steps:**
1. Open customer app
2. Select salon and primary service (e.g., "Haircut - GH₵ 50.00")
3. Toggle "Add Guests" or "Group Booking"
4. Add 2 guests with the SAME service:
   - Guest 1: "John Doe" - Haircut
   - Guest 2: "Jane Smith" - Haircut
5. Complete booking and payment
6. View confirmation screen

**Expected Results:**
- ✅ Price Breakdown section shows:
  - "1 Service(s) - Primary": GH₵ 50.00
  - "John Doe - Haircut": GH₵ 50.00
  - "Jane Smith - Haircut": GH₵ 50.00
  - "Subtotal": GH₵ 150.00
  - "Total Amount Paid": GH₵ 150.00
- ✅ Total = Primary (50) + Guest 1 (50) + Guest 2 (50) = GH₵ 150.00

**API Verification:**
```bash
# Check booking has correct total
curl -s https://groomlinkgh.com/api/bookings/[BOOKING_ID] \
  -H "Authorization: Bearer [TOKEN]" | jq '{totalAmount, finalAmount, isGroupBooking, guests: .guests[] | {guestName, priceAmount}}'
```

---

### Test 3: Group Booking (Different Services, Different Prices)
**Steps:**
1. Select salon
2. Primary service: "Premium Haircut - GH₵ 80.00"
3. Add guests with DIFFERENT services:
   - Guest 1: "Beard Trim - GH₵ 30.00"
   - Guest 2: "Hair Coloring - GH₵ 120.00"
   - Guest 3: "Hair Wash - GH₵ 40.00"
4. Complete booking
5. View confirmation

**Expected Results:**
- ✅ Price Breakdown shows:
  - "1 Service(s) - Primary": GH₵ 80.00
  - "Guest 1 - Beard Trim": GH₵ 30.00
  - "Guest 2 - Hair Coloring": GH₵ 120.00
  - "Guest 3 - Hair Wash": GH₵ 40.00
  - "Subtotal": GH₵ 270.00
  - "Total Amount Paid": GH₵ 270.00
- ✅ Total = 80 + 30 + 120 + 40 = GH₵ 270.00

---

### Test 4: Booking with Discounted Primary Service
**Steps:**
1. Find salon with discounted service (e.g., "Haircut" original GH₵ 60.00, discount GH₵ 45.00)
2. Book as single customer
3. Complete payment
4. Check confirmation

**Expected Results:**
- ✅ Price Breakdown shows:
  - Primary service at discount price: GH₵ 45.00
  - "Total Amount Paid": GH₵ 45.00
- ✅ Customer pays the discounted price

**API Verification:**
```bash
# Verify discount applied correctly
curl -s https://groomlinkgh.com/api/bookings/[BOOKING_ID] \
  -H "Authorization: Bearer [TOKEN]" | jq '{totalAmount, finalAmount}'
# finalAmount should reflect discount
```

---

### Test 5: Group Booking with Discounted Primary + Regular Guest Services
**Steps:**
1. Primary service: "Premium Cut" - GH₵ 100.00 (discount: GH₵ 75.00)
2. Add 2 guests:
   - Guest 1: "Beard Trim" - GH₵ 35.00 (no discount)
   - Guest 2: "Hair Wash" - GH₵ 40.00 (no discount)
3. Complete booking

**Expected Results:**
- ✅ Price Breakdown:
  - "1 Service(s) - Primary": GH₵ 100.00 (shows original price)
  - "Guest 1 - Beard Trim": GH₵ 35.00
  - "Guest 2 - Hair Wash": GH₵ 40.00
  - "Subtotal": GH₵ 175.00
  - "Total Amount Paid": GH₵ 150.00 (75 + 35 + 40)
- ✅ Note: "Group booking: Total includes all guest services"
- ✅ Guest services don't get discounts, only primary service

**API Verification:**
```bash
# Check finalAmount vs totalAmount
curl -s https://groomlinkgh.com/api/bookings/[BOOKING_ID] \
  -H "Authorization: Bearer [TOKEN]" | jq '{totalAmount, finalAmount}'
# totalAmount = 100 + 35 + 40 = 175
# finalAmount = 75 + 35 + 40 = 150 (discount applied to primary only)
```

---

## Database Verification Queries

```sql
-- Check recent bookings with guest counts
SELECT 
  b.id,
  b."totalAmount",
  b."finalAmount",
  b."isGroupBooking",
  COUNT(bg.id) as guest_count,
  SUM(bg."priceAmount") as guests_total
FROM "Booking" b
LEFT JOIN "BookingGuest" bg ON b.id = bg."bookingId"
WHERE b."createdAt" > NOW() - INTERVAL '1 hour'
GROUP BY b.id
ORDER BY b."createdAt" DESC;

-- Verify individual guest prices
SELECT 
  bg."guestName",
  bg."priceAmount",
  s.name as service_name,
  s.price as service_list_price
FROM "BookingGuest" bg
JOIN "Service" s ON bg."serviceId" = s.id
WHERE bg."bookingId" = '[BOOKING_ID]';
```

---

## Common Issues to Watch For

### ❌ Issue: Total only shows primary service price
**Cause:** API not using updated booking.service.ts
**Fix:** Ensure API container restarted with new code

### ❌ Issue: Guest prices are 0 or null
**Cause:** Service prices not fetched from database
**Fix:** Check booking.service.ts lines 298-306 (guestService query)

### ❌ Issue: Price breakdown not showing on confirmation
**Cause:** Customer app not updated
**Fix:** Rebuild customer app AAB or test on development build

### ❌ Issue: Discount not applied correctly
**Cause:** Logic error in finalAmount calculation
**Fix:** Verify booking.service.ts lines 324-327

---

## Success Criteria

✅ **All tests pass if:**
1. Single bookings show correct total (service price)
2. Group bookings sum all guest services correctly
3. Price breakdown displays all individual costs
4. Discounts apply only to primary service
5. `totalAmount` and `finalAmount` are accurate in database
6. Customer sees transparent pricing before and after payment

---

## Quick API Test (Manual)

```bash
# Test booking creation endpoint
curl -X POST https://groomlinkgh.com/api/bookings \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer [YOUR_TOKEN]" \
  -d '{
    "salonId": "[SALON_ID]",
    "serviceId": "[SERVICE_ID]",
    "dateTime": "2026-04-25T10:00:00Z",
    "staffId": "[STAFF_ID]",
    "guests": [
      {
        "guestName": "Test Guest 1",
        "serviceId": "[SERVICE_ID_2]",
        "priceAmount": 50
      },
      {
        "guestName": "Test Guest 2",
        "serviceId": "[SERVICE_ID_3]",
        "priceAmount": 75
      }
    ]
  }' | jq '{totalAmount, finalAmount, isGroupBooking}'
```

---

**Last Updated:** April 22, 2026
**Fix Version:** booking.service.ts (lines 295-344), BookingConfirmationScreen.tsx (lines 298-360)
