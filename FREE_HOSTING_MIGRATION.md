# GroomLink — Free Hosting Migration Runbook ($0/month)

Moves the platform off the Hostinger VPS onto:

| Piece | Host | Free tier |
|---|---|---|
| 5 web frontends (landing, customer, partners, admin, support) | **Vercel** | Hobby — unlimited static sites, free SSL, auto-deploy from GitHub |
| API (Express + socket.io + cron) | **Render** | Free web service (Docker), 512 MB RAM, sleeps after ~15 min idle |
| PostgreSQL | **Neon** | 0.5 GB storage, auto-suspend compute |
| Redis | **Upstash** | 256 MB / 10k commands per day |
| Media (images/videos) | **Cloudinary** | Already external — unchanged |

Final DNS layout (all under your existing domain, DNS zone can stay at Hostinger):

```
groomlinkgh.com          A     76.76.21.21               (Vercel — landing)
www.groomlinkgh.com      CNAME cname.vercel-dns.com      (Vercel — landing)
my.groomlinkgh.com       CNAME cname.vercel-dns.com      (Vercel — customer web)
partners.groomlinkgh.com CNAME cname.vercel-dns.com      (Vercel — partners web)
dash.groomlinkgh.com     CNAME cname.vercel-dns.com      (Vercel — admin)
support.groomlinkgh.com  CNAME cname.vercel-dns.com      (Vercel — support)
api.groomlinkgh.com      CNAME groomlink-api.onrender.com (Render — API; use your real Render domain)
```

> Keep your existing **MX / TXT (email) records untouched** — only the records above change.

