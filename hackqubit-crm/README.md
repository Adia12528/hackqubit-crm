# HackQubit 2.0 — Sponsored Track: Self-Hosted Open-Source CRM

Selected CRM: **EspoCRM** — see `docs/CRM-COMPARISON.md` for the full
research/benchmark against SuiteCRM, Twenty, Odoo, and Vtiger, with the
selection rationale.

## Architecture

```
                  ┌─────────────────────────────┐
                  │     EspoCRM (app)            │  :8080
                  │  Frontend + Backend/API      │
                  └───────────┬──────┬───────────┘
                               │      │
              ┌────────────────┘      └────────────────┐
              ▼                                         ▼
    ┌───────────────────┐                   ┌──────────────────────┐
    │  espocrm-daemon     │                   │  espocrm-websocket    │ :8081
    │  (cron/background   │                   │  (real-time stream)   │
    │   jobs, IMAP poll)   │                   └──────────────────────┘
    └───────────────────┘
              │
              ▼
    ┌───────────────────┐        ┌──────────────────────┐
    │   espocrm-db        │        │   MinIO (S3-compatible) │ :9000 / :9001
    │   (MariaDB)          │        │   documents + call      │
    └───────────────────┘        │   recordings             │
                                  └──────────────────────┘

    Omnichannel bridges (see docs/OMNICHANNEL-INTEGRATION.md):
    Email (native) · WhatsApp Cloud API · SMS gateway · Voice/WebRTC
    all push activity into EspoCRM via its REST API.
```

## Quick start

```bash
cp .env.example .env
# edit .env — set real passwords, leave omnichannel keys blank for now

docker compose up -d
# wait ~1-2 min for first boot, then open http://localhost:8080
# log in with ESPOCRM_ADMIN_USERNAME / ESPOCRM_ADMIN_PASSWORD from .env

# once you've confirmed you can log in, wire file storage to MinIO:
./scripts/configure-s3-storage.sh
```

MinIO console: `http://localhost:9001` (login with `MINIO_ROOT_USER` /
`MINIO_ROOT_PASSWORD`).

## Repository layout

```
├── docker-compose.yml              Full stack: DB, EspoCRM, MinIO
├── .env.example                    All configurable values
├── scripts/
│   ├── configure-s3-storage.sh     Wires EspoCRM → MinIO (run once)
│   └── configure-s3-storage.php    (called by the script above)
├── docs/
│   ├── CRM-COMPARISON.md           Research & benchmark (deliverable #1)
│   ├── RBAC-SETUP.md               5-tier role configuration guide
│   └── OMNICHANNEL-INTEGRATION.md  Email/WhatsApp/SMS/Voice architecture
└── espocrm-source/                 Full upstream EspoCRM source
                                     (frontend `client/`, backend
                                     `application/`, schemas in
                                     `application/Espo/Resources/`) —
                                     included for reference/extension;
                                     the running deployment uses the
                                     official prebuilt image for speed
                                     and reliability.
```

## Deliverables checklist (mapped to the problem statement)

- [x] CRM comparison report & selection rationale → `docs/CRM-COMPARISON.md`
- [x] Complete source code in a structured repo → `espocrm-source/`
- [x] Docker Compose deployment, persistent volumes, `.env.example` → root
- [ ] Database migration/seed instructions — EspoCRM's installer handles
      schema creation on first boot; add your own seed data via the UI
      or the REST API once roles/teams are set up
- [x] Object storage setup for call recordings & attachments →
      `scripts/configure-s3-storage.*`, MinIO in `docker-compose.yml`
- [ ] Admin credentials for the local demo — set in `.env`, document the
      5 demo logins once you create them (see `docs/RBAC-SETUP.md`)
- [x] API/integration documentation for Email, Voice, WhatsApp, SMS →
      `docs/OMNICHANNEL-INTEGRATION.md`
- [ ] Live presentation demo — your part, but everything above is built
      to support it end-to-end

## What's left for your team to do

1. Run the quick start above and confirm the stack comes up clean.
2. Follow `docs/RBAC-SETUP.md` to create the 4 custom Roles + 5 demo
   users (15-20 min of admin-panel clicking, no code).
3. Pick **one** omnichannel pillar to fully wire end-to-end (Email is
   fastest — it's native config, not custom code) per
   `docs/OMNICHANNEL-INTEGRATION.md`, then add more if time allows.
4. Seed a handful of demo Leads/Contacts/Opportunities through the UI so
   the dashboard and pipeline aren't empty for the demo.
