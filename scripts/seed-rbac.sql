-- =============================================================
--  HackQubit CRM — RBAC Seed SQL
--  Run against Twenty CRM's PostgreSQL database
--  5-Tier Role Structure:
--    1. Super Admin    — Full unrestricted access
--    2. Admin          — Workspace management, no billing
--    3. Manager        — Team leads, can assign & report
--    4. Sales Executive — Owns contacts, leads, deals
--    5. Support/User   — Read-only + support tickets
-- =============================================================

-- NOTE: Twenty CRM uses its own internal role system.
-- This SQL seeds the metadata_roles table if you're using
-- a custom extension or EspoCRM fallback.

-- ─── Create Role Definitions ──────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_roles (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name        VARCHAR(50) UNIQUE NOT NULL,
    display_name VARCHAR(100) NOT NULL,
    description TEXT,
    level       INTEGER NOT NULL,
    created_at  TIMESTAMP DEFAULT NOW()
);

INSERT INTO crm_roles (name, display_name, description, level) VALUES
    ('super_admin',      'Super Administrator', 
     'Full system access. Can manage all workspaces, users, billing, and system configuration.', 1),
    ('admin',            'Administrator', 
     'Workspace-level administration. Can manage users, roles, integrations, and module settings.', 2),
    ('manager',          'Manager / Team Lead', 
     'Can view all team data, assign leads, run reports, and manage their team members.', 3),
    ('sales_executive',  'Sales Executive', 
     'Can create and manage their own leads, contacts, opportunities, tasks, and notes.', 4),
    ('support_user',     'Support / User', 
     'Read-only access to contacts and accounts. Can create support tickets and add notes.', 5)
ON CONFLICT (name) DO NOTHING;

-- ─── Module Permissions per Role ─────────────────────────────

CREATE TABLE IF NOT EXISTS crm_role_permissions (
    id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    role_name   VARCHAR(50) REFERENCES crm_roles(name),
    module      VARCHAR(50) NOT NULL,
    can_create  BOOLEAN DEFAULT FALSE,
    can_read    BOOLEAN DEFAULT FALSE,
    can_update  BOOLEAN DEFAULT FALSE,
    can_delete  BOOLEAN DEFAULT FALSE,
    scope       VARCHAR(20) DEFAULT 'own',  -- 'own', 'team', 'all'
    UNIQUE(role_name, module)
);

-- SUPER ADMIN — all permissions, all scopes
INSERT INTO crm_role_permissions (role_name, module, can_create, can_read, can_update, can_delete, scope)
SELECT 'super_admin', m.module, TRUE, TRUE, TRUE, TRUE, 'all'
FROM (VALUES 
    ('contacts'), ('leads'), ('accounts'), ('opportunities'), ('tasks'),
    ('notes'), ('calendar'), ('documents'), ('reports'), ('users'),
    ('roles'), ('settings'), ('integrations'), ('call_logs'), ('emails'),
    ('whatsapp_messages'), ('sms_logs')
) AS m(module)
ON CONFLICT (role_name, module) DO NOTHING;

-- ADMIN — no role/billing management
INSERT INTO crm_role_permissions (role_name, module, can_create, can_read, can_update, can_delete, scope)
SELECT 'admin', m.module, 
    CASE WHEN m.module NOT IN ('roles', 'settings') THEN TRUE ELSE FALSE END,
    TRUE, TRUE,
    CASE WHEN m.module NOT IN ('roles', 'settings') THEN TRUE ELSE FALSE END,
    'all'
FROM (VALUES 
    ('contacts'), ('leads'), ('accounts'), ('opportunities'), ('tasks'),
    ('notes'), ('calendar'), ('documents'), ('reports'), ('users'),
    ('roles'), ('settings'), ('integrations'), ('call_logs'), ('emails'),
    ('whatsapp_messages'), ('sms_logs')
) AS m(module)
ON CONFLICT (role_name, module) DO NOTHING;

