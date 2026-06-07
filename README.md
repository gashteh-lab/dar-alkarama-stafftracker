# StaffTrack PWA — Setup Guide

## Quick Start

### Prerequisites
- Node.js 18.17+ 
- A Supabase account (free tier works)
- Git

---

## 1. Clone & Install

```bash
git clone https://github.com/your-org/stafftrack-pwa.git
cd stafftrack-pwa
npm install
```

---

## 2. Database Setup (Supabase)

1. Create a new project at [supabase.com](https://supabase.com)
2. Go to **Settings → Database → Connection string → Transaction mode**
3. Copy the `DATABASE_URL` (pooler connection)
4. Go to **Settings → Database → Connection string → Session mode**
5. Copy the `DIRECT_URL` (direct connection)

---

## 3. Environment Variables

```bash
cp .env.example .env.local
```

Edit `.env.local` and fill in:

| Variable | Where to get it |
|---|---|
| `DATABASE_URL` | Supabase → Settings → Database (pooler) |
| `DIRECT_URL` | Supabase → Settings → Database (direct) |
| `AUTH_SECRET` | Run: `openssl rand -base64 32` |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase → Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase → Settings → API |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase → Settings → API |
| `UPSTASH_REDIS_REST_URL` | [upstash.com](https://upstash.com) → Redis |
| `UPSTASH_REDIS_REST_TOKEN` | [upstash.com](https://upstash.com) → Redis |
| `NEXT_PUBLIC_VAPID_PUBLIC_KEY` | Run: `npx web-push generate-vapid-keys` |
| `VAPID_PRIVATE_KEY` | (same command above) |
| `RESEND_API_KEY` | [resend.com](https://resend.com) |

---

## 4. Database Migration & Seed

```bash
# Generate Prisma client
npm run db:generate

# Push schema to database (creates all tables)
npm run db:push

# Seed with demo accounts and sample data
npm run db:seed
```

---

## 5. Generate PWA Icons

Create icons at these sizes and place in `/public/icons/`:

```
icon-72x72.png
icon-96x96.png
icon-128x128.png
icon-144x144.png
icon-152x152.png
icon-192x192.png
icon-384x384.png
icon-512x512.png
icon-maskable-192x192.png  (with safe zone padding)
icon-maskable-512x512.png  (with safe zone padding)
```

Use [maskable.app](https://maskable.app/editor) to create maskable icons.

---

## 6. Generate VAPID Keys

```bash
npx web-push generate-vapid-keys
```

Copy the output to your `.env.local`.

---

## 7. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000)

---

## 8. Demo Login Accounts

| Role | Employee ID | Password |
|---|---|---|
| Super Admin | SA001 | SuperAdmin@123 |
| Admin / HR | ADM001 | Admin@123456 |
| Manager | MGR001 | Manager@123 |
| Staff | EMP001–EMP005 | Staff@12345 |

Or use email: `admin@stafftrack.com` / `Admin@123456`

---

## 9. Deploy to Vercel

```bash
npm install -g vercel
vercel --prod
```

Add all environment variables in Vercel dashboard under **Settings → Environment Variables**.

**Important for production:**
- Enable **HTTPS** (automatic on Vercel)
- Set custom domain
- Enable Vercel Cron for scheduled notifications

---

## 10. Deploy to Hostinger VPS

```bash
# Build
npm run build

# PM2 process manager
npm install -g pm2
pm2 start npm --name "stafftrack" -- start
pm2 save
pm2 startup

# Nginx config (see /docs/nginx.conf)
```

---

## PWA Testing Checklist

### Android (Chrome)
- [ ] Open site in Chrome
- [ ] See "Add to Home Screen" banner
- [ ] Install and open from home screen
- [ ] Verify standalone mode (no URL bar)
- [ ] Test offline page when disconnected

### iPhone (Safari)
- [ ] Open site in Safari
- [ ] Tap Share → "Add to Home Screen"
- [ ] Open from home screen
- [ ] Verify splash screen shows
- [ ] Test punch-in with GPS

### Desktop (Chrome/Edge)
- [ ] See install button in address bar
- [ ] Install as desktop app
- [ ] Open from Start menu / Spotlight

---

## Architecture Notes

### Tech Stack
- **Frontend**: Next.js 14 App Router + TypeScript + Tailwind CSS
- **Database**: PostgreSQL via Supabase + Prisma ORM
- **Auth**: Custom JWT + bcrypt + secure httpOnly cookies
- **PWA**: next-pwa (Workbox) + Background Sync
- **Cache/Rate limit**: Upstash Redis
- **Storage**: Supabase Storage (photos, attachments)
- **Push Notifications**: Web Push API (VAPID)
- **Email**: Resend
- **Deployment**: Vercel (recommended)

### Security Features
- bcrypt password hashing (rounds: 12)
- httpOnly + Secure + SameSite cookies
- Account lockout after 5 failed attempts
- Rate limiting on auth endpoints (Upstash)
- RBAC middleware on all routes
- Server-side geofence validation
- Full audit logging
- CSRF protection
- Security headers (CSP, HSTS, X-Frame-Options)

---

## Phase Build Progress

- [x] **Phase 1** — Project scaffold, database schema, auth system, login page
- [ ] **Phase 2** — PWA config, service worker, offline support
- [ ] **Phase 3** — Staff punch-in/out screen
- [ ] **Phase 4** — GPS + geofence validation
- [ ] **Phase 5** — Offline punch queue + background sync
- [ ] **Phase 6** — Admin dashboard + staff management
- [ ] **Phase 7** — Shifts, locations, attendance records
- [ ] **Phase 8** — Reports + export
- [ ] **Phase 9** — Correction requests workflow
- [ ] **Phase 10** — Notifications + settings + polish

---

## Support

For issues, see the audit log at `/admin/audit` after login.
