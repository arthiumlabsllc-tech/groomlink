# GroomLink Ghana — Platform Documentation

**Version:** 1.0.0 | **Last Updated:** June 2026 | **Company:** Arthium Labs LLC

---

## 1. Platform Overview

GroomLink Ghana is a full-stack booking platform connecting customers with barbershops, salons, and freelance stylists across Ghana. The platform supports both physical salon visits and home-service (freelancer) bookings, with integrated payments via Paystack (card & Mobile Money), an escrow system, real-time queue management, and QR code check-in.

### Architecture

- **Monorepo** managed with **pnpm workspaces**
- **Backend:** Node.js + Express + Prisma ORM + PostgreSQL
- **Mobile Apps:** React Native with Expo SDK 53
- **Web Apps:** React + Vite + Tailwind CSS
- **Infrastructure:** Docker + Nginx on VPS, EAS Build for mobile
- **CI/CD:** GitHub Actions (deploy to production)

---

## 2. Mobile Applications

### 2.1 Customer Mobile App (iOS & Android)

**Tech:** React Native + Expo SDK 53 | **Package:** `com.arthiumlabsllc.groomlink`

#### Authentication
| Screen | Description |
|--------|-------------|
| Welcome Screen | First-time user landing with login/register options |
| Email Screen | Email input for OTP-based authentication |
| OTP Screen | 6-digit OTP verification sent to email |
| Profile Setup | Complete profile (name, phone, avatar) after first login |

#### Main Tabs (Bottom Navigation)
| Tab | Screen | Description |
|-----|--------|-------------|
| Home | HomeScreen | Featured salons, popular categories, nearby recommendations, promotions |
| Search | SearchScreen | Search salons by name, service, or location with filters |
| Map | MapScreen | Interactive Google Maps showing nearby salons with distance and ratings |
| Bookings | BookingsScreen | Upcoming & past bookings with status tracking (Pending/Confirmed/Completed) |
| Profile | ProfileScreen | User profile, settings, notifications preferences |

#### Booking Flow
| Screen | Description |
|--------|-------------|
| SalonDetailScreen | Full salon profile — services, staff, reviews, gallery, booking CTA |
| BookingScreen | Service selection, staff picker, date/time, group booking support |
| BookingConfirmationScreen | Booking summary with payment method selection |
| PaymentProcessingScreen | Real-time payment status (Paystack card/MoMo processing) |

#### Post-Booking
| Screen | Description |
|--------|-------------|
| BookingDetailScreen | Full booking details, queue position, cancellation, rescheduling |
| BookingQRCodeScreen | QR code + manual check-in code for salon check-in |
| RateBookingScreen | Star rating + review comment after service completion |

#### Other Screens
| Screen | Description |
|--------|-------------|
| NotificationsScreen | Push notifications for booking updates, promotions |
| PlatformFeedbackScreen | Submit feedback/issues to platform support |
| ChatScreen | Real-time live chat with customer support |
| SafeMapScreen | Graceful fallback UI when Google Maps fails to load |

#### Key Features
- **Google Maps integration** with nearby salon discovery and directions
- **QR code check-in** — customer shows QR, partner scans to check in
- **Group bookings** — book multiple people with individual service assignments
- **Reschedule with price detection** — alerts customer if service prices changed
- **One-click cancellation** with refund preview showing percentage available
- **Push notifications** for booking status changes, reminders, and promotions
- **Live chat support** with real-time messaging
- **Dark/Light mode** adaptive theme

---

### 2.2 Partners Mobile App (iOS & Android)

**Tech:** React Native + Expo SDK 53 | **Package:** `com.arthiumlabs.groomlinkpartners`

#### Authentication & Onboarding
| Screen | Description |
|--------|-------------|
| Email Screen | Email-based OTP authentication |
| OTP Screen | 6-digit email OTP verification |
| ProviderCategoryScreen | Select business type: Salon/Barbershop or Freelance Stylist |
| ProfileSetupScreen | Owner profile setup (name, phone) |
| SalonSetupScreen | Business registration — name, address, hours, services, photos, amenities |

#### Dashboard & Management
| Screen | Description |
|--------|-------------|
| DashboardScreen | Revenue stats, today's bookings, queue overview, quick actions |
| BookingsScreen | All salon bookings filtered by date and status |
| BookingDetailScreen | Full booking details with confirm/check-in/complete/cancel actions |
| QueueScreen | Live queue management — checked-in customers, positions, wait times |

