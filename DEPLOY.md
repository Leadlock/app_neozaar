# Neozaar Deployment Guide

> **Server:** `root@72.61.244.75` (srv1219605)  
> **Domain:** `https://www.neozaar.com`  
> **Last Updated:** September 28, 2026

---

## How to read the commands

Every multi-step command below is **one chained line** (joined with `&&`) that prints a progress message as each step starts and finishes:

```
▶ Step 2/4: Building...
✅ Step 2/4 done: build finished
```

- Because steps are joined with `&&`, **if any step fails the chain stops** and later steps never run.
- That is deliberate. For example, the live portal files (`/var/www/html/app/`) are only deleted **after** the build succeeds, so a failed build leaves the running site untouched.
- Each chain is a single copy-paste. The trailing `\` at the end of a line just continues the command onto the next line.

---

## Project Structure

| Folder | What it is | Deployed as |
|--------|-----------|-------------|
| `Neozaareact/` | Public marketplace (Next.js) | PM2 `react-app` on port 3000 |
| `neozaar_backend/` | API server (Express + PostgreSQL) | PM2 `backend` on port 5000 |
| `neozaar_portal_frontend_A18/` | Admin dashboard + CRM (Angular 18) | Static files in `/var/www/html/app/` |
| `CRM/` | CRM reference docs (code lives inside backend + portal) | Part of backend & portal |
| `Seller/` | Seller module reference docs (code inside backend + portal) | Part of backend & portal |

> **Note:** `CRM/` and `Seller/` folders are documentation/reference copies. The actual code is integrated into `neozaar_backend/src/routes/crm/` and `neozaar_portal_frontend_A18/src/app/pages/crm/`. No separate deployment needed for them.

---

## Prerequisites

- SSH access to server: `ssh root@72.61.244.75`
- Local project folder: `C:\Users\HP\Music\Yuvi\Neozaar\`
- Server has: Node.js v20, PM2, PostgreSQL, Apache2
- **Server needs outbound internet during `npm run build` of Neozaareact** (Next.js downloads the Google fonts used by the CoSell360 pages) and at runtime for `/go/usd-inr` (live USD→INR rate; the calculator falls back to a built-in rate if unreachable)

---

## Part A — On Your Windows Machine

### 1. Create archives

Archives exclude `node_modules`, build output, `.git`, log files and local `.env*` files (env files come from `~/server_backup/env/` on the server, never from your PC).

```powershell
cd C:\Users\HP\Music\Yuvi\Neozaar

tar -czf Neozaareact.tar.gz --exclude="Neozaareact/node_modules" --exclude="Neozaareact/.next" --exclude="Neozaareact/.next-dev" --exclude="Neozaareact/.git" --exclude=".env*" --exclude="*.log" Neozaareact

tar -czf neozaar_backend.tar.gz --exclude="neozaar_backend/node_modules" --exclude="neozaar_backend/.git" --exclude=".env*" --exclude="*.log" neozaar_backend

