# HackQubit CRM — Self-Hosted Omni-Channel CRM (EspoCRM Stack)

Production-grade, self-hosted deployment of **EspoCRM** with automated background task processing, real-time WebSocket communication, S3-compatible object storage via MinIO, and omnichannel communication bridges.

For the comparative evaluation and platform selection benchmark, see [`docs/CRM-COMPARISON.md`](file:///c:/Users/USER/Downloads/hackqubit-crm/hackqubit-crm/docs/CRM-COMPARISON.md).

---

## Architecture Overview

```
                  ┌─────────────────────────────┐
                  │     EspoCRM (app)           │  :8080
                  │  Frontend + REST API        │
                  └───────────┬──────┬──────────┘
                              │      │
              ┌───────────────┘      └───────────────┐
              ▼                                      ▼
    ┌───────────────────┐                  ┌──────────────────────┐
    │  espocrm-daemon   │                  │  espocrm-websocket   │ :8081
    │  (background jobs,│                  │  (real-time events)  │
    │   cron, IMAP sync)│                  └──────────────────────┘
    └───────────────────┘
              │
              ▼
    ┌───────────────────┐        ┌──────────────────────┐
    │   espocrm-db      │        │  MinIO Object Store  │ :9000 (API)
    │   (MariaDB 11)    │        │  (S3-compatible:     │ :9001 (Console)
    └───────────────────┘        │   documents & calls) │
                                 └──────────────────────┘

    Omnichannel Integration Bridges (docs/OMNICHANNEL-INTEGRATION.md):
    Email (Native SMTP/IMAP) · WhatsApp Cloud API · SMS Gateway · Voice / WebRTC
    All external channels dispatch records into EspoCRM via authenticated REST API.
```

---

## Services & Ports

| Service | Container | Internal / Host Port | Purpose |
|---|---|---|---|
| **EspoCRM Application** | `espocrm` | `8080` | Web UI and REST API backend |
| **WebSocket Server** | `espocrm-websocket` | `8081` | Real-time push notifications and updates |
| **Daemon / Worker** | `espocrm-daemon` | — | Cron scheduling, queue runner, IMAP sync |
| **Database** | `espocrm-db` | `3306` (internal) | MariaDB 11 persistent datastore |
| **Object Storage API** | `minio` | `9000` | S3-compatible API for files and recordings |
| **MinIO Console** | `minio` | `9001` | Object storage admin web management |

---

## Quick Start (Production Setup)

### 1. Environment Configuration

Clone the configuration template and generate secure credentials:

```bash
cp .env.example .env
```

Edit `.env` and configure production credentials:

```bash
# Database
DB_NAME=espocrm
DB_USER=espocrm
DB_PASSWORD=<generate-strong-db-password>
DB_ROOT_PASSWORD=<generate-strong-root-password>

# EspoCRM Admin
ESPOCRM_ADMIN_USERNAME=admin
ESPOCRM_ADMIN_PASSWORD=<generate-strong-admin-password>
ESPOCRM_SITE_URL=https://crm.yourdomain.com
ESPOCRM_PORT=8080
ESPOCRM_WEBSOCKET_URL=wss://crm.yourdomain.com/ws
ESPOCRM_WEBSOCKET_PORT=8081

# MinIO Object Storage
MINIO_ROOT_USER=minioadmin
MINIO_ROOT_PASSWORD=<generate-strong-minio-secret-key>
MINIO_BUCKET=espocrm-files
```

### 2. Launch Services

Start the container stack in detached mode:

```bash
docker compose up -d
```

Verify service status:

```bash
docker compose ps
```

### 3. Connect Object Storage (MinIO)

Once the EspoCRM container finishes initial schema generation (typically 1–2 minutes on first boot), run the S3 storage configuration script to link EspoCRM attachments and call recordings to MinIO:

```bash
chmod +x scripts/configure-s3-storage.sh
./scripts/configure-s3-storage.sh
```

### 4. Initial Access

- **EspoCRM UI**: Navigate to `http://localhost:8080` (or configured `ESPOCRM_SITE_URL`) and log in using `ESPOCRM_ADMIN_USERNAME` and `ESPOCRM_ADMIN_PASSWORD`.
- **MinIO Console**: Navigate to `http://localhost:9001` to view stored buckets and assets using `MINIO_ROOT_USER` and `MINIO_ROOT_PASSWORD`.

---

## 5-Tier Role-Based Access Control (RBAC)

EspoCRM enforces security via user types and entity scope matrices (`Not Set` < `No` < `Own` < `Team` < `All`). The system is architected for five operational tiers:

| Tier | Role Assignment | Scope & Permissions |
|---|---|---|
| **1. Super Admin** | `Is Admin = true` | Unrestricted system-wide control, developer tools, integration management, schema editor. |
| **2. Admin** | Regular user + `Admin` Role | `All` scope across Leads, Contacts, Accounts, Opportunities. Scoped access to User and Role management without system-level override. |
| **3. Manager** | Regular user + `Manager` Role | `Team` scope for Read/Edit across assigned team records; `All` Read scope on Reports & Dashboards; `Own` Delete only. |
| **4. Sales Executive** | Regular user + `Sales Exec` Role | `Own` scope for Read/Edit/Delete on assigned Leads, Contacts, Opportunities; `Team` Read-only to avoid duplicate outreach. No data export. |
| **5. Support Representative** | Regular user + `Support` Role | `Own` Read/Edit on Cases and Tickets; `Team` Read-only on Contacts/Accounts; Sales pipelines and Opportunities strictly inaccessible. |

For detailed step-by-step role configuration matrices, see [`docs/RBAC-SETUP.md`](file:///c:/Users/USER/Downloads/hackqubit-crm/hackqubit-crm/docs/RBAC-SETUP.md).

---

## Omnichannel Integrations & Required APIs

The CRM unifies all communication channels into a central activity timeline. Detailed architecture and webhook schemas are documented in [`docs/OMNICHANNEL-INTEGRATION.md`](file:///c:/Users/USER/Downloads/hackqubit-crm/hackqubit-crm/docs/OMNICHANNEL-INTEGRATION.md).

### 1. Inbound & Outbound Email
- **Outbound (SMTP)**: Configured in `.env` (`SMTP_HOST`, `SMTP_PORT`, `SMTP_USERNAME`, `SMTP_PASSWORD`) or under **Administration → Outbound Emails**.
- **Inbound (IMAP)**: Configured via **Administration → Inbound Emails** or `.env` (`IMAP_HOST`, `IMAP_PORT`, etc.). The `espocrm-daemon` worker polls mailboxes continuously and links threads to matching Contacts/Leads.

### 2. WhatsApp Business Cloud API (Meta)
- **Required Credentials**:
  - `WHATSAPP_PHONE_NUMBER_ID`
  - `WHATSAPP_ACCESS_TOKEN` (System user permanent token)
  - `WHATSAPP_VERIFY_TOKEN` (Custom secret for webhook verification)
- **Webhook Endpoint**: Register webhook URL (`https://your-crm-bridge/api/whatsapp/webhook`) in the Meta App Dashboard under WhatsApp Configuration.
- **Payload Handling**: Inbound messages are matched against contact phone numbers and recorded as timeline entries via the EspoCRM REST API.

### 3. SMS Gateway (Twilio / Plivo / MSG91)
- **Required Credentials**:
  - `SMS_GATEWAY_ACCOUNT_SID`
  - `SMS_GATEWAY_AUTH_TOKEN`
  - `SMS_GATEWAY_FROM_NUMBER`
- **Webhook Endpoint**: Point your provider's SMS Webhook to `/api/sms/inbound`. Inbound SMS creates a Communication record linked to the sender's Contact or Lead.

### 4. Voice & Telephony (Twilio Voice / Exotel / Asterisk)
- **Required Credentials**:
  - `VOICE_GATEWAY_ACCOUNT_SID`
  - `VOICE_GATEWAY_AUTH_TOKEN`
  - `VOICE_GATEWAY_FROM_NUMBER`
- **Call Recordings**: Call recordings are automatically synced to the MinIO `espocrm-files` bucket and linked to the corresponding Call log in EspoCRM.

### 5. API Keys for External Bridges
External webhook services interact with the CRM using dedicated API Users:
- Generate via **Administration → API Users**.
- Set `ESPOCRM_API_KEY` in `.env` to authenticate middleware bridges.

---

## Repository Structure

```
├── docker-compose.yml              Production compose file (DB, App, Daemon, WebSocket, MinIO)
├── .env.example                    Environment variables and configuration template
├── scripts/
│   ├── configure-s3-storage.sh     Automated MinIO S3 storage integration script
│   └── configure-s3-storage.php    S3 backend configuration payload
├── docs/
│   ├── CRM-COMPARISON.md           CRM architectural analysis and benchmark
│   ├── RBAC-SETUP.md               5-Tier permission matrix and configuration guide
│   └── OMNICHANNEL-INTEGRATION.md  Webhook formats, API bridges, and timeline syncing
└── espocrm-source/                 Upstream EspoCRM source code (reference and extension)
```

---

## Production Hardening & Operations

1. **Reverse Proxy & SSL**:
   Deploy an Nginx, Traefik, or Caddy reverse proxy terminating TLS (HTTPS on port 443, WSS on port 8081).
2. **Network Isolation**:
   Do not expose port `3306` (MariaDB) or port `9001` (MinIO console) to the public internet; keep them bound to `127.0.0.1` or internal Docker networks.
3. **Database Backups**:
   Schedule periodic database dumps:
   ```bash
   docker compose exec espocrm-db mysqldump -u espocrm -p"$DB_PASSWORD" espocrm > backup_$(date +%F).sql
   ```
4. **Storage Replication**:
   Configure MinIO Client (`mc`) mirroring to replicate the `espocrm-files` bucket to cold cloud storage (AWS S3, Cloudflare R2, or Google Cloud Storage).