#### Business Operations
| Screen | Description |
|--------|-------------|
| ServicesScreen | Manage service menu — add/edit/remove services with pricing |
| AddServiceScreen | Create new service with name, price, duration, category |
| StaffScreen | Manage staff/workers — add/edit/deactivate |
| AddStaffScreen | Add new staff member with specialty and service assignments |
| EditSalonScreen | Edit business details, hours, photos, amenities |
| PricingScreen | View and adjust service pricing and promotions |
| CompletionSettingsScreen | Configure auto-completion and service completion preferences |

#### Check-In & Scanner
| Screen | Description |
|--------|-------------|
| QRScannerScreen | Camera-based QR scanner to check in customers + manual code entry fallback |

#### Financial
| Screen | Description |
|--------|-------------|
| RequestPayoutScreen | Request payout of earnings from escrow to bank/MoMo |

#### Other Screens
| Screen | Description |
|--------|-------------|
| ProfileScreen | Owner profile, business settings, account management, delete account (GDPR) |
| NotificationsListScreen | Booking notifications, payment alerts, platform announcements |
| PlatformFeedbackScreen | Submit feedback to platform team |
| ChatScreen | Real-time support chat with platform team |

#### Key Features
- **QR code scanner** with camera + manual code entry for customer check-in
- **Queue management** with real-time position tracking and wait time estimates
- **Staff management** with service assignments and performance tracking
- **Service catalog** with pricing, categories, discounts, and promo labels
- **Earnings dashboard** with payout request functionality
- **Booking lifecycle** — confirm → check-in → complete → payout
- **One-click refund** — refund customer to original payment method
- **Freelancer support** — home-service mode with auto-start timer on QR check-in
- **Dark/Light mode** adaptive theme
- **GDPR account deletion** with data cleanup

---

## 3. Web Applications

### 3.1 Landing Page

**Tech:** React + Vite + Tailwind CSS | **URL:** groomlinkgh.com

#### Pages
| Page | Description |
|------|-------------|
| Home (MobileHome) | Hero section, how it works, nearby salons, testimonials, FAQ, city discovery |
| Explore | Browse all salons with search, filters, and map view |
| SalonDetail | Full salon profile with services, reviews, gallery, booking CTA |
| About | Company story, mission, team information |
| PartnerWithUs | CTA page for salon owners to join the platform |
| Download | App download links for iOS and Android |
| Support | Help center with FAQ, contact form |
| PrivacyPolicy | GDPR-compliant privacy policy |
| TermsOfService | Platform terms and conditions |
| DataDeletion | GDPR data deletion request page |
| ComingSoon | Placeholder for upcoming features |

#### Components
- **ChatWidget** — Embedded live chat for visitor inquiries
- **LocationPicker** — Interactive map for selecting city/area
- **SearchBox** — Search salons by name, service type, or location
- **NearbySalons** — Location-based salon recommendations
- **CategoryIcons** — Visual service category navigation
- **Testimonials** — Customer reviews and ratings
- **TrustBadges** — Security and payment trust indicators
- **RoleSelectorModal** — Choose between customer or partner registration

#### Key Features
- **Responsive design** — mobile-first with desktop optimization
- **Dark/Light mode** with system preference detection
- **SEO optimized** with proper meta tags and structured data
- **Live chat widget** for visitor engagement
- **City discovery** — explore salons across different Ghanaian cities

---

### 3.2 Customer Web App

**Tech:** React + Vite + Tailwind CSS

#### Pages
| Page | Description |
|------|-------------|
| Dashboard | Welcome screen with quick booking, recent bookings, favorites |
| Explore | Browse salons with advanced filters (location, rating, price, services) |
| SalonDetail | Full salon profile with service menu, staff, reviews, booking |
| BookSalon | Multi-step booking — service selection, staff, date/time, payment |
| Bookings | All bookings (upcoming/past) with status, details, actions |
| Favorites | Saved salons for quick rebooking |
| Profile | Account settings, notification preferences |
| ProfileSetup | Initial profile completion after registration |
| Rewards | Loyalty program with points and rewards |
| Notifications | Booking updates, promotions, reminders |
| Onboarding | First-time user guided tour |
| PaymentCallback | Paystack payment redirect handler |
| Login | Email OTP authentication |

#### Key Features
- **Full booking workflow** — browse, book, pay, track, review
- **Google Maps integration** for salon discovery
- **Paystack payments** — card and Mobile Money
- **Favorites system** for saving preferred salons
- **Loyalty rewards** program
- **Real-time booking status** updates
- **Responsive design** for mobile and desktop

---

### 3.3 Admin Dashboard

**Tech:** React + Vite + Tailwind CSS