tar -czf neozaar_portal_frontend_A18.tar.gz --exclude="neozaar_portal_frontend_A18/node_modules" --exclude="neozaar_portal_frontend_A18/.git" --exclude="neozaar_portal_frontend_A18/dist" --exclude="neozaar_portal_frontend_A18/.angular" --exclude="*.log" neozaar_portal_frontend_A18
```

### 2. Upload to server

```powershell
scp Neozaareact.tar.gz neozaar_backend.tar.gz neozaar_portal_frontend_A18.tar.gz root@72.61.244.75:~/
```

### 3. SSH into the server

```powershell
ssh root@72.61.244.75
```

---

## Part B — On The Server (full deploy)

### 4. Backup current live apps

```bash
echo "▶ Backing up live apps..." && cp -r ~/Neozaareact ~/Neozaareact_bak_$(date +%Y%m%d) && echo "✅ 1/3 Neozaareact backed up" && cp -r ~/neozaar_backend ~/neozaar_backend_bak_$(date +%Y%m%d) && echo "✅ 2/3 backend backed up" && cp -r ~/neozaar_portal_frontend_A18 ~/neozaar_portal_frontend_A18_bak_$(date +%Y%m%d) && echo "✅ 3/3 portal backed up" && echo "🎉 Backups complete"
```

### 5. Stop PM2

```bash
pm2 stop all
```

> The site is down from here until step 10.

### 6. Extract new code

```bash
echo "▶ Extracting new code..." \
&& rm -rf ~/Neozaareact && tar -xzf ~/Neozaareact.tar.gz -C ~/ && echo "✅ 1/3 Neozaareact extracted" \
&& rm -rf ~/neozaar_backend && tar -xzf ~/neozaar_backend.tar.gz -C ~/ && echo "✅ 2/3 backend extracted" \
&& rm -rf ~/neozaar_portal_frontend_A18 && tar -xzf ~/neozaar_portal_frontend_A18.tar.gz -C ~/ && echo "✅ 3/3 portal extracted" \
&& echo "🎉 Extraction complete"
```

### 7. Copy env files from backup

```bash
echo "▶ Restoring env files..." \
&& cp ~/server_backup/env/frontend/.env.local ~/Neozaareact/.env.local \
&& cp ~/server_backup/env/frontend/.env.production ~/Neozaareact/.env.production \
&& cp ~/server_backup/env/frontend/.env.development ~/Neozaareact/.env.development \
&& echo "✅ 1/3 frontend env restored" \
&& cp ~/server_backup/env/backend/.env ~/neozaar_backend/.env && echo "✅ 2/3 backend env restored" \
&& cp ~/server_backup/env/portal/environment.prod.ts ~/neozaar_portal_frontend_A18/src/environments/environment.prod.ts && echo "✅ 3/3 portal env restored" \
&& echo "🎉 Env files restored"
```

### 8. Install backend dependencies

```bash
cd ~/neozaar_backend && echo "▶ Installing backend dependencies..." && npm ci --omit=dev && echo "✅ Backend dependencies installed"
```

> If this release includes database migrations, run them now — after this step and **before** step 10 (restart) — as described in [Database Migrations](#database-migrations).

### 9. Build the storefront and portal

```bash
cd ~/Neozaareact \
&& echo "▶ Step 1/5: Installing storefront dependencies..." && npm ci && echo "✅ Step 1/5 done: dependencies installed" \
&& echo "▶ Step 2/5: Building storefront (Next.js)..." && npm run build && echo "✅ Step 2/5 done: storefront built" \
&& cd ~/neozaar_portal_frontend_A18 \
&& echo "▶ Step 3/5: Installing portal dependencies..." && npm ci && echo "✅ Step 3/5 done: dependencies installed" \
&& echo "▶ Step 4/5: Building portal (production)..." && npm run build:prod && echo "✅ Step 4/5 done: portal built" \
&& echo "▶ Step 5/5: Publishing portal to /var/www/html/app/..." && rm -rf /var/www/html/app/* && cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/app/ && echo "✅ Step 5/5 done: portal published" \
&& echo "🎉 Storefront and portal built"
```

### 10. Restart PM2

```bash
pm2 restart all && sleep 3 && pm2 status
```

### 11. Verify

```bash
echo "▶ Health checks..." \
&& curl -s -o /dev/null -w "Frontend: %{http_code}\n" http://localhost:3000 \
&& curl -s -o /dev/null -w "Backend:  %{http_code}\n" http://localhost:5000/health \
&& curl -s -o /dev/null -w "CRM API:  %{http_code}\n" http://localhost:5000/api/internal/crm/dashboard \
&& echo "▶ USD→INR rate endpoint (should print a rate):" && curl -s http://localhost:3000/go/usd-inr && echo \
&& echo "▶ WhatsApp integration:" && curl -s http://localhost:3000/webhook/whatsapp/debug && echo \
&& echo "▶ Last backend log lines (look for 'crashed' or errors):" && pm2 logs backend --lines 40 --nostream \
&& echo "🎉 Verification finished"
```

### 12. Clean up archives

```bash
rm -f ~/Neozaareact.tar.gz ~/neozaar_backend.tar.gz ~/neozaar_portal_frontend_A18.tar.gz && echo "✅ Archives removed"
```

---

## Part C — Updating Env Backup (after changing env vars)

If you change any env vars on the server, update the backup folder so future deploys use the latest:

```bash
echo "▶ Updating env backup..." \
&& cp ~/Neozaareact/.env.local ~/server_backup/env/frontend/.env.local \
&& cp ~/Neozaareact/.env.production ~/server_backup/env/frontend/.env.production \
&& cp ~/Neozaareact/.env.development ~/server_backup/env/frontend/.env.development \
&& echo "✅ 1/3 frontend env backed up" \
&& cp ~/neozaar_backend/.env ~/server_backup/env/backend/.env && echo "✅ 2/3 backend env backed up" \
&& cp ~/neozaar_portal_frontend_A18/src/environments/environment.prod.ts ~/server_backup/env/portal/environment.prod.ts && echo "✅ 3/3 portal env backed up" \
&& echo "🎉 Env backup updated"
```

---

## Part D — Module Specifics

### CRM Module (included in backend + portal)

**Backend files:** `neozaar_backend/src/`
- `routes/crm/crm.routes.js` — All CRM API routes
- `routes/crm/public.leads.routes.js` — Public lead capture (no auth)
- `controllers/crm/` — All CRM controllers (leads, contacts, opportunities, quotes, users, roles, lifecycle engine)
- `middlewares/crm.middleware.js` — CRM access control
- `migrations/` — Database schemas and migration runners

**Frontend files:** `neozaar_portal_frontend_A18/src/app/pages/crm/`
- All CRM components (dashboard, leads, contacts, opportunities, activities, tasks, users, roles, permissions, products, quotes, audit-logs)
- CRM shell with sidebar navigation
- CRM styles (neumorphic design system)

**Access URL:** `https://www.neozaar.com/app/crm`

### Seller/Affiliate Module (included in backend + portal)

**Backend files:** `neozaar_backend/src/`
- `routes/seller.routes.js` — Seller assignments, UTM tracking
- `services/leadService.service.js` — Lead assignment to affiliates

**Frontend files:** `neozaar_portal_frontend_A18/src/app/pages/`
- `seller-dashboard/` — CoSeller and Affiliate dashboard
- `partners/` — Partners management page

**Access URL:** `https://www.neozaar.com/app/seller-dashboard` (for COSELLER/AGENT roles)

### Partner Registration & Partner Pages (included in Neozaareact)

| Page | URL | Code |
|------|-----|------|
| Partner With Us (hub) | `/platform-partners` | `Neozaareact/app/platform-partners/` |
| ISV info site (CoSell360) | `/isv-registration` (+ `/services`, `/pricing`, `/calculator`, `/assessment`) | `Neozaareact/app/isv-registration/` |
| ISV registration form | `/isv-form` | `Neozaareact/app/components/isvclient.js` |
| Solution Partner | `/solution-partner` → `/solution-partner-registration` | |
| Consulting Advisor | `/consulting-advisor` → `/consulting-advisor-registration` | shares `isvclient.js` (`type="revshare"`) |

**CoSell360 assessment form** posts to `POST /api/cosell360/assessment` (backend) and emails the full details to `info@neozaar.com` (override with env `COSELL360_NOTIFY_EMAIL`) plus a copy to the person who filled it.

**Consulting Advisor "Type of Advisor"** is stored in `users.advisor_type` (migration 059) and shown in the admin portal (Consulting Advisors page). The allowed values live in `neozaar_backend/src/config/advisorTypes.js` and must match `ADVISOR_TYPES` in `isvclient.js`.

---

## Rollback (if something breaks)

Replace `YYYYMMDD` with the date from your backup folder name.

```bash
pm2 stop all \
&& echo "▶ Restoring backups..." \
&& rm -rf ~/Neozaareact && mv ~/Neozaareact_bak_YYYYMMDD ~/Neozaareact && echo "✅ 1/3 Neozaareact restored" \
&& rm -rf ~/neozaar_backend && mv ~/neozaar_backend_bak_YYYYMMDD ~/neozaar_backend && echo "✅ 2/3 backend restored" \
&& rm -rf ~/neozaar_portal_frontend_A18 && mv ~/neozaar_portal_frontend_A18_bak_YYYYMMDD ~/neozaar_portal_frontend_A18 && echo "✅ 3/3 portal restored" \
&& echo "▶ Rebuilding storefront..." && cd ~/Neozaareact && npm ci && npm run build && echo "✅ Storefront rebuilt" \
&& echo "▶ Reinstalling backend dependencies..." && cd ~/neozaar_backend && npm ci --omit=dev && echo "✅ Backend dependencies installed" \
&& echo "▶ Republishing portal..." && rm -rf /var/www/html/app/* && cp -r ~/neozaar_portal_frontend_A18/dist/neozaar-portal-frontend/browser/* /var/www/html/app/ && echo "✅ Portal republished" \
&& pm2 restart all && echo "🎉 Rollback complete"
```

> The portal backup includes its previous `dist/` build, so it is republished without rebuilding. If `dist/` is missing from the backup, rebuild with `npm ci && npm run build:prod` in the portal folder first.
>
> **Database changes are not rolled back** by this. Migrations are additive and idempotent, so the previous code keeps working with the newer schema.

---

## Deploying Only One App

If you only changed one project, skip the others. All three follow the same pattern: **archive → upload → backup → stop → extract → restore env → install/build → restart → clean up**.

### Storefront only (Next.js — marketplace, CoSell360, registration forms)

```powershell
# Windows
cd C:\Users\HP\Music\Yuvi\Neozaar
tar -czf Neozaareact.tar.gz --exclude="Neozaareact/node_modules" --exclude="Neozaareact/.next" --exclude="Neozaareact/.next-dev" --exclude="Neozaareact/.git" --exclude=".env*" --exclude="*.log" Neozaareact
scp Neozaareact.tar.gz root@72.61.244.75:~/
```

```bash
# Server
echo "▶ Step 1/7: Backing up..." && cp -r ~/Neozaareact ~/Neozaareact_bak_$(date +%Y%m%d) && echo "✅ Step 1/7 done: backup created" \
&& echo "▶ Step 2/7: Stopping react-app..." && pm2 stop react-app && echo "✅ Step 2/7 done: react-app stopped" \
&& echo "▶ Step 3/7: Extracting new code..." && rm -rf ~/Neozaareact && tar -xzf ~/Neozaareact.tar.gz -C ~/ && echo "✅ Step 3/7 done: code extracted" \
&& echo "▶ Step 4/7: Restoring env files..." && cp ~/server_backup/env/frontend/.env.local ~/Neozaareact/.env.local && cp ~/server_backup/env/frontend/.env.production ~/Neozaareact/.env.production && cp ~/server_backup/env/frontend/.env.development ~/Neozaareact/.env.development && echo "✅ Step 4/7 done: env restored" \
&& echo "▶ Step 5/7: Installing dependencies and building..." && cd ~/Neozaareact && npm ci && npm run build && echo "✅ Step 5/7 done: build finished" \
&& echo "▶ Step 6/7: Restarting react-app..." && pm2 restart react-app && echo "✅ Step 6/7 done: react-app restarted" \
&& echo "▶ Step 7/7: Cleaning up archive..." && rm -f ~/Neozaareact.tar.gz && echo "✅ Step 7/7 done" \
&& echo "🎉 Storefront deployed successfully"
```

### Backend only (API + CRM + Seller)

```powershell
# Windows
cd C:\Users\HP\Music\Yuvi\Neozaar
tar -czf neozaar_backend.tar.gz --exclude="neozaar_backend/node_modules" --exclude="neozaar_backend/.git" --exclude=".env*" --exclude="*.log" neozaar_backend
scp neozaar_backend.tar.gz root@72.61.244.75:~/
```

Replace `<MIGRATION_RUNNER>` below with the migration(s) not yet applied (e.g. `run_059_advisor_type.js`), or remove that step if there are none.

```bash
# Server
echo "▶ Step 1/7: Backing up..." && cp -r ~/neozaar_backend ~/neozaar_backend_bak_$(date +%Y%m%d) && echo "✅ Step 1/7 done: backup created" \
&& echo "▶ Step 2/7: Stopping backend..." && pm2 stop backend && echo "✅ Step 2/7 done: backend stopped" \
&& echo "▶ Step 3/7: Extracting new code..." && rm -rf ~/neozaar_backend && tar -xzf ~/neozaar_backend.tar.gz -C ~/ && echo "✅ Step 3/7 done: code extracted" \
&& echo "▶ Step 4/7: Restoring env file..." && cp ~/server_backup/env/backend/.env ~/neozaar_backend/.env && echo "✅ Step 4/7 done: env restored" \
&& echo "▶ Step 5/7: Installing dependencies..." && cd ~/neozaar_backend && npm ci --omit=dev && echo "✅ Step 5/7 done: dependencies installed" \
&& echo "▶ Step 6/7: Running migration..." && node src/migrations/<MIGRATION_RUNNER> && echo "✅ Step 6/7 done: migration applied" \
&& echo "▶ Step 7/7: Restarting backend..." && pm2 restart backend && rm -f ~/neozaar_backend.tar.gz && echo "✅ Step 7/7 done: backend restarted" \
&& echo "🎉 Backend deployed successfully"
```

### Portal only (Angular — Admin + CRM UI)

```powershell
# Windows
cd C:\Users\HP\Music\Yuvi\Neozaar
tar -czf neozaar_portal_frontend_A18.tar.gz --exclude="neozaar_portal_frontend_A18/node_modules" --exclude="neozaar_portal_frontend_A18/.git" --exclude="neozaar_portal_frontend_A18/dist" --exclude="neozaar_portal_frontend_A18/.angular" --exclude="*.log" neozaar_portal_frontend_A18
scp neozaar_portal_frontend_A18.tar.gz root@72.61.244.75:~/
```

```bash
# Server
echo "▶ Step 1/7: Backing up..." && cp -r ~/neozaar_portal_frontend_A18 ~/neozaar_portal_frontend_A18_bak_$(date +%Y%m%d) && echo "✅ Step 1/7 done: backup created" \
&& echo "▶ Step 2/7: Extracting new code..." && rm -rf ~/neozaar_portal_frontend_A18 && tar -xzf ~/neozaar_portal_frontend_A18.tar.gz -C ~/ && echo "✅ Step 2/7 done: code extracted" \
&& echo "▶ Step 3/7: Restoring env file..." && cp ~/server_backup/env/portal/environment.prod.ts ~/neozaar_portal_frontend_A18/src/environments/environment.prod.ts && echo "✅ Step 3/7 done: env restored" \
&& echo "▶ Step 4/7: Installing dependencies..." && cd ~/neozaar_portal_frontend_A18 && npm ci && echo "✅ Step 4/7 done: dependencies installed" \
&& echo "▶ Step 5/7: Building portal (production)..." && npm run build:prod && echo "✅ Step 5/7 done: build finished" \
&& echo "▶ Step 6/7: Publishing to /var/www/html/app/..." && rm -rf /var/www/html/app/* && cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/app/ && echo "✅ Step 6/7 done: portal published" \
&& echo "▶ Step 7/7: Cleaning up archive..." && rm -f ~/neozaar_portal_frontend_A18.tar.gz && echo "✅ Step 7/7 done" \
&& echo "🎉 Portal deployed successfully"
```

> The portal is static — no PM2 restart needed.

---

## Database Migrations

Every numbered migration from 037 onward has a runner named `run_NNN_*.js` in `neozaar_backend/src/migrations/`. Run one with:

```bash
cd ~/neozaar_backend && node src/migrations/run_NNN_name.js
```

- All migrations are **idempotent** (`IF NOT EXISTS` / safe to re-run).
- Run them **after** `npm ci --omit=dev` and **before** restarting the backend.
- Run them in numeric order. If a later one fails because a table "does not exist", an earlier migration was skipped or failed — fix that one first and re-run the chain.

**Applied on production so far:** everything up to and including **059** (`run_059_advisor_type.js` adds `users.advisor_type` and backfills existing Consulting Advisors as "Compliance Advisors").

Recent runners for reference:

| Migration | Runner | Purpose |
|-----------|--------|---------|
| 041 | `run_041_add_primary_business_outcome_to_products.js`, `run_041_catalog_hero_banner.js` | Product outcomes, catalog hero banner |
| 042 | `run_042_marketing.js` | Marketing base tables |
| 043–044 | `run_043_044_marketing.js` | Marketing identity |
| 045–046 | `run_045_046_marketing.js` | Marketing |
| 047 | `run_047_marketing.js` | Marketing |
| 048–049 | `run_048_049_marketing.js` | Marketing |
| 050–052 | `run_050_052_marketing.js` | Marketing channels / admin |
| 053 | `run_053_social_auth.js` | Google / LinkedIn / Microsoft login |
| 054 | `run_054_marketing_consent.js` | Marketing consent |
| 055 | `run_055_marketing_lead_scoring.js` | Lead scoring |
| 056 | `run_056_marketing_automation_scheduling.js` | Automation scheduling |
| 057 | `run_057_marketing_crm_handoff_retry.js` | CRM handoff retry |
| 058 | `run_058_marketing_worker_heartbeats.js` | Worker heartbeats |
| 059 | `run_059_advisor_type.js` | Consulting Advisor type + backfill |
| 059 | `run_059_marketing_content_contacts_campaigns.js` | Marketing content, contact administration, and campaign links including `email_template_id` |
| 060 | `run_060_marketing_channels_experiments_operations.js` | Marketing channels, experiments, and operations |
| 061 | `run_061_campaign_studio.js` | Campaign Studio type, subject, preheader, visual blocks, and HTML content |
| 062 | `run_062_marketing_role.js` | Dedicated Marketing role and permissions |

> Migration number 059 has two independent runners. Run both `run_059_advisor_type.js` and `run_059_marketing_content_contacts_campaigns.js` before continuing to 060.

### CRM tables (first deploy only)

```bash
cd ~/neozaar_backend && node src/migrations/run_crm_v2.js && echo "✅ CRM migration applied"
```

This creates:
- `crm_contacts`, `crm_leads`, `crm_lead_score_history`
- `crm_opportunities`, `crm_opportunity_stage_history`
- `crm_quotes`, `crm_sales_orders`, `crm_invoices`
- `crm_activities`, `crm_tasks`, `crm_cases`
- `crm_documents`, `crm_audit_logs`, `crm_notifications`
- `crm_roles`, `crm_user_roles`, `crm_automation_rules`
- All indexes + default roles + automation rules

---

## Quick Reference — Useful Commands

| Task | Command |
|------|---------|
| Check PM2 status | `pm2 status` |
| View frontend logs | `pm2 logs react-app` |
| View backend logs | `pm2 logs backend` |
| Restart frontend only | `pm2 restart react-app` |
| Restart backend only | `pm2 restart backend` |
| Restart all | `pm2 restart all` |
| Check Apache | `systemctl status apache2` |
| Check PostgreSQL | `systemctl status postgresql` |
| Connect to DB | `psql -U devuser -d proddb` |
| Run CRM migration | `cd ~/neozaar_backend && node src/migrations/run_crm_v2.js` |
| Check CRM tables | `psql -U devuser -d proddb -c "\dt crm_*"` |
| Check advisor types | `psql -U devuser -d proddb -c "SELECT advisor_type, COUNT(*) FROM users WHERE role_type='AGENT' GROUP BY 1"` |

---

## WhatsApp Bot — Meta Webhook Setup

Only needed once (or if URL changes).

Go to: [Meta Developer Console](https://developers.facebook.com/apps/) → Your App → WhatsApp → Configuration

| Field | Value |
|-------|-------|
| Callback URL | `https://www.neozaar.com/webhook/whatsapp` |
| Verify Token | `neozaar123` |

Click **Verify and Save**, then subscribe to **"messages"** webhook field.

---

## Debug Endpoints

| URL | Purpose |
|-----|---------|
| `/webhook/whatsapp/debug` | Check DB connection, env vars, product count |
| `/webhook/whatsapp/debug-bigin` | Test Bigin CRM lead creation |
| `/health` | Backend health check |
| `/api/internal/crm/dashboard` | CRM API (requires auth) |
| `/go/usd-inr` | Live USD→INR rate used by the CoSell360 ROI calculator |

---

## Notes

- Always backup before deploying
- The `server_backup/env/` folder has the canonical env files — update them when you change env vars
- WhatsApp token may expire — regenerate from Meta Developer Console if bot stops responding
- Bigin refresh token is long-lived but if it stops working, regenerate from [api-console.zoho.in](https://api-console.zoho.in)
- After changing env vars on the server, always run Part C to update the backup folder
- Migrations are idempotent (safe to run multiple times)
- `CRM/` and `Seller/` folders in the project root are documentation only — actual code is in backend + portal
- Production OAuth callback URIs must be registered in each provider's console: `https://www.neozaar.com/api/oauth/{google,linkedin,microsoft}/callback`
