# NeoZaar — Server & Deployment Reference Guide

> **Last Updated:** July 29, 2026  
> **Server:** `srv1219605` | **IP:** `72.61.251.15`  
> **Domain:** `https://www.neozaar.com`

---

## Table of Contents

1. [Server Overview](#server-overview)
2. [Architecture Diagram](#architecture-diagram)
3. [URL Routing (Apache)](#url-routing-apache)
4. [Applications](#applications)
5. [Database](#database)
6. [Git Repository Setup](#git-repository-setup)
7. [Deployment Steps](#deployment-steps)
8. [Rollback Procedure](#rollback-procedure)
9. [Useful Commands](#useful-commands)
10. [File Locations on Server](#file-locations-on-server)
11. [Environment Variables](#environment-variables)
12. [SSL Certificates](#ssl-certificates)
13. [Security Notes](#security-notes)

---

## Server Overview

| Component | Details |
|-----------|---------|
| **OS** | Ubuntu (root access) |
| **Node.js** | v20.19.6 |
| **npm** | v10.8.2 |
| **Database** | PostgreSQL (running locally, port 5432) |
| **Reverse Proxy** | Apache2 (with SSL on port 443) |
| **Process Manager** | PM2 |
| **Assets Storage** | Azure Blob Storage via SFTP (`neozaarassets.blob.core.windows.net`) |
| **Assets Subdomain** | `assets.neozaar.com` → `/var/www/assets.neozaar.com` |

---

## Architecture Diagram

```
                         Internet
                            │
                            ▼
                   Apache2 (port 80 → 301 redirect to 443)
                   Apache2 (port 443, SSL)
                   www.neozaar.com
                            │
          ┌─────────────────┼───────────────────┬──────────────────┐
          │                 │                   │                  │
          ▼                 ▼                   ▼                  ▼
     /api/*           / (all other)        /app/*             /crm/*
          │                 │                   │                  │
          ▼                 ▼                   ▼                  ▼
   Node.js Backend    Next.js Frontend    Angular Portal     Laravel CRM
   127.0.0.1:5000     127.0.0.1:3000     /var/www/html/app   /var/www/whizzact-
   PM2: "backend"     PM2: "react-app"   (static files)      solutions-app/public
```

**Separate subdomain:**
```
   assets.neozaar.com (port 80) → /var/www/assets.neozaar.com (static files)
```

---

## URL Routing (Apache)

| URL | Destination | Type |
|-----|-------------|------|
| `https://www.neozaar.com/api/*` | `127.0.0.1:5000` (Node.js backend) | Reverse Proxy |
| `https://www.neozaar.com/app/*` | `/var/www/html/app` (Angular) | Static / Alias |
| `https://www.neozaar.com/crm/*` | `/var/www/whizzact-solutions-app/public` (Laravel) | Static / Alias |
| `https://www.neozaar.com/*` | `127.0.0.1:3000` (Next.js) | Reverse Proxy |
| `http://assets.neozaar.com/*` | `/var/www/assets.neozaar.com` | Static |
| `http://www.neozaar.com` | Redirects to `https://` | 301 Redirect |

**Apache config files:**
- `/etc/apache2/sites-enabled/neozaar.conf`
- `/etc/apache2/sites-enabled/assets.neozaar.com.conf`

**Enabled Apache modules:** `proxy`, `proxy_http`, `proxy_wstunnel`, `ssl`, `rewrite`

---

## Applications

### 1. Backend (Node.js / Express)

| Property | Value |
|----------|-------|
| **Framework** | Express.js (Node.js) |
| **Server path** | `~/neozaar_backend` |
| **Entry point** | `server.js` |
| **Port** | 5000 |
| **PM2 process** | `backend` (id: 2) |
| **Start command** | `npm start` → `node server.js` |
| **Database** | PostgreSQL (`proddb`) |
| **Cron jobs** | `seo.cron`, `brandSeo.cron`, `productSync.cron` |

### 2. Frontend (Next.js / React)

| Property | Value |
|----------|-------|
| **Framework** | Next.js 15 (React 19) |
| **Server path** | `~/Neozaareact` |
| **Port** | 3000 |
| **PM2 process** | `react-app` (id: 1) |
| **Build command** | `npm run build` |
| **Start command** | `npm start` → `next start` |

### 3. Admin Portal (Angular 18)

| Property | Value |
|----------|-------|
| **Framework** | Angular 18 |
| **Server path** | `~/neozaar_portal_frontend_A18` (source) |
| **Deployed to** | `/var/www/html/app/` (static build output) |
| **Base href** | `/app/` |
| **Build command** | `npm run build:prod` |
| **Build output** | `dist/neozaar-portal-frontend/browser/` |
| **Not a PM2 process** | Apache serves static files directly |

### 4. CRM (Laravel)

| Property | Value |
|----------|-------|
| **Framework** | Laravel (PHP) |
| **Server path** | `/var/www/whizzact-solutions-app/public` |
| **URL** | `https://www.neozaar.com/crm/` |

---

## Database

| Property | Value |
|----------|-------|
| **Engine** | PostgreSQL 16.14 |
| **Host** | localhost |
| **Port** | 5432 |
| **Database name** | `proddb` |
| **User** | `devuser` |
| **Password** | *(see `.env` on server)* |
| **Connection** | Uses `pg` Pool in `src/config/database.js` |
| **Local dump file** | `proddb.sql` (in project_backup root) |

### Local Database Dump (`proddb.sql`)

The file `proddb.sql` in the project backup root is a **full database dump** (schema + data) containing:
- All table definitions, functions, constraints, and indexes
- All row data (products, services, brochures, categories, users, etc.)
- Brochure PDFs are stored as Azure Blob URLs in the `brochures` column (type `text[]`) of the products table
- Source: PostgreSQL 16.14 (Ubuntu), dumped from the server

This is the most up-to-date and polished version of the database.

### Common DB Commands

```bash
# Connect to database
psql -U devuser -d proddb

# Backup database
pg_dump -U devuser proddb > ~/proddb_backup_$(date +%Y%m%d).sql

# Restore database
psql -U devuser proddb < ~/proddb_backup_YYYYMMDD.sql

# List tables
psql -U devuser -d proddb -c "\dt"

# Check database size
psql -U devuser -d proddb -c "SELECT pg_size_pretty(pg_database_size('proddb'));"
```

### Deploying Local DB to Server (Full Replace)

Use this when your local `proddb.sql` is more up-to-date than the server DB.

⚠️ **This replaces ALL data on the server.** Only do this if the server data is outdated or you're okay losing it.

**Step 1 — Upload dump from Windows:**
```powershell
scp C:\Users\smart\Desktop\Backup\project_backup\proddb.sql root@72.61.251.15:~/local_proddb.sql
```

**Step 2 — On server — backup, drop, restore:**
```bash
# Backup current server DB (safety net)
pg_dump -U devuser proddb > ~/proddb_server_backup_$(date +%Y%m%d).sql

# Stop backend to prevent writes during restore
pm2 stop backend

# Drop and recreate the database
psql -U devuser -d postgres -c "DROP DATABASE proddb;"
psql -U devuser -d postgres -c "CREATE DATABASE proddb OWNER devuser;"

# Restore from local dump
psql -U devuser -d proddb < ~/local_proddb.sql

# Restart backend
pm2 restart backend
sleep 3
pm2 logs backend --lines 10 --nostream

# Verify DB is working
curl -s http://localhost:5000/health
```

**Step 3 — Verify data:**
```bash
psql -U devuser -d proddb -c "SELECT COUNT(*) FROM products;"
psql -U devuser -d proddb -c "SELECT id, title FROM products WHERE brochures IS NOT NULL LIMIT 5;"
```

### Schema-Only Migration (Keep Server Data, Update Structure)

Use this when the server has real production data you want to keep, but your local DB has newer tables/columns.

**Step 1 — Export schemas for comparison:**
```bash
# On server
pg_dump -U devuser -d proddb --schema-only > ~/server_schema.sql
```

```powershell
# On local machine
pg_dump -U devuser -d proddb --schema-only > local_schema.sql
```

**Step 2 — Compare schemas:**
```powershell
# Upload local schema to server for diff
scp local_schema.sql root@72.61.251.15:~/local_schema.sql
```

```bash
# On server — compare
diff ~/server_schema.sql ~/local_schema.sql > ~/schema_diff.txt
cat ~/schema_diff.txt
```

**Step 3 — Write and apply migration SQL for differences (new tables, altered columns, etc.)**

### Exporting Your Local DB (Fresh Dump)

If you need to create a new dump from your local database:

```powershell
# Full dump (schema + data)
pg_dump -U devuser -d proddb > proddb.sql

# Schema only
pg_dump -U devuser -d proddb --schema-only > proddb_schema.sql

# Data only (for inserting into existing schema)
pg_dump -U devuser -d proddb --data-only > proddb_data.sql
```

---

## Git Repository Setup

### Current State (Old — from previous team)

The repos were originally under `github.com/durgesh1310` with an embedded PAT token. This has been migrated to your own GitHub account.

### Migration Steps (One-Time Setup)

#### 1. Create new empty repos on your GitHub account

Create these 3 repos on GitHub (empty, no README):
- `Neo-Admin1127/neozaar_backend`
- `Neo-Admin1127/Neozaareact`
- `Neo-Admin1127/neozaar_portal_frontend_A18`

#### 2. Push local code to your repos (from Windows machine)

```powershell
# Backend
cd c:\Users\smart\Desktop\Backup\project_backup\neozaar_backend
git remote set-url origin https://github.com/Neo-Admin1127/neozaar_backend.git
git push -u origin main

# Frontend (Next.js)
cd c:\Users\smart\Desktop\Backup\project_backup\Neozaareact
git remote set-url origin https://github.com/Neo-Admin1127/Neozaareact.git
git push -u origin main

# Angular Portal
cd c:\Users\smart\Desktop\Backup\project_backup\neozaar_portal_frontend_A18
git remote set-url origin https://github.com/Neo-Admin1127/neozaar_portal_frontend_A18.git
git push -u origin main
```

#### 3. Update remotes on the server

```bash
# Backend
cd ~/neozaar_backend
git remote set-url origin https://github.com/Neo-Admin1127/neozaar_backend.git
git fetch origin
git branch --set-upstream-to=origin/main main

# Frontend (Next.js)
cd ~/Neozaareact
git remote set-url origin https://github.com/Neo-Admin1127/Neozaareact.git
git fetch origin
git branch --set-upstream-to=origin/main main

# Angular Portal
cd ~/neozaar_portal_frontend_A18
git remote set-url origin https://github.com/Neo-Admin1127/neozaar_portal_frontend_A18.git
git fetch origin
git branch --set-upstream-to=origin/main main
```

#### 4. Set up server authentication (choose one)

**Option A — Personal Access Token (quick):**

Generate a PAT on GitHub: Settings → Developer settings → Personal access tokens → Fine-grained tokens

```bash
# Set remote with token (replace YOUR_PAT and Neo-Admin1127)
cd ~/neozaar_backend
git remote set-url origin https://YOUR_PAT@github.com/Neo-Admin1127/neozaar_backend.git

cd ~/Neozaareact
git remote set-url origin https://YOUR_PAT@github.com/Neo-Admin1127/Neozaareact.git

cd ~/neozaar_portal_frontend_A18
git remote set-url origin https://YOUR_PAT@github.com/Neo-Admin1127/neozaar_portal_frontend_A18.git
```

**Option B — SSH key (more secure, recommended):**

```bash
# Generate SSH key on server
ssh-keygen -t ed25519 -C "neozaar-server-deploy" -f ~/.ssh/id_ed25519 -N ""
cat ~/.ssh/id_ed25519.pub
# Copy this public key → GitHub → Settings → SSH and GPG keys → New SSH key

# Change remotes to SSH format
cd ~/neozaar_backend
git remote set-url origin git@github.com:Neo-Admin1127/neozaar_backend.git

cd ~/Neozaareact
git remote set-url origin git@github.com:Neo-Admin1127/Neozaareact.git

cd ~/neozaar_portal_frontend_A18
git remote set-url origin git@github.com:Neo-Admin1127/neozaar_portal_frontend_A18.git

# Test connection
ssh -T git@github.com
```

#### 5. Verify the setup

```bash
cd ~/neozaar_backend && git pull origin main
cd ~/Neozaareact && git pull origin main
cd ~/neozaar_portal_frontend_A18 && git pull origin main
```

---

## Deployment Steps

### Pre-Deployment Checklist

- [ ] SSH into server: `ssh root@72.61.251.15`
- [ ] Take backups (code + database)
- [ ] Ensure local code builds without errors
- [ ] Push all changes to `main` branch on GitHub
- [ ] Confirm no breaking DB schema changes (or prepare migration)

### Step 0 — Backup Everything (on server)

```bash
cp -r ~/neozaar_backend ~/neozaar_backend_bak_$(date +%Y%m%d)
cp -r ~/Neozaareact ~/Neozaareact_bak_$(date +%Y%m%d)
cp -r /var/www/html/app /var/www/html/app_bak_$(date +%Y%m%d)
pg_dump -U devuser proddb > ~/proddb_bak_$(date +%Y%m%d).sql
```

### Step 1 — Push from Local (on your Windows machine)

```powershell
# Backend
cd c:\Users\smart\Desktop\Backup\project_backup\neozaar_backend
git add .
git commit -m "describe your changes"
git push origin main

# Frontend
cd c:\Users\smart\Desktop\Backup\project_backup\Neozaareact
git add .
git commit -m "describe your changes"
git push origin main

# Angular Portal
cd c:\Users\smart\Desktop\Backup\project_backup\neozaar_portal_frontend_A18
git add .
git commit -m "describe your changes"
git push origin main
```

### Step 2 — Deploy Backend (on server)

```bash
cd ~/neozaar_backend
git pull origin main
npm ci --omit=dev
pm2 restart backend
sleep 3
pm2 logs backend --lines 15 --nostream

# Verify
curl -s http://localhost:5000/health
```

### Step 3 — Deploy Frontend / Next.js (on server)

```bash
cd ~/Neozaareact
git pull origin main
npm ci
npm run build
pm2 restart react-app
sleep 3
pm2 logs react-app --lines 15 --nostream

# Verify
curl -s -o /dev/null -w "Status: %{http_code}\n" http://localhost:3000
```

### Step 4 — Deploy Angular Portal (on server)

```bash
cd ~/neozaar_portal_frontend_A18
git pull origin main
npm ci
npm run build:prod
rm -rf /var/www/html/app/*
cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/app/

# Verify
curl -s -o /dev/null -w "Status: %{http_code}\n" https://www.neozaar.com/app/
```

### Step 5 — Final Verification

```bash
pm2 status
curl -s http://localhost:5000/health
curl -s -o /dev/null -w "Backend API: %{http_code}\n" https://www.neozaar.com/api/products
curl -s -o /dev/null -w "Frontend: %{http_code}\n" https://www.neozaar.com/
curl -s -o /dev/null -w "Angular Portal: %{http_code}\n" https://www.neozaar.com/app/
```

---

## Quick Deploy Script (All-in-One)

Save this as `~/deploy.sh` on the server and run with `bash ~/deploy.sh`:

```bash
#!/bin/bash
set -e

echo "===== BACKING UP ====="
cp -r ~/neozaar_backend ~/neozaar_backend_bak_$(date +%Y%m%d)
cp -r ~/Neozaareact ~/Neozaareact_bak_$(date +%Y%m%d)
cp -r /var/www/html/app /var/www/html/app_bak_$(date +%Y%m%d)
pg_dump -U devuser proddb > ~/proddb_bak_$(date +%Y%m%d).sql

echo "===== PULLING LATEST CODE ====="
cd ~/neozaar_backend && git pull origin main
cd ~/Neozaareact && git pull origin main
cd ~/neozaar_portal_frontend_A18 && git pull origin main

echo "===== DEPLOYING BACKEND ====="
cd ~/neozaar_backend
npm ci --omit=dev
pm2 restart backend

echo "===== DEPLOYING FRONTEND (Next.js) ====="
cd ~/Neozaareact
npm ci
npm run build
pm2 restart react-app

echo "===== DEPLOYING ANGULAR PORTAL ====="
cd ~/neozaar_portal_frontend_A18
npm ci
npm run build:prod
rm -rf /var/www/html/app/*
cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/app/

echo "===== VERIFYING ====="
pm2 status
curl -s http://localhost:5000/health
echo ""
echo "✅ Deployment complete!"
```

### Quick Deploy Script — With DB Restore

Save this as `~/deploy_with_db.sh` on the server. Use when you also need to push your local DB:

```bash
#!/bin/bash
set -e

echo "===== BACKING UP ====="
cp -r ~/neozaar_backend ~/neozaar_backend_bak_$(date +%Y%m%d)
cp -r ~/Neozaareact ~/Neozaareact_bak_$(date +%Y%m%d)
cp -r /var/www/html/app /var/www/html/app_bak_$(date +%Y%m%d)
pg_dump -U devuser proddb > ~/proddb_server_backup_$(date +%Y%m%d).sql

echo "===== RESTORING DATABASE ====="
pm2 stop backend
psql -U devuser -d postgres -c "DROP DATABASE proddb;"
psql -U devuser -d postgres -c "CREATE DATABASE proddb OWNER devuser;"
psql -U devuser -d proddb < ~/local_proddb.sql
echo "✅ Database restored"

echo "===== PULLING LATEST CODE ====="
cd ~/neozaar_backend && git pull origin main
cd ~/Neozaareact && git pull origin main
cd ~/neozaar_portal_frontend_A18 && git pull origin main

echo "===== DEPLOYING BACKEND ====="
cd ~/neozaar_backend
npm ci --omit=dev
pm2 restart backend

echo "===== DEPLOYING FRONTEND (Next.js) ====="
cd ~/Neozaareact
npm ci
npm run build
pm2 restart react-app

echo "===== DEPLOYING ANGULAR PORTAL ====="
cd ~/neozaar_portal_frontend_A18
npm ci
npm run build:prod
rm -rf /var/www/html/app/*
cp -r dist/neozaar-portal-frontend/browser/* /var/www/html/app/

echo "===== VERIFYING ====="
pm2 status
curl -s http://localhost:5000/health
psql -U devuser -d proddb -c "SELECT COUNT(*) as total_products FROM products;"
echo ""
echo "✅ Full deployment (code + database) complete!"
```

**Before running `deploy_with_db.sh`, upload your local dump first:**
```powershell
scp C:\Users\smart\Desktop\Backup\project_backup\proddb.sql root@72.61.251.15:~/local_proddb.sql
```

---

## Rollback Procedure

If something breaks after deployment:

```bash
# Rollback Backend
rm -rf ~/neozaar_backend
mv ~/neozaar_backend_bak_YYYYMMDD ~/neozaar_backend
cd ~/neozaar_backend && npm ci --omit=dev && pm2 restart backend

# Rollback Frontend
rm -rf ~/Neozaareact
mv ~/Neozaareact_bak_YYYYMMDD ~/Neozaareact
cd ~/Neozaareact && npm ci && npm run build && pm2 restart react-app

# Rollback Angular Portal
rm -rf /var/www/html/app
mv /var/www/html/app_bak_YYYYMMDD /var/www/html/app

# Rollback Database (CAUTION: this overwrites current data)
psql -U devuser proddb < ~/proddb_bak_YYYYMMDD.sql
```

---

## Useful Commands

### PM2

```bash
pm2 status                    # List all processes
pm2 logs backend              # Tail backend logs
pm2 logs react-app            # Tail frontend logs
pm2 restart backend           # Restart backend
pm2 restart react-app         # Restart frontend
pm2 restart all               # Restart everything
pm2 describe backend          # Full details of backend process
pm2 monit                     # Real-time monitoring
pm2 save                      # Save current process list (survives reboot)
pm2 startup                   # Generate startup script
```

### Apache

```bash
systemctl status apache2          # Check Apache status
systemctl restart apache2         # Restart Apache
apache2ctl -t                     # Test config syntax
apache2ctl -M                     # List enabled modules
tail -f /var/log/apache2/app-error.log     # Watch error logs
tail -f /var/log/apache2/app-access.log    # Watch access logs
```

### PostgreSQL

```bash
systemctl status postgresql       # Check PG status
psql -U devuser -d proddb         # Connect to DB
pg_dump -U devuser proddb > backup.sql    # Backup
```

### General

```bash
df -h                             # Disk usage
free -h                           # Memory usage
htop                              # System resources
netstat -tlnp                     # Open ports
```

---

## File Locations on Server

```
/root/
├── neozaar_backend/              # Backend source code (git repo)
│   ├── src/
│   │   ├── app.js               # Main Express app
│   │   ├── config/database.js   # PostgreSQL connection
│   │   ├── routes/              # API routes
│   │   ├── models/              # Data models
│   │   ├── middlewares/         # Auth, context middleware
│   │   └── jobs/                # Cron jobs (SEO, product sync)
│   ├── server.js                # Entry point (port 5000)
│   ├── .env                     # Production env vars (DO NOT OVERWRITE)
│   └── package.json
│
├── Neozaareact/                  # Next.js frontend source (git repo)
│   ├── app/                     # Next.js app directory
│   ├── .env.production          # Production env vars (DO NOT OVERWRITE)
│   └── package.json
│
├── neozaar_portal_frontend_A18/  # Angular admin portal source (git repo)
│   ├── src/
│   │   └── environments/
│   │       ├── environment.ts        # Dev config
│   │       └── environment.prod.ts   # Prod config (apiUrl, baseHref)
│   ├── angular.json
│   └── package.json
│
├── assets/                       # Local assets
├── proddb.sql                    # Database dump (full — schema + data, latest polished version)
├── project_backup.zip            # Old backup
└── deploy.sh                     # Deployment script (create this)

/var/www/
├── html/app/                     # Angular portal (built static files)
├── assets.neozaar.com/           # assets.neozaar.com document root
└── whizzact-solutions-app/       # Laravel CRM
    └── public/

/etc/apache2/sites-enabled/
├── neozaar.conf                  # Main site config (SSL, proxy rules)
└── assets.neozaar.com.conf       # Assets subdomain config

/etc/ssl/neozaar/
├── neozaar_com.crt               # SSL certificate
└── neozaar.key                   # SSL private key
```

---

## Environment Variables

### Backend (`~/neozaar_backend/.env`) — DO NOT OVERWRITE ON SERVER

| Variable | Production Value |
|----------|-----------------|
| PORT | 5000 |
| DB_HOST | localhost |
| DB_PORT | 5432 |
| DB_NAME | proddb |
| DB_USER | devuser |
| DB_PASSWORD | *(check server)* |
| JWT_SECRET | *(check server)* |
| JWT_EXPIRES_IN | 24h |
| AZURE_SFTP_HOST | neozaarassets.blob.core.windows.net |
| AZURE_SFTP_PORT | 22 |
| AZURE_SFTP_USER | neozaarassets.assets.developer |
| FRONTEND_URL | https://neozaar.com/ |
| CRM_EMAIL | *(check server)* |
| CRM_PASSWORD | *(check server)* |

### Frontend (`~/Neozaareact/.env.production`) — DO NOT OVERWRITE ON SERVER

| Variable | Production Value |
|----------|-----------------|
| NEXT_PUBLIC_API_BASE | https://www.neozaar.com/api/ |
| NEXT_PUBLIC_ADMIN_URL | https://www.neozaar.com/app |

### Angular Portal (`src/environments/environment.prod.ts`)

| Variable | Production Value |
|----------|-----------------|
| apiUrl | https://www.neozaar.com/api/ |
| frontendUrl | https://www.neozaar.com/ |
| baseHref | /app/ |

---

## SSL Certificates

| File | Path |
|------|------|
| Certificate | `/etc/ssl/neozaar/neozaar_com.crt` |
| Private Key | `/etc/ssl/neozaar/neozaar.key` |

**Check expiry:**
```bash
openssl x509 -enddate -noout -in /etc/ssl/neozaar/neozaar_com.crt
```

**If expired, renew and restart Apache:**
```bash
# After placing new cert files:
systemctl restart apache2
```

---

## Security Notes

### ⚠️ CRITICAL: Malicious GitHub Actions Workflow

The file `.github/workflows/github_actions_security.yml` in the backend repo is **MALICIOUS**. It exfiltrates SSH secrets to an external domain (`carte-avantage.com`).

**Actions required:**
1. ✅ Delete `.github/workflows/github_actions_security.yml` from the repo
2. ✅ Rotate all SSH keys
3. ✅ Change DB password and all secrets
4. ✅ Audit git history to find when it was introduced
5. ✅ Revoke the old PAT token (`ghp_Pi5c...`) if you have access to that account

### General Security

- `.env` files must be in `.gitignore` — never commit secrets
- PAT tokens embedded in git URLs should be replaced with SSH keys
- Regularly update Node.js and dependencies for security patches
- Monitor Apache access logs for suspicious activity

---

## Contacts & Access

| Item | Details |
|------|---------|
| Server SSH | `ssh root@72.61.251.15` (hostname: `srv1219605`) |
| Domain | neozaar.com (DNS managed externally) |
| Azure Assets SFTP | `neozaarassets.blob.core.windows.net:22` |
| GitHub Repos | `github.com/Neo-Admin1127/neozaar_backend`, `Neozaareact`, `neozaar_portal_frontend_A18` |
| Previous GitHub | `github.com/durgesh1310` (old, do not use) |

---

## Troubleshooting

### Backend won't start
```bash
pm2 logs backend --lines 50 --nostream
# Common issues: .env missing, DB not running, port already in use
```

### Frontend build fails
```bash
cd ~/Neozaareact && npm run build 2>&1 | tail -50
# Common issues: missing deps, env vars not set, TypeScript errors
```

### Angular portal shows blank page
```bash
ls /var/www/html/app/index.html
# Check if baseHref is correct in angular.json (should be /app/)
# Check browser console for 404 errors on assets
```

### Database connection refused
```bash
systemctl status postgresql
psql -U devuser -d proddb -c "SELECT 1"
# Check if pg_hba.conf allows local connections
```

### Apache errors
```bash
apache2ctl -t                              # Syntax check
tail -20 /var/log/apache2/app-error.log    # Recent errors
systemctl restart apache2                  # Restart after config changes
```

### PM2 processes crash on reboot
```bash
pm2 save        # Save current process list
pm2 startup     # Generate startup script
# Run the command it outputs
```