The repo is already prepared: `render.yaml` (API blueprint), `apps/*/vercel.json`
(API + socket.io proxy rewrites + SPA fallback), socket.io CORS accepting
`*.groomlinkgh.com` and `*.vercel.app`, avatar uploads moved to Cloudinary
(Render's disk is ephemeral), CI workflows updated.

---

## Step 0 — Back up everything on the VPS first

```bash
ssh USER@VPS
cd /opt/groomlink
docker exec groomlink-postgres pg_dump -U groomlink -d groomlink -F c -f /tmp/groomlink.dump
docker cp groomlink-postgres:/tmp/groomlink.dump ./groomlink.dump
# also copy current .env values (secrets) and uploads/avatars if you want legacy avatars
docker compose -f docker-compose.prod.yml exec api cat /app/.env 2>/dev/null || cat .env.production
tar czf groomlink-backup.tar.gz groomlink.dump .env.production
```

Download the archive locally before cancelling Hostinger.

---

## Step 1 — Neon (free Postgres)

1. Sign up at https://neon.tech (GitHub login, no card).
2. Create project → PostgreSQL 15+ → region **Europe (Frankfurt or London)** (closest to Ghana).
3. Copy the **pooled connection string** (ends in `-pooler` — uses port 5432 with built-in pgBouncer). This is `DATABASE_URL` for Render.
4. Restore the backup (from your local machine):

```bash
# Neon's restore tool handles the dump format:
npm i -g neondb
neondb restore --connection-string "postgresql://...neon.tech/neondb?sslmode=require" groomlink.dump
# or with psql (plain SQL dump only):
# psql "postgresql://...neon.tech/neondb?sslmode=require" -f groomlink.sql
```

5. Verify: open the Neon SQL editor → `select count(*) from users;`

> Prisma note: pooled connection is fine at runtime. If you ever run
> `prisma migrate` locally against Neon, use the **direct** (non-pooler)
> connection string. Deploys run `prisma migrate deploy` inside the Docker
> image — point that at the direct URL too if migrations error on the pooler.

---

## Step 2 — Upstash (free Redis)

1. Sign up at https://upstash.com (GitHub login, no card).
2. Create a Redis database → region **eu-west-1 (Ireland) or eu-central-1**.
3. Copy the **TLS URL** (`rediss://default:...@upstash.io:6379`) → this is `REDIS_URL`.
   ioredis handles `rediss://` automatically.
4. Budget check: free tier = 10,000 commands/day. Refresh tokens, booking
   locks, queue and cache use Redis. If you ever hit the daily cap, upgrade
   ($2/mo) or trim cache usage — the API logs Redis errors loudly.

---

## Step 3 — Render (free API host)

1. Sign up at https://render.com (GitHub login).
2. **New → Blueprint** → select this GitHub repo. Render reads `render.yaml`
   and creates the `groomlink-api` web service (Docker, free plan,
   auto-deploy from `main`, health check `/api/health`).
3. In the service **Environment** tab, fill every `sync: false` secret with
   the values from your backed-up `.env.production`:
   - `DATABASE_URL` (Neon), `REDIS_URL` (Upstash)
   - `CLOUDINARY_*`, `AT_USERNAME`/`AT_API_KEY`/`SMS_FROM`
   - `SMTP_*`, `EMAIL_FROM`, `GOOGLE_MAPS_API_KEY`
   - `HUBTEL_*`, `PAYSTACK_*`, `THETELLER_*`, `OPENAI_API_KEY`
   - Copy `JWT_SECRET`/`ENCRYPTION_KEY` **from the old server** if you want
     existing mobile sessions to stay logged in (new values = all users must log in again).
   - `DB_CONNECTION_POOL_SIZE` = **5** (Neon pooler; old value of 20–50 is too high for Neon).
4. **Custom domain**: service → Settings → Custom Domain → `api.groomlinkgh.com`.
   Render shows the DNS record to add (see table above) and provisions SSL.
5. Deploy. Watch logs: `prisma migrate deploy` runs, then `Server running on port ...`.
6. Test: `curl https://api.groomlinkgh.com/api/health`

### Keep the free instance awake (important)

Render free instances sleep after ~15 min idle, which stops the in-process
cron jobs (booking holds, reminders, sponsorship expiry). Add a free pinger:

1. https://uptimerobot.com (free) or https://cron-job.org → new monitor:
   `GET https://api.groomlinkgh.com/api/health` **every 5 minutes**.
2. First request after sleep takes ~30–60 s (cold start); the pinger mostly
   prevents sleep, and mobile/web clients retry automatically.

---

## Step 4 — Vercel (5 frontends)

Sign up at https://vercel.com with GitHub (Hobby plan). Create **5 projects**,
one per app folder. Vercel auto-detects Vite; the `vercel.json` in each folder
already proxies `/api` and `/socket.io` to `api.groomlinkgh.com` and handles SPA routing.

| Project | Root directory | Custom domain | Extra env vars |
|---|---|---|---|
| groomlink-landing | `apps/landing` | `groomlinkgh.com` + `www.` | none |
| groomlink-customer | `apps/customer` | `my.groomlinkgh.com` | optional `VITE_GOOGLE_MAPS_API_KEY` (falls back to `/api/config`) |
| groomlink-partners | `apps/partners` | `partners.groomlinkgh.com` | none |
| groomlink-admin | `apps/admin` | `dash.groomlinkgh.com` | none |
| groomlink-support | `apps/support` | `support.groomlinkgh.com` | none |

All projects: branch `main`, auto-deploy on push. No `VITE_API_URL` needed —
every app falls back to `https://groomlinkgh.com/api`, which Vercel now
rewrites to Render. Add each custom domain in the project settings; Vercel
gives you the DNS records (already in the table above) and issues SSL.

> Preview deployments (`*.vercel.app`) work automatically — the API CORS
> accepts `*.vercel.app` origins.

---

## Step 5 — DNS cutover

In your DNS zone (Hostinger DNS panel): apply the records from the table at
the top. Propagation is usually minutes to a few hours. Do this **after**
Render and Vercel report healthy.

---

## Step 6 — Payment provider callbacks

Update the webhook/callback URLs in the provider dashboards to the API domain:

- **Hubtel**: webhook → `https://api.groomlinkgh.com/api/payments/webhook/hubtel`
- **Paystack**: callback → `https://api.groomlinkgh.com/api/payments/callback/paystack`
- **TheTeller**: webhook → `https://api.groomlinkgh.com/api/payments/webhook/theteller`
- **Sponsorship (Hubtel)**: `https://api.groomlinkgh.com/api/sponsorship/webhook/hubtel`

(The corresponding `*_WEBHOOK_URL` / `*_CALLBACK_URL` env vars in `render.yaml`
already point at these.)

---

## Step 7 — Mobile apps

Nothing is needed immediately: REST calls to `https://groomlinkgh.com/api`
keep working through the Vercel rewrite.

The next EAS release (already due for the API-36 Play requirement) contains
updated socket URLs (`api.groomlinkgh.com`) in both apps — build and release
as normal:

```bash
cd apps/customer-app && eas build --platform android --profile production
cd apps/partners-app && eas build --platform android --profile production
```

Until that release ships, mobile chat/notification sockets degrade to
HTTP long-polling through the rewrite (still functional).

---

## Step 8 — Post-cutover checklist

- [ ] `https://groomlinkgh.com` loads (landing), `/explore` shows salons
- [ ] `https://api.groomlinkgh.com/api/health` returns OK
- [ ] Login + booking flow on `my.groomlinkgh.com`
- [ ] Partners login, sponsorship purchase page, live chat bubble on landing
- [ ] Admin + support dashboards load; support live-chat receives a test ticket
- [ ] Mobile apps: login, book, chat (current store builds)
- [ ] UptimeRobot monitor green
- [ ] Cancel Hostinger VPS only after 1–2 weeks of stable operation

## Known free-tier trade-offs

- **Render free**: 512 MB RAM, shared CPU, cold starts after sleep, ~30 s
  restarts on deploy (clients auto-reconnect). 750 free hours/mo covers one service.
- **Neon**: compute auto-suspends after ~5 min idle (reconnects automatically);
  0.5 GB storage.
- **Upstash**: 10k commands/day cap (see Step 2).
- **Vercel Hobby**: 100 GB bandwidth/mo — plenty for this traffic.
- **Legacy avatars**: user avatars stored as `/uploads/avatars/...` on the old
  VPS won't resolve after cutover (files lived on the VPS volume). New avatars
  upload to Cloudinary automatically. If you want the old ones back: copy the
  `uploads/avatars` folder off the VPS before cancelling and upload the files
  to Cloudinary, then update the matching `users.avatar` values.
- **Railway** was considered but only offers a one-time trial credit — not $0.
