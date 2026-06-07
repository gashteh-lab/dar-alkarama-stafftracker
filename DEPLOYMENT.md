# StaffTrack PWA — Production Deployment Checklist

## Phase Build Complete ✅
All 7 phases delivered. 105+ files. Full production-ready PWA.

---

## Pre-Deployment Checklist

### 1. Environment Variables (MUST complete)
```bash
cp .env.example .env.local
```

Required before first deploy:
- [ ] `AUTH_SECRET` — run: `openssl rand -base64 32`
- [ ] `DATABASE_URL` — Supabase pooler connection string
- [ ] `DIRECT_URL` — Supabase direct connection string
- [ ] `NEXT_PUBLIC_APP_URL` — your domain (e.g. https://attendance.shiftlywork-app.com)
- [ ] `NEXT_PUBLIC_VAPID_PUBLIC_KEY` — run: `npx web-push generate-vapid-keys`
- [ ] `VAPID_PRIVATE_KEY` — (same command above)
- [ ] `CRON_SECRET` — any random string for cron security

Optional (enhanced features):
- [ ] `RESEND_API_KEY` — email password reset (resend.com)
- [ ] `GOOGLE_MAPS_API_KEY` — better reverse geocoding

### 2. Database Setup
```bash
npm run db:generate    # Generate Prisma client
npm run db:push        # Create all tables in Supabase
npm run db:seed        # Add demo data + 4 test accounts
```

### 3. PWA Icons (REQUIRED for installability)
Generate all sizes at https://maskable.app/editor
Place in /public/icons/:
```
icon-72x72.png, icon-96x96.png, icon-128x128.png
icon-144x144.png, icon-152x152.png, icon-192x192.png
icon-384x384.png, icon-512x512.png
icon-maskable-192x192.png, icon-maskable-512x512.png
```

### 4. Local Build Test
```bash
npm run build    # Must pass with 0 errors
npm start        # Test production build locally
```

### 5. Deploy to Vercel
```bash
# Push to GitHub first
git init && git add . && git commit -m "StaffTrack PWA v1.0"
git remote add origin https://github.com/YOUR_USER/stafftrack.git
git push -u origin main

# Deploy
npx vercel --prod
# OR connect GitHub repo at vercel.com
```

Add all .env.local variables to Vercel → Settings → Environment Variables

### 6. Connect Domain (attendance.shiftlywork-app.com)
In Vercel: Settings → Domains → Add `attendance.shiftlywork-app.com`

In Hostinger DNS Zone, add:
| Type  | Name        | Value                |
|-------|-------------|----------------------|
| CNAME | attendance  | cname.vercel-dns.com |

Wait 5–30 min for DNS propagation.

### 7. Post-Deploy Tests
- [ ] Login with ADM001 / Admin@123456
- [ ] Login with EMP001 / Staff@12345
- [ ] Punch in on mobile (allow location)
- [ ] Install as PWA on iPhone (Share → Add to Home Screen)
- [ ] Install as PWA on Android (browser menu → Add to Home Screen)
- [ ] Test offline: turn off wifi, punch in, turn wifi back on, verify sync
- [ ] Test admin dashboard loads stats
- [ ] Test staff import with sample CSV
- [ ] Test Excel export
- [ ] Check /api/health returns { status: "ok" }

---

## Demo Login Accounts

| Role        | Employee ID | Password        | Email                      |
|-------------|-------------|-----------------|----------------------------|
| Super Admin | SA001       | SuperAdmin@123  | superadmin@stafftrack.com  |
| Admin / HR  | ADM001      | Admin@123456    | admin@stafftrack.com       |
| Manager     | MGR001      | Manager@123     | manager@stafftrack.com     |
| Staff       | EMP001–005  | Staff@12345     | —                          |

---

## Feature Summary (all 7 phases)

### Authentication
- Login by Employee ID, email, or phone
- bcrypt password hashing (rounds: 12)
- JWT sessions (httpOnly secure cookies)
- Account lockout after 5 failed attempts
- Password reset via email (Resend)
- Change password in profile
- Admin password reset for any staff
- Rate limiting: 5 login attempts / 15 min / IP

### Staff Punch System
- Large punch-in / punch-out button
- Real-time GPS capture
- Server-side geofence validation (Haversine)
- Reverse geocoding (address from GPS)
- Mock location detection (flags suspicious GPS)
- Prevent duplicate punches
- Confirm dialog before punch-out
- Late / early leave / overtime auto-calculation
- Offline punch queue (IndexedDB)
- Background sync when reconnected

### Offline PWA
- Service worker (Workbox + custom SW)
- App shell cached for instant load
- Offline punch → IndexedDB queue
- Background sync on reconnect
- Offline page (/offline.html)
- Install prompt (Android/Desktop)
- iOS "Add to Home Screen" instructions
- Dark mode (system + manual toggle)

### Admin System
- Dashboard with live stats + charts (auto-refresh 60s)
- Staff management: add, edit, deactivate (soft delete)
- CSV import with validation + preview (up to 500 rows)
- Staff profile detail view
- Shift builder (fixed, flexible, rotating, night)
- Location/geofence manager with radius slider
- Attendance records with manual edit (audit trail)
- Correction requests: staff submit → admin approve/reject
- Reports: daily, monthly, payroll summary
- Export: CSV, Excel (.xlsx formatted), PDF (jsPDF + autoTable)
- Audit log (all sensitive actions)
- System settings (timezone, policies, GPS accuracy)
- Department management
- Holiday calendar

### Manager System
- Team live attendance view (2-min auto-refresh)
- Presence dots (green pulse = on duty)
- Stats: total, on duty, absent, late
- Search team by name or ID

### Notifications
- Web Push (VAPID)
- In-app notification bell with unread count
- Admin broadcast to all / specific staff
- Auto: missed punch-out alerts (daily cron at 10pm)
- Auto: late arrival notification
- Correction request status updates
- Subscribe/unsubscribe per device

### Reports & Export
- Attendance CSV
- Attendance Excel (formatted .xlsx with colours, totals)
- Payroll Excel (staff summary with all metrics)
- PDF report (jsPDF + autoTable, landscape A4)
- Date range + staff + department filters

### Security
- RBAC middleware on all routes
- Row-level: staff see only own data
- Rate limiting (login + API + punch)
- Security headers (HSTS, X-Frame, CSP)
- Audit logging: every admin action
- IP address captured on all auth events
- Suspicious GPS flagging
- Vercel HTTPS enforced
- Cron endpoints protected by secret

---

## Architecture Overview
```
Next.js 14 App Router (TypeScript)
├── Supabase PostgreSQL + Prisma ORM
├── JWT auth (jose) + bcrypt
├── Tailwind CSS + dark mode
├── Workbox service worker (next-pwa)
├── IndexedDB offline queue (idb)
├── Web Push (web-push + VAPID)
├── ExcelJS + jsPDF exports
├── Recharts (dashboard charts)
├── Papa Parse (CSV import)
└── Vercel deployment + cron jobs
```

---

## Support
Health check: GET /api/health
Logs: Vercel Dashboard → Functions → Logs
DB: supabase.com → Table Editor / SQL Editor
