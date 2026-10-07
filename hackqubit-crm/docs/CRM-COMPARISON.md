# Open-Source CRM Research & Benchmark

Evaluated against this track's actual requirements: Docker-deployable,
PostgreSQL/MySQL-backed, supports 5-tier RBAC, can integrate Email,
Voice, WhatsApp, and SMS, and ships with full frontend + backend source.

## Candidates evaluated

| | **EspoCRM** | **SuiteCRM** | **Twenty** | **Odoo (CRM app)** | **Vtiger CE** |
|---|---|---|---|---|---|
| Stack | PHP, MySQL/MariaDB | PHP, MySQL/MariaDB | TypeScript/React/Node, PostgreSQL | Python, PostgreSQL | PHP, MySQL |
| License | GPLv3 | AGPL-3.0 | AGPL-3.0 | LGPL-3.0 (Community) | AGPL-3.0 |
| UI/UX | Clean, modern-enough admin UI | Functional but dated | Very modern, Attio/Notion-like | Modern, part of a larger app suite | Dated, utilitarian |
| RBAC depth | Strong — granular per-entity Role matrix (Read/Edit/Delete/Export × Own/Team/All), ~90% configurable with zero code | Very strong — one of the most mature ACL systems in open-source CRM, field-level security | Workspace/member-based — simpler permission model, no native multi-tier role matrix | Strong — Odoo's groups/access-rights system is granular but tied to its wider app ecosystem | Moderate — role + profile system, less flexible than EspoCRM/SuiteCRM |
| Native Email (IMAP/SMTP) | Yes, built-in, linked to record timeline | Yes, built-in, linked to record timeline | Limited out of the box | Yes, built-in | Yes, built-in |
| Native Call/Meeting logging | Yes (Call, Meeting modules) | Yes (Calls module) | No native call module | Yes, via Calendar/Activities | Yes |
| Docker deployment | Official image, moderate setup (DB + app + daemon + websocket containers) | Official image exists, more moving parts to wire up | Docker-first, official image, heavier footprint | Official images exist but Odoo is a large multi-app platform — more overhead than needed for just CRM | Community edition Docker support is less standardized/official |
| Community & maintenance | Active, regular releases | Active, large long-running project (SugarCRM fork) | Very active, fastest-growing of the group | Very large ecosystem, enterprise-backed | Smaller, slower-moving community edition |
| Customization | Good — admin-panel entity/field builder, no fork needed for most changes | Good — Studio module builder, very mature but more complex | Good for a code-first team; less for no-code | Good but means adopting the wider Odoo app model | Moderate |
| Deployment overhead | Low-moderate | High | Moderate | High (full ERP platform) | Moderate |

## Why EspoCRM

For this track specifically — Docker Compose on a local server, a real
5-tier RBAC requirement, and Email/Voice/WhatsApp/SMS integration via
API — **EspoCRM** is the best fit:

- **RBAC maps directly onto what's required.** Its Role system's
  Own/Team/All scope levels per entity give us exactly the mechanism
  needed to build 5 meaningfully distinct access tiers without writing
  custom permission code (see `docs/RBAC-SETUP.md`).
- **Native email is already there** — IMAP/SMTP linked straight to the
  contact timeline, satisfying one of the four omnichannel pillars with
  configuration, not custom development.
- **Lower deployment overhead than SuiteCRM or Odoo** — fewer moving
  parts to get right in the time we have, while still being a genuinely
  complete CRM (leads, contacts, accounts, opportunity pipeline, tasks,
  calendar, documents, dashboards).
- **REST API is straightforward** to build the WhatsApp/SMS/Voice bridge
  services against (see `docs/OMNICHANNEL-INTEGRATION.md`).
- **S3-compatible file storage is natively supported** (since v8.1, via
  a custom `endpoint`), so wiring it to our MinIO container needs
  configuration, not a storage-layer rewrite.

**SuiteCRM** was the strongest runner-up — genuinely deeper ACL and
feature set — but its larger surface area means more setup risk in a
hackathon timeframe for marginal gain over EspoCRM on what's actually
being graded. **Twenty** has the best UI by a wide margin but its
permission model isn't built for a 5-tier requirement out of the box,
which would mean writing custom authorization logic instead of
configuring it — a worse time trade-off here. **Odoo** is excellent but
is a full ERP platform; using it just for CRM pulls in far more
deployment complexity than this track needs. **Vtiger CE**'s community
edition and Docker support are the least standardized of the five.