#### Pages
| Page | Description |
|------|-------------|
| Dashboard | Platform-wide analytics — revenue, bookings, users, salons, growth charts |
| Users | Manage all platform users (customers & partners) with role management |
| Salons | Salon approval/rejection, suspension, featured status management |
| Transactions | All payment transactions with status, refund capabilities |
| Cancellations | Track and manage booking cancellations |
| NoShows | No-show tracking and dispute resolution |
| Escrow | Escrow account management — held/released/refunded amounts |
| Promotions | Create and manage promotional campaigns |
| SponsoredSalons | Manage paid salon placements and sponsorships |
| SubscriptionOverview | Subscription tier overview and analytics |
| SubscriptionPlans | Configure subscription tiers and pricing |
| SubscriptionInvoices | Invoice management and payment tracking |
| Settings | Platform configuration — payment gateway, site settings, email templates |
| Security | Security audit logs, IP management, access controls |
| Policies | Platform policies and terms management |
| Feedback | User-submitted platform feedback review |
| Support | Support ticket overview and management |
| SupportStaff | Manage support team members and permissions |
| AdminManagement | Admin user management with role-based access |
| Login | Admin authentication |
| AccessDenied | Unauthorized access page |

#### Key Features
- **Payment gateway configuration** — switch between Paystack/Hubtel/TheTeller from settings
- **Salon approval workflow** — review and approve new salon registrations
- **Featured salon management** — promote salons for paid placement
- **Subscription management** — tiered pricing for salon subscriptions
- **User management** with role-based access control
- **Escrow oversight** — monitor all held/released/refunded payments
- **Analytics dashboard** with revenue, booking, and user growth charts
- **Security audit logging** for admin actions

---

### 3.4 Support Dashboard

**Tech:** React + Vite + Tailwind CSS

#### Pages
| Page | Description |
|------|-------------|
| Dashboard | Support metrics — open tickets, response times, agent performance |
| LiveChat | Real-time chat interface with customers and partners |
| Tickets | Support ticket management with status tracking and assignment |
| Customers | Customer account lookup and history |
| Salons | Salon account lookup and booking history |
| Users | Support user management |
| Settings | Support configuration and canned responses |
| Login | Support agent authentication |

#### Key Features
- **Real-time live chat** with customers and partners
- **Ticket management** with priority, status, and assignment
- **Customer lookup** with full booking and payment history
- **Dark/Light mode** support
- **Role-based access** for support agents vs. managers

---

### 3.5 Partners Web App

**Tech:** React + Vite + Tailwind CSS

#### Pages
| Page | Description |
|------|-------------|
| Dashboard | Business overview — revenue, bookings, queue status |
| Bookings | Manage all salon bookings |
| Queue | Live customer queue with check-in status |
| Services | Service catalog management |
| Staff | Staff management and assignments |
| Profile | Business profile and settings |
| Earnings | Revenue analytics and payout requests |

---

## 4. Backend API

**Tech:** Node.js + Express + Prisma + PostgreSQL | **Base URL:** groomlinkgh.com/api

### API Modules

| Module | Endpoints | Description |
|--------|-----------|-------------|
| Auth | `/auth/*` | Email OTP login, registration, token refresh |
| Bookings | `/bookings/*` | Create, confirm, cancel, reschedule, check-in, complete |
| Payments | `/payments/*` | Initialize, verify, webhook handlers (Paystack/Hubtel/TheTeller) |
| Salons | `/salons/*` | CRUD operations, search, nearby discovery |
| Salon Owner | `/salon-owner/*` | Owner-specific booking management, earnings |
| Queue | `/queue/*` | Queue position, service timer, floor management |
| Reviews | `/reviews/*` | Rating and review management |
| Notifications | `/notifications/*` | Push and in-app notification delivery |
| Support | `/support/*` | Live chat, ticket management, canned responses |
| Customer Chat | `/customer-chat/*` | Customer-facing chat endpoints |
| Upload | `/upload/*` | File/image uploads for profiles, salons, services |
| KYC | `/kyc/*` | Know-your-customer verification |
| Subscriptions | `/subscriptions/*` | Salon subscription plan management |
| Loyalty | `/loyalty/*` | Customer loyalty points and rewards |
| Discovery | `/discovery/*` | Salon search and recommendation |
| Insights | `/insights/*` | Analytics and reporting |
| Admin | `/admin/*` | Admin-only operations and management |
| User | `/users/*` | Profile management, account operations |
| Impersonation | `/impersonation/*` | Admin impersonation for support |
| Waitlist | `/waitlist/*` | Salon waitlist management |
| Staff | `/staff/*` | Staff CRUD operations |

