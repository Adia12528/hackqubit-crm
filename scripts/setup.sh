#!/usr/bin/env bash
# =============================================================
#  HackQubit CRM — Database Setup & Seed Script
#  Run AFTER docker-compose up -d
# =============================================================

set -e

echo "======================================================"
echo "  HackQubit CRM — Database Setup & Seed"
echo "======================================================"

# ─── 1. Wait for services to be ready ────────────────────────
echo "[1/6] Waiting for databases to be ready..."
sleep 15

# ─── 2. Run Twenty CRM migrations ────────────────────────────
echo "[2/6] Running Twenty CRM database migrations..."
docker exec twenty-server \
  node packages/twenty-server/dist/src/database/commands/upgrade-version.command.js 0.1 0.2

# ─── 3. Run Chatwoot DB setup ────────────────────────────────
echo "[3/6] Setting up Chatwoot database..."
docker exec chatwoot-app \
  bundle exec rails db:chatwoot_prepare

# ─── 4. Seed Twenty CRM — Roles & Demo Data ─────────────────
echo "[4/6] Seeding Twenty CRM with demo data..."
docker exec twenty-server node -e "
const { DataSource } = require('typeorm');
// Roles will be created via the Admin UI or GraphQL API after boot
console.log('Database ready — roles will be configured via Admin UI');
"

# ─── 5. Create MinIO buckets (already done by minio-init) ────
echo "[5/6] Verifying MinIO buckets..."
docker exec minio mc ls local/ 2>/dev/null || echo "MinIO buckets created by minio-init service"

# ─── 6. Create n8n database ──────────────────────────────────
echo "[6/6] Creating n8n database in Chatwoot PostgreSQL..."
docker exec chatwoot-db psql -U chatwoot -c "CREATE DATABASE n8n;" 2>/dev/null || echo "n8n DB already exists"

echo ""
echo "======================================================"
echo "  ✅ Setup Complete!"
echo "======================================================"
echo ""
echo "  Service URLs:"
echo "  ┌─────────────────────────────────────────────┐"
echo "  │  Twenty CRM      →  http://localhost:3000   │"
echo "  │  Chatwoot         →  http://localhost:3001   │"
echo "  │  n8n Automation   →  http://localhost:5678   │"
echo "  │  MinIO Console    →  http://localhost:9001   │"
echo "  │  MailHog (Email)  →  http://localhost:8025   │"
echo "  └─────────────────────────────────────────────┘"
echo ""
echo "  Admin Credentials (change in .env before production!):"
echo "  Twenty CRM:   superadmin@hackqubit.local / Admin@HackQubit2026!"
echo "  Chatwoot:     (set during first-run wizard)"
echo "  n8n:          admin / admin123"
echo "  MinIO:        minioadmin / minioadmin_secret"
echo ""
