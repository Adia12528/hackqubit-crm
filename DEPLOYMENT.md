# 🚀 HackQubit CRM — Complete Deployment Guide

> Self-hosted CRM stack: **Twenty CRM + Chatwoot + n8n + MinIO + Asterisk**

---

## Prerequisites

Make sure you have installed:
- **Docker Desktop** (Windows/Mac) or Docker Engine (Linux) — [Install](https://docs.docker.com/get-docker/)
- **Docker Compose** v2+ (included with Docker Desktop)
- **Git**
- At least **8 GB RAM** and **20 GB disk** available

---

## ⚡ Quick Start (3 commands)

```powershell
# 1. Clone the repository
git clone https://github.com/your-team/hackqubit-crm.git
cd hackqubit-crm

# 2. Set up environment variables
copy .env.example .env
# (Edit .env with your preferred editor — notepad .env)

# 3. Launch everything
docker compose up -d
```

That's it! Wait ~2 minutes for all services to initialize, then visit:

| Service | URL | Credentials |
|---------|-----|-------------|
| **Twenty CRM** | http://localhost:3000 | superadmin@hackqubit.local / Admin@HackQubit2026! |
| **Chatwoot** | http://localhost:3001 | Set during first-run wizard |
| **n8n Automation** | http://localhost:5678 | admin / admin123 |
| **MinIO Console** | http://localhost:9001 | minioadmin / minioadmin_secret |
| **MailHog (Email test)** | http://localhost:8025 | No auth needed |

---

## 📋 Step-by-Step Deployment

### Step 1 — Clone & Configure

```powershell
git clone https://github.com/your-team/hackqubit-crm.git
cd hackqubit-crm

# Copy the env template
copy .env.example .env
```

Open `.env` and update at minimum:
- `TWENTY_APP_SECRET` — generate with: `openssl rand -hex 32`
- `CHATWOOT_SECRET_KEY` — generate with: `openssl rand -hex 64`
- `MINIO_ROOT_PASSWORD` — set a strong password

### Step 2 — Launch Services

```powershell
# Start all containers in detached mode
docker compose up -d

# Watch logs to confirm startup (Ctrl+C to exit)
docker compose logs -f

# Check all containers are running
docker compose ps
```

**Expected output (all should show "running"):**

```
NAME                   STATUS          PORTS
twenty-db              running         5432/tcp
twenty-redis           running         6379/tcp
twenty-server          running         0.0.0.0:3000->3000/tcp
twenty-worker          running
minio                  running         0.0.0.0:9000->9000/tcp, 0.0.0.0:9001->9001/tcp
minio-init             exited (0)      ← Normal! Ran once to create buckets
chatwoot-db            running         5432/tcp
chatwoot-redis         running         6379/tcp
chatwoot-app           running         0.0.0.0:3001->3000/tcp
chatwoot-worker        running
n8n                    running         0.0.0.0:5678->5678/tcp
mailhog                running         0.0.0.0:1025->1025/tcp, 0.0.0.0:8025->8025/tcp
asterisk               running         0.0.0.0:5060->5060/tcp
```

### Step 3 — Run Database Setup

```powershell
# Run the setup script (bash/WSL on Windows, or bash on Linux/Mac)
bash scripts/setup.sh

# OR manually run the RBAC seed:
docker exec -i twenty-db psql -U twenty -d twenty < scripts/seed-rbac.sql
```

### Step 4 — Configure Chatwoot (First Run)

1. Open http://localhost:3001
2. Complete the **onboarding wizard** — create your admin account
3. Go to **Settings → Inboxes → Add Inbox**:
   - 📧 **Email**: Connect SMTP (use MailHog for testing)
   - 📱 **WhatsApp**: Add WhatsApp Cloud API credentials from `.env`
   - 📞 **Voice**: Add Twilio credentials for calling

### Step 5 — Set Up 5-Tier RBAC in Twenty CRM

1. Open http://localhost:3000
2. Log in as Super Admin
3. Go to **Settings → Workspace → Roles**
4. Create the 5 roles:

| Role | Level | Key Permissions |
|------|-------|-----------------|
| Super Admin | 1 | All modules, all workspaces |
| Admin | 2 | All modules in workspace, manage users |
| Manager | 3 | Team-scoped read/write, reports, assign |
| Sales Executive | 4 | Own records — leads, contacts, deals |
| Support/User | 5 | Read-only contacts + own tasks/notes |

---

## 🔧 Common Commands

```powershell
# Stop all services
docker compose down

# Stop and remove all data (CAUTION: destructive!)
docker compose down -v

# Restart a single service
docker compose restart twenty-server

# View logs for a specific service
docker compose logs -f chatwoot-app

# Update all images
docker compose pull && docker compose up -d

# Backup MinIO data
docker run --rm -v hackqubit-crm_minio-data:/data -v ${PWD}/backup:/backup alpine tar czf /backup/minio-$(date +%Y%m%d).tar.gz /data

# Backup PostgreSQL (Twenty)
docker exec twenty-db pg_dump -U twenty twenty > backup/twenty-$(date +%Y%m%d).sql

# Backup PostgreSQL (Chatwoot)
docker exec chatwoot-db pg_dump -U chatwoot chatwoot > backup/chatwoot-$(date +%Y%m%d).sql
```

---

## 📞 Omni-Channel Configuration

### Email Setup

**For local testing (MailHog — no configuration needed):**
- SMTP: `mailhog:1025`
- View sent emails: http://localhost:8025

**For production (Gmail example):**
```env
EMAIL_SMTP_HOST=smtp.gmail.com
EMAIL_SMTP_PORT=587
EMAIL_SMTP_USER=your@gmail.com
EMAIL_SMTP_PASS=your_16_char_app_password
```

### WhatsApp Business Cloud API

1. Create a Meta Developer Account at https://developers.facebook.com
2. Create an App → Add **WhatsApp Business** product
3. Get your **Phone Number ID** and **Access Token**
4. Update `.env`:
   ```env
   WHATSAPP_PHONE_NUMBER_ID=your_phone_number_id
   WHATSAPP_ACCESS_TOKEN=your_permanent_token
   ```
5. In Chatwoot: **Settings → Inboxes → WhatsApp Cloud API**
6. Set webhook URL: `http://your-server:3001/webhooks/whatsapp`

### Voice Calling (Twilio)

1. Sign up at https://www.twilio.com (free trial gives $15 credit)
2. Get a phone number
3. Update `.env`:
   ```env
   TWILIO_ACCOUNT_SID=ACxxxx
   TWILIO_AUTH_TOKEN=xxxx
   TWILIO_PHONE_NUMBER=+1XXXXXXXXXX
   ```
4. In Chatwoot: **Settings → Inboxes → Voice (Twilio)**
5. Call recordings are automatically saved to MinIO bucket `call-recordings`

### SMS (Twilio)

- Uses same Twilio credentials as Voice
- In Chatwoot: **Settings → Inboxes → SMS (Twilio)**

---

## 🏗️ Architecture Overview

```
                    ┌─────────────────────────────────────┐
                    │         User Browser                  │
                    └──────────┬──────────┬────────────────┘
                               │          │
                    ┌──────────▼──┐  ┌────▼─────────────┐
                    │ Twenty CRM  │  │    Chatwoot        │
                    │ :3000       │  │    :3001           │
                    │ Core CRM    │  │  Email/WA/SMS/Voice│
                    └──────┬──────┘  └────────┬──────────┘
                           │   n8n sync        │
                    ┌──────▼──────────────────▼──────────┐
                    │         n8n Automation :5678         │
                    │   Webhooks · Workflow · Sync         │
                    └──────────────────────────────────────┘
                           │
              ┌────────────┼────────────────────┐
              │            │                    │
    ┌─────────▼──┐  ┌──────▼──────┐  ┌─────────▼──────┐
    │ PostgreSQL │  │   Redis     │  │  MinIO (S3)    │
    │ (2 DBs)   │  │  (2 caches) │  │  :9000/:9001   │
    │ Twenty &  │  │  Twenty &   │  │ call-recordings│
    │ Chatwoot  │  │  Chatwoot   │  │ attachments    │
    └───────────┘  └─────────────┘  └────────────────┘
```

---

## 🔐 Demo Credentials Summary

| Service | Email/User | Password | Role |
|---------|-----------|----------|------|
| Twenty CRM | superadmin@hackqubit.local | Admin@HackQubit2026! | Super Admin |
| Twenty CRM | admin@hackqubit.local | Admin@HackQubit2026! | Admin |
| Twenty CRM | manager@hackqubit.local | Admin@HackQubit2026! | Manager |
| Twenty CRM | sales@hackqubit.local | Admin@HackQubit2026! | Sales Executive |
| Twenty CRM | support@hackqubit.local | Admin@HackQubit2026! | Support User |
| n8n | admin | admin123 | Admin |
| MinIO | minioadmin | minioadmin_secret | Root |

---

## 🛠️ Troubleshooting

### Port already in use
```powershell
# Find what's using the port (e.g., 3000)
netstat -ano | findstr :3000
# Kill the process
taskkill /PID <PID> /F
```

### Twenty CRM not starting
```powershell
docker compose logs twenty-server | Select-String -Pattern "error|Error"
```
Most common cause: `APP_SECRET` not set. Run: `openssl rand -hex 32` and put it in `.env`

### Chatwoot migration failed
```powershell
docker exec chatwoot-app bundle exec rails db:drop db:create db:schema:load db:seed
```

### MinIO buckets missing
```powershell
docker compose restart minio-init
```

---

*HackQubit CRM — Enterprise Cloud & CRM Sponsored Track*