-- MANAGER — team-scoped, no user/role management
INSERT INTO crm_role_permissions (role_name, module, can_create, can_read, can_update, can_delete, scope)
VALUES
    ('manager', 'contacts',          TRUE,  TRUE,  TRUE,  FALSE, 'team'),
    ('manager', 'leads',             TRUE,  TRUE,  TRUE,  FALSE, 'team'),
    ('manager', 'accounts',          TRUE,  TRUE,  TRUE,  FALSE, 'team'),
    ('manager', 'opportunities',     TRUE,  TRUE,  TRUE,  FALSE, 'team'),
    ('manager', 'tasks',             TRUE,  TRUE,  TRUE,  TRUE,  'team'),
    ('manager', 'notes',             TRUE,  TRUE,  TRUE,  TRUE,  'team'),
    ('manager', 'calendar',          TRUE,  TRUE,  TRUE,  FALSE, 'team'),
    ('manager', 'documents',         TRUE,  TRUE,  FALSE, FALSE, 'team'),
    ('manager', 'reports',           FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('manager', 'call_logs',         FALSE, TRUE,  FALSE, FALSE, 'team'),
    ('manager', 'emails',            TRUE,  TRUE,  FALSE, FALSE, 'team'),
    ('manager', 'whatsapp_messages', TRUE,  TRUE,  FALSE, FALSE, 'team'),
    ('manager', 'sms_logs',          TRUE,  TRUE,  FALSE, FALSE, 'team')
ON CONFLICT (role_name, module) DO NOTHING;

-- SALES EXECUTIVE — own data only
INSERT INTO crm_role_permissions (role_name, module, can_create, can_read, can_update, can_delete, scope)
VALUES
    ('sales_executive', 'contacts',          TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('sales_executive', 'leads',             TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('sales_executive', 'accounts',          TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('sales_executive', 'opportunities',     TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('sales_executive', 'tasks',             TRUE,  TRUE,  TRUE,  TRUE,  'own'),
    ('sales_executive', 'notes',             TRUE,  TRUE,  TRUE,  TRUE,  'own'),
    ('sales_executive', 'calendar',          TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('sales_executive', 'documents',         TRUE,  TRUE,  FALSE, FALSE, 'own'),
    ('sales_executive', 'call_logs',         FALSE, TRUE,  FALSE, FALSE, 'own'),
    ('sales_executive', 'emails',            TRUE,  TRUE,  FALSE, FALSE, 'own'),
    ('sales_executive', 'whatsapp_messages', TRUE,  TRUE,  FALSE, FALSE, 'own'),
    ('sales_executive', 'sms_logs',          TRUE,  TRUE,  FALSE, FALSE, 'own')
ON CONFLICT (role_name, module) DO NOTHING;

-- SUPPORT/USER — read only + support tickets
INSERT INTO crm_role_permissions (role_name, module, can_create, can_read, can_update, can_delete, scope)
VALUES
    ('support_user', 'contacts',          FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'leads',             FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'accounts',          FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'opportunities',     FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'tasks',             TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('support_user', 'notes',             TRUE,  TRUE,  TRUE,  FALSE, 'own'),
    ('support_user', 'calendar',          TRUE,  TRUE,  FALSE, FALSE, 'own'),
    ('support_user', 'documents',         FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'call_logs',         FALSE, TRUE,  FALSE, FALSE, 'all'),
    ('support_user', 'emails',            FALSE, TRUE,  FALSE, FALSE, 'own'),
    ('support_user', 'whatsapp_messages', FALSE, TRUE,  FALSE, FALSE, 'own')
ON CONFLICT (role_name, module) DO NOTHING;

-- ─── Seed Demo Users ─────────────────────────────────────────

CREATE TABLE IF NOT EXISTS crm_demo_users (
    id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email      VARCHAR(255) UNIQUE NOT NULL,
    full_name  VARCHAR(255) NOT NULL,
    role_name  VARCHAR(50) REFERENCES crm_roles(name),
    created_at TIMESTAMP DEFAULT NOW()
);

INSERT INTO crm_demo_users (email, full_name, role_name) VALUES
    ('superadmin@hackqubit.local',   'Super Admin',          'super_admin'),
    ('admin@hackqubit.local',        'Workspace Admin',      'admin'),
    ('manager@hackqubit.local',      'Sales Manager',        'manager'),
    ('sales@hackqubit.local',        'Sales Executive Demo', 'sales_executive'),
    ('support@hackqubit.local',      'Support Agent Demo',   'support_user')
ON CONFLICT (email) DO NOTHING;

-- ─── Summary View ─────────────────────────────────────────────
CREATE OR REPLACE VIEW rbac_summary AS
SELECT 
    r.display_name AS role,
    r.level,
    p.module,
    CASE WHEN p.can_create THEN '✓' ELSE '✗' END AS create,
    CASE WHEN p.can_read   THEN '✓' ELSE '✗' END AS read,
    CASE WHEN p.can_update THEN '✓' ELSE '✗' END AS update,
    CASE WHEN p.can_delete THEN '✓' ELSE '✗' END AS delete,
    p.scope
FROM crm_roles r
LEFT JOIN crm_role_permissions p ON r.name = p.role_name
ORDER BY r.level, p.module;

SELECT * FROM rbac_summary;
