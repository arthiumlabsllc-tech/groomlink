# GroomLink Ghana - Connect. Book. Groom.

A full-stack booking platform connecting customers with salons, barbershops, and beauty service providers across Ghana. Built as a pnpm monorepo with 7 web applications, 2 mobile apps, and a shared API service.

---

## Overview

GroomLink Ghana is a multi-tenant marketplace platform that enables customers to discover, book, and pay for grooming services while providing salon owners with powerful management tools. The platform supports both brick-and-mortar businesses and freelance/home-service providers, with integrated mobile money and card payments tailored for the Ghanaian market.

**Monorepo structure** — pnpm workspaces managing 10 apps + 1 API service + shared packages.

---

## Platform Architecture

| App | Type | Purpose | Tech Stack | Domain / Port |
|-----|------|---------|------------|---------------|
| Landing | Web | Public marketing site | React 18, Vite 5, Tailwind CSS | [groomlinkgh.com](https://groomlinkgh.com) :8081 |
| Customer Web | Web | Customer dashboard & booking | React 18, Vite 4, Google Maps, Zustand | [my.groomlinkgh.com](https://my.groomlinkgh.com) :8084 |
| Partners Web | Web | Salon owner dashboard | React 18, Vite 4, Socket.io, QR codes | [partners.groomlinkgh.com](https://partners.groomlinkgh.com) :8082 |
| Admin | Web | Admin dashboard | React 18, Vite 5, Recharts | [dash.groomlinkgh.com](https://dash.groomlinkgh.com) :8080 |
| Support | Web | Support team dashboard | React 18, Vite 5 | [support.groomlinkgh.com](https://support.groomlinkgh.com) :8083 |
| Customer App | Mobile (Android) | Customer mobile app | Expo 52, React Native, Google Maps | Google Play Store |
| Partners App | Mobile (Android) | Partner mobile app | Expo 52, React Native, Camera | Google Play Store |
| API Service | Backend | REST API + WebSocket | Express.js, Prisma, PostgreSQL, Redis | :3000 |

---

## Tech Stack

### Frontend
- **React 18** with TypeScript
- **Vite 4–5** build tooling
- **Tailwind CSS** for utility-first styling
- **Zustand** for state management (customer app)
- **React Router v6** for client-side routing
- **Google Maps JavaScript API** for location services
- **Socket.io Client** for real-time updates
- **Recharts** for analytics & charts (admin)
- **QR code** generation & scanning (partners)

### Mobile
- **Expo SDK 52** with React Native 0.76.9
- **EAS Build & Submit** for CI/CD
- **React Native Maps** for location features
- **Expo Camera** for QR scanning
- **React Navigation** for app routing

### Backend
- **Express.js** with TypeScript
- **Prisma ORM** for database access & migrations
- **Socket.io** for real-time WebSocket communication
- **Multer** + **Cloudinary** for file uploads
- **Africa's Talking** for SMS/OTP delivery
- **Nodemailer** (Hostinger SMTP) for email
- **node-cron** for scheduled jobs

### Database
- **PostgreSQL 15** — primary data store
- **Redis 7** — caching, sessions, rate limiting

### Infrastructure
- **Docker** & **Docker Compose** — containerized deployment
- **Nginx** — reverse proxy with SSL termination
- **Let's Encrypt** — automated TLS certificates
- **Cloudinary** — image & asset storage
- **GitHub Actions** — CI/CD pipelines

---

## Key Features

### Booking System
- Real-time availability with slot generation engine
- Group booking for multiple services
- QR-based check-in at salon
- Live queue management with position tracking
- Configurable buffer times, cancellation grace periods, and hold durations
- Auto-cancellation for unpaid bookings

### Payment Processing
- **Hubtel** — mobile money (MTN, Vodafone, AirtelTigo)
- **Paystack** — cards + mobile money
- Admin-configurable gateway toggle per salon
- Escrow payment protection for customers
- Automatic payouts to salon owners
- Webhook verification for both providers

### Salon Management
- Service catalog with pricing & duration
- Staff profiles with specialization & availability
- Business hours & schedule management
- Dashboard analytics & revenue tracking

### Provider Categories
- **Business** — traditional salon/barbershop with physical location
- **Freelancer** — independent professionals offering home service
- Category-specific onboarding & profile flows

### Location Services
- Google Maps integration for salon discovery
- Geocoding for address resolution
- Nearby salon search with distance calculation

### Real-time Communication
- Socket.io WebSocket for live updates
- Push notification dispatch
- Live queue position updates
- Booking status change alerts

### Authentication & Security
- OTP-based login via SMS (Africa's Talking)
- JWT token authentication with refresh
- bcrypt password hashing
- Role-based access control (customer, partner, admin, support)

### Admin & Compliance
- Escrow management dashboard
- Dispute resolution tools
- GDPR-compliant data deletion
- Platform feedback collection
- User impersonation for support
- KYC verification for partners

---

## Project Structure

```
GroomLink Ghana/
├── apps/
│   ├── landing/            # Public marketing website
│   ├── customer/           # Customer web dashboard
│   ├── customer-app/       # Customer mobile app (Expo)
│   ├── partners/           # Partner web dashboard
│   ├── partners-app/       # Partner mobile app (Expo)
│   ├── admin/              # Admin dashboard
│   └── support/            # Support dashboard
├── services/
│   └── api/                # Backend API (Express + Prisma)
│       ├── prisma/         # Database schema & migrations
│       ├── src/
│       │   ├── config/     # DB, Redis, Socket, Logger setup
│       │   ├── controllers/# Route handlers (22 modules)
│       │   ├── middleware/  # Auth, error, rate limiting, maintenance
│       │   ├── routes/     # Express route definitions (24 modules)
│       │   ├── services/   # Business logic layer (26 modules)
│       │   ├── jobs/       # Scheduled tasks & queue workers
│       │   ├── types/      # Shared TypeScript types
│       │   └── utils/      # Helper utilities
│       └── uploads/        # Static file storage
├── packages/
│   └── shared-types/       # Shared TypeScript type definitions
├── nginx/                  # Reverse proxy configuration
├── scripts/                # Build & deployment utilities
├── docker-compose.yml      # Development environment
└── docker-compose.prod.yml # Production environment (8 services)
```

---

## Getting Started

### Prerequisites

| Requirement | Version |
|-------------|---------|
| Node.js | >= 18.0.0 |
| pnpm | 9.15.5 |
| PostgreSQL | 15+ |
| Redis | 7+ |
| Docker & Docker Compose | Latest |

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd GroomLink\ Ghana

# Install all workspace dependencies
pnpm install
```

### Environment Setup

Copy the example env file and configure values for your environment:

```bash
cp services/api/.env.example services/api/.env
```

**Key environment variables:**

| Category | Variables |
|----------|-----------|
| **Database** | `DATABASE_URL`, `DB_CONNECTION_POOL_SIZE`, `DB_CONNECTION_TIMEOUT` |
| **Redis** | `REDIS_URL` |
| **JWT** | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| **Cloudinary** | `CLOUDINARY_CLOUD_NAME`, `CLOUDINARY_API_KEY`, `CLOUDINARY_API_SECRET` |
| **SMS / OTP** | `AT_USERNAME`, `AT_API_KEY`, `SMS_FROM`, `MOCK_OTP` |
| **Email** | `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASSWORD`, `EMAIL_FROM` |
| **Google Maps** | `GOOGLE_MAPS_API_KEY` |
| **Hubtel** | `HUBTEL_API_ID`, `HUBTEL_API_SECRET`, `HUBTEL_MERCHANT_ACCOUNT_ID` |
| **Paystack** | `PAYSTACK_PUBLIC_KEY`, `PAYSTACK_SECRET_KEY` |
| **Booking Engine** | `BOOKING_BUFFER_MINUTES`, `CANCELLATION_GRACE_HOURS`, `MAX_BOOKING_DAYS_AHEAD`, `HOLD_DURATION_SECONDS` |

### Development

```bash
# Start individual services
pnpm dev:api          # API server on :3000
pnpm dev:admin        # Admin dashboard on :5173

# Or start from individual app directories
pnpm --filter customer dev
pnpm --filter partners dev
pnpm --filter landing dev
pnpm --filter support dev
```

### Database

```bash
pnpm db:migrate       # Run pending migrations
pnpm db:generate      # Generate Prisma client
pnpm db:seed          # Seed database with sample data
pnpm db:studio        # Open Prisma Studio (GUI)
```

### Docker (Development)

```bash
docker-compose up -d          # Start PostgreSQL + Redis + API
docker-compose up -d postgres # Start only PostgreSQL
docker-compose up -d redis    # Start only Redis
```

---

## Mobile Apps

Both mobile apps are built with **Expo SDK 52** and managed through **EAS (Expo Application Services)**.

| App | Package Name | Key Features |
|-----|-------------|--------------|
| Customer App | `com.groomlink.customer` | Browse salons, book services, track queue, pay |
| Partners App | `com.groomlink.partners` | Manage bookings, scan QR, view analytics |

### Build & Release

```bash
# Configure EAS
eas build:configure

# Build Android APK/AAB
eas build --platform android --profile preview   # Test build
eas build --platform android --profile production # Release build

# Submit to Google Play
eas submit --platform android
```

Build profiles and credentials are configured in each app's `eas.json`.

---

## Deployment

### Production (Docker Compose)

The production stack runs **8 containerized services** behind an Nginx reverse proxy:

```
┌─────────────────────────────────────────────────────┐
│  Nginx (:80/:443) — SSL termination & routing       │
├──────────┬──────────┬──────────┬────────────────────┤
│ Landing  │ Admin    │ Partners │ Customer            │
│ :8081    │ :8080    │ :8082    │ :8084               │
├──────────┴──────────┴──────────┴────────────────────┤
│  Support (:8083)                                    │
├─────────────────────────────────────────────────────┤
│  API Server (:3000) — Express + Prisma + Socket.io  │
├────────────────────┬────────────────────────────────┤
│  PostgreSQL 15     │  Redis 7                        │
│  (persistent vol)  │  (persistent vol)               │
└────────────────────┴────────────────────────────────┘
```

```bash
# Deploy production stack
docker-compose -f docker-compose.prod.yml up -d --build

# Run database migrations
docker-compose -f docker-compose.prod.yml exec api npx prisma migrate deploy
```

All services include health checks and automatic restart policies. PostgreSQL and Redis data persists via Docker named volumes.

### Domain Mapping

| Domain | Service | SSL |
|--------|---------|-----|
| `groomlinkgh.com` | Landing page + API | Let's Encrypt |
| `www.groomlinkgh.com` | Landing page (redirect) | Let's Encrypt |
| `my.groomlinkgh.com` | Customer dashboard | Let's Encrypt |
| `partners.groomlinkgh.com` | Partners dashboard | Let's Encrypt |
| `dash.groomlinkgh.com` | Admin dashboard | Let's Encrypt |
| `support.groomlinkgh.com` | Support dashboard | Let's Encrypt |

All domains enforce HTTPS with HTTP→301 redirects and HSTS headers. Dashboard subdomains are blocked from search engine indexing via `X-Robots-Tag` headers and `robots.txt`.

---

## API Endpoints

The API exposes 22 route modules under `/api`:

| Endpoint | Module | Description |
|----------|--------|-------------|
| `/api/health` | Health | Service health check |
| `/api/config` | Config | Public client configuration |
| `/api/auth` | Auth | OTP login, JWT token management |
| `/api/users` | Users | User profiles & settings |
| `/api/salons` | Salons | Salon CRUD, search, discovery |
| `/api/salon-owner` | Salon Owner | Owner onboarding & management |
| `/api/staff` | Staff | Staff profiles & schedules |
| `/api/bookings` | Bookings | Booking lifecycle management |
| `/api/payments` | Payments | Payment processing & webhooks |
| `/api/notifications` | Notifications | Push & in-app notifications |
| `/api/queue` | Queue | Live queue management |
| `/api/reviews` | Reviews | Customer review system |
| `/api/kyc` | KYC | Partner identity verification |
| `/api/subscription` | Subscription | Partner subscription plans |
| `/api/discover` | Discovery | Nearby salon search |
| `/api/insights` | Insights | Analytics & reporting |
| `/api/loyalty` | Loyalty | Customer loyalty points |
| `/api/waitlist` | Waitlist | Booking waitlist management |
| `/api/uploads` | Uploads | File & image upload (Cloudinary) |
| `/api/admin` | Admin | Administrative operations |
| `/api/support` | Support | Support ticket management |
| `/api/impersonation` | Impersonation | Support impersonation access |
| `/api/platform` | Platform Feedback | User feedback collection |

---

## Payment System

GroomLink supports a **dual-provider payment architecture** designed for the Ghanaian market:

### Hubtel (Mobile Money)
- MTN Mobile Money, Vodafone Cash, AirtelTigo Money
- Server-side payment initiation
- Webhook-based confirmation at `/api/payments/webhook/hubtel`

### Paystack (Cards + Mobile Money)
- Visa, Mastercard, and mobile money via Paystack
- Client-side popup flow with server verification
- Callback at `/api/payments/callback/paystack`

### Architecture
- **Admin-configurable gateway** — toggle providers per salon via admin dashboard
- **Escrow protection** — payments held in escrow until service completion
- **Auto-payouts** — automatic settlement to salon owner accounts
- **Webhook verification** — HMAC signature validation for both providers

---

## Security

| Measure | Implementation |
|---------|---------------|
| Authentication | JWT tokens with 7-day expiry, OTP via SMS |
| Password Security | bcrypt hashing |
| Rate Limiting | 100 req/min general, 20 req/15min auth endpoints |
| HTTP Headers | Helmet.js with CSP, HSTS preload |
| CORS | Whitelisted origins per environment |
| Webhook Security | HMAC signature verification (Hubtel & Paystack) |
| Transport | TLS 1.2/1.3 on all domains via Let's Encrypt |
| Data Privacy | GDPR-compliant data deletion endpoint |

---

## License

Proprietary — &copy; Arthium Labs LLC. All rights reserved.