### Booking Lifecycle
```
PENDING → CONFIRMED → CHECKED_IN → IN_PROGRESS → COMPLETED → (escrow released)
    ↓         ↓            ↓            ↓             ↓
 CANCELLED  CANCELLED   NO_SHOW     CANCELLED     DISPUTED
```

### Payment Flow
```
Customer selects service → Booking created (PENDING)
    → Payment initialized (Paystack/Hubtel/TheTeller)
    → Payment verified → Escrow created (HELD)
    → Service completed → Escrow released to provider
    → OR cancelled → Refund to customer
```

---

## 5. Payment Integration

### Supported Gateways

| Gateway | Methods | Status |
|---------|---------|--------|
| **Paystack** | Card, Mobile Money (MTN, Vodafone, AirtelTigo) | Active (primary) |
| **Hubtel** | Mobile Money | Designed (ready for API keys) |
| **TheTeller** | Mobile Money | Designed (ready for API keys) |

### Payment Features
- **Escrow system** — funds held securely until service completion
- **One-click refund** — partners can refund to customer's original payment method
- **Gateway-aware routing** — admin configures active gateway from dashboard
- **Graceful fallback** — if primary gateway fails, automatically tries alternative
- **Mobile Money payouts** — direct transfer to customer's MoMo wallet
- **Webhook handlers** — real-time payment status updates from all gateways

---

## 6. Key Platform Features

### QR Code Check-In System
- **Customer** sees QR code on confirmed booking detail screen
- **Partner** scans QR code using camera scanner or enters code manually
- **Backend** validates and joins customer to live queue
- **Freelancers** get auto-start service timer on QR check-in

### Group Bookings
- Book multiple people under one reservation
- Individual service assignments per guest
- Capacity checking against salon limits
- Per-guest check-in, cancel, and no-show management

### Queue Management
- Real-time queue positions with estimated wait times
- Socket-based live updates for salon and customer
- Floor management with service timer tracking
- Auto-completion with configurable deadline

### Rescheduling
- Customers can reschedule to new date/time
- Price change detection alerts customer of cost differences
- Same cancellation policy applies to rescheduled bookings

### Freelancer / Home Service
- Provider category selection: Salon or Freelancer
- Service area configuration for home visits
- Auto-start service timer on QR check-in
- Home-service specific queue logic

### Notifications
- Push notifications for booking status changes
- SMS notifications for critical updates
- In-app notification center
- Email OTP for authentication

---

## 7. Tech Stack Summary

| Layer | Technology |
|-------|------------|
| **Mobile** | React Native 0.79, Expo SDK 53, React 19 |
| **Web Frontend** | React 18, Vite, Tailwind CSS |
| **Backend** | Node.js, Express, TypeScript |
| **Database** | PostgreSQL with Prisma ORM |
| **Payments** | Paystack, Hubtel (ready), TheTeller (ready) |
| **Maps** | Google Maps (react-native-maps) |
| **Real-time** | Socket.IO |
| **Push** | Expo Notifications |
| **SMS** | Custom SMS gateway |
| **Auth** | JWT with email OTP |
| **Build** | EAS Build (mobile), Vite (web) |
| **Deploy** | Docker + Nginx on VPS, GitHub Actions CI/CD |
| **Monorepo** | pnpm workspaces |

---

## 8. App Store Information

| App | iOS Bundle ID | Android Package | Status |
|-----|--------------|-----------------|--------|
| Customer | `com.arthiumlabsllc.groomlink` | `com.arthiumlabsllc.groomlink` | App Store Connect |
| Partners | `com.arthiumlabs.groomlinkpartners` | `com.arthiumlabs.groomlinkpartners` | App Store Connect |

---

## 9. Environment & Deployment

| Environment | Purpose | Trigger |
|-------------|---------|---------|
| **Production** | Live platform | GitHub Actions workflow_dispatch |
| **Preview** | Testing builds | EAS preview profile |
| **Development** | Local development | `expo start` / `vite dev` |

### Build Commands
- **Customer iOS:** `npx eas-cli build --profile production --platform ios`
- **Partners iOS:** `npx eas-cli build --profile production --platform ios`
- **Customer Android:** `npx eas-cli build --profile production --platform android`
- **Partners Android:** `npx eas-cli build --profile production --platform android`
- **Web Apps:** `npm run build` in each app directory
- **Submit iOS:** `npx eas-cli submit --platform ios --id <build-id>`

---

*Generated by Arthium Labs LLC — GroomLink Ghana Platform*
