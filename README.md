# 🚀 HackQubit CRM

> **Sponsored Track: Enterprise Cloud & CRM** | HackQubit Hackathon 2026
>
> A fully self-hosted, open-source CRM platform with omni-channel communications, 5-tier RBAC, and Docker-first deployment.

---

## 🏗️ Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                     HACKQUBIT CRM PLATFORM                       │
│                                                                   │
│  ┌──────────────────┐    ┌───────────────────────────────────┐   │
│  │   Twenty CRM     │◀──▶│           Chatwoot                │   │
│  │   Port: 3000     │    │  Email · WhatsApp · Voice · SMS   │   │
│  │  React/NestJS    │    │           Port: 3001              │   │
│  └────────┬─────────┘    └──────────────┬────────────────────┘   │
│           │    n8n sync webhooks         │                        │
│  ┌────────▼─────────────────────────────▼────────────────────┐   │
│  │              n8n Workflow Automation — Port: 5678          │   │
│  └────────────────────────────────────────────────────────────┘   │
│                                                                   │
│  ┌───────────────┐  ┌──────────────┐  ┌───────────────────────┐  │
│  │  PostgreSQL   │  │    Redis     │  │  MinIO (S3 Storage)   │  │
│  │  (2 instances)│  │ (2 instances)│  │  call-recordings      │  │
│  │ Twenty+Chatwoot│ │ Twenty+Chatwoot│ │  attachments · docs  │  │
│  └───────────────┘  └──────────────┘  └───────────────────────┘  │
│                                                                   │
│  ┌───────────────────┐   ┌──────────────────────────────────┐    │
│  │  Asterisk (SIP)   │   │     MailHog (Dev Email)          │    │
│  │  WebRTC Voice     │   │     Port: 1025/8025              │    │
│  │  Port: 5060/8088  │   └──────────────────────────────────┘    │
│  └───────────────────┘                                           │
└─────────────────────────────────────────────────────────────────┘
```

---

## ⚡ Quick Start

```powershell
# Clone
git clone https://github.com/your-team/hackqubit-crm.git
cd hackqubit-crm

# Configure
copy .env.example .env

# Launch!
docker compose up -d
```

Visit **http://localhost:3000** after 2 minutes.

---

## 📦 What's Included

| File/Folder | Description |
|-------------|-------------|
| `docker-compose.yml` | Full multi-container orchestration |
| `.env.example` | Environment variable template |
| `scripts/setup.sh` | Automated database setup |
| `scripts/seed-rbac.sql` | 5-tier RBAC seed data |
| `DEPLOYMENT.md` | Full deployment guide |
| `API_INTEGRATION.md` | API & webhook documentation |
| `CRM_Comparison_Report.md` | Research & benchmark report |

---

## 🔐 5-Tier RBAC

| Tier | Role | Scope | Key Capabilities |
|------|------|-------|-----------------|
| 1 | **Super Admin** | All | Full system + billing + all workspaces |
| 2 | **Admin** | Workspace | Users, settings, integrations |
| 3 | **Manager** | Team | Assign leads, reports, team oversight |
| 4 | **Sales Executive** | Own | Contacts, deals, tasks, calls |
| 5 | **Support/User** | Read + Own | View contacts, own tickets & notes |

---

## 📡 Omni-Channel Communications

| Channel | Provider | Status |
|---------|---------|--------|
| 📧 Email | SMTP/IMAP (MailHog/Gmail) | ✅ Ready |
| 📱 WhatsApp | Meta Business Cloud API | ✅ Ready |
| 📞 Voice Calls | Twilio WebRTC | ✅ Ready |
| 💬 SMS | Twilio SMS | ✅ Ready |
| 🎙️ Call Recordings | MinIO S3 Storage | ✅ Ready |

---

## 🛠️ Tech Stack

- **Frontend**: React 18 + TypeScript (Twenty CRM) + Vue.js (Chatwoot)
- **Backend**: NestJS + GraphQL (Twenty) + Ruby on Rails (Chatwoot)
- **Database**: PostgreSQL 15
- **Cache**: Redis 7
- **Object Storage**: MinIO (S3-compatible)
- **Automation**: n8n
- **Voice**: Asterisk + WebRTC + Twilio
- **License**: AGPL-3.0 (Twenty) + MIT (Chatwoot)

---

## 📚 Documentation

- 📖 [Deployment Guide](./DEPLOYMENT.md)
- 🔌 [API & Integrations](./API_INTEGRATION.md)
- 📊 [CRM Comparison Report](./CRM_Comparison_Report.md)

---

*Built for HackQubit 2026 — Sponsored Track: Enterprise Cloud & CRM*