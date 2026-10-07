-- ================================================
-- HackQubit CRM - Database Schema
-- PostgreSQL with 5-Tier RBAC + Full CRM Features
-- ================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- for fuzzy search

-- ================================================
-- RBAC: Roles (5-Tier)
-- 1. Super Admin   - full system access
-- 2. Admin         - org-level management
-- 3. Manager       - team management, reports
-- 4. Agent         - handle contacts, comms
-- 5. Viewer        - read-only access
-- ================================================
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) UNIQUE NOT NULL,
    level INTEGER NOT NULL CHECK (level BETWEEN 1 AND 5),
    permissions JSONB NOT NULL DEFAULT '{}',
    description TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

INSERT INTO roles (name, level, permissions, description) VALUES
('super_admin', 1, '{"*": true}', 'Full system access'),
('admin', 2, '{"contacts": true, "communications": true, "users": true, "reports": true, "settings": true}', 'Organization admin'),
('manager', 3, '{"contacts": true, "communications": true, "reports": true, "team": true}', 'Team manager'),
('agent', 4, '{"contacts": {"read": true, "write": true}, "communications": true}', 'Sales/support agent'),
('viewer', 5, '{"contacts": {"read": true}, "communications": {"read": true}, "reports": {"read": true}}', 'Read-only viewer');

-- ================================================
-- USERS TABLE
-- ================================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    avatar_url TEXT,
    role_id INTEGER REFERENCES roles(id) DEFAULT 4,
    phone VARCHAR(20),
    is_active BOOLEAN DEFAULT true,
    last_login TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- DEFAULT ADMIN NOTE:
-- No default admin is seeded for security reasons.
-- After applying this schema, insert your first super admin manually:
--
--   node -e "const b=require('bcryptjs'); b.hash('StrongPass!123',12).then(console.log)"
--   -- then INSERT INTO users (email, password_hash, full_name, role_id) VALUES ('admin@company.com', '<hash>', 'Admin', 1);
-- ================================================

-- ================================================
-- CONTACTS TABLE (Customers/Leads)
-- ================================================
CREATE TABLE contacts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    full_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(20),
    whatsapp_number VARCHAR(20),
    company VARCHAR(255),
    job_title VARCHAR(255),
    address TEXT,
    city VARCHAR(100),
    country VARCHAR(100),
    status VARCHAR(50) DEFAULT 'lead' CHECK (status IN ('lead', 'prospect', 'customer', 'churned', 'inactive')),
    source VARCHAR(50) DEFAULT 'manual' CHECK (source IN ('manual', 'whatsapp', 'email', 'call', 'web', 'import')),
    tags TEXT[] DEFAULT '{}',
    custom_fields JSONB DEFAULT '{}',
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    avatar_url TEXT,
    is_deleted BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- DEALS / PIPELINE
-- ================================================
CREATE TABLE deals (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    contact_id UUID REFERENCES contacts(id),
    assigned_to UUID REFERENCES users(id),
    stage VARCHAR(50) DEFAULT 'new' CHECK (stage IN ('new', 'qualified', 'proposal', 'negotiation', 'won', 'lost')),
    value DECIMAL(15,2) DEFAULT 0,
    currency VARCHAR(10) DEFAULT 'INR',
    expected_close_date DATE,
    notes TEXT,
    probability INTEGER DEFAULT 0 CHECK (probability BETWEEN 0 AND 100),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CALL RECORDINGS (stored in MinIO)
-- ================================================
CREATE TABLE call_recordings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id),
    agent_id UUID REFERENCES users(id),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    duration_seconds INTEGER DEFAULT 0,
    recording_url TEXT,           -- MinIO object path
    recording_size_bytes BIGINT,
    transcript TEXT,              -- AI-generated transcript (future)
    notes TEXT,
    call_status VARCHAR(20) DEFAULT 'completed' CHECK (call_status IN ('completed', 'missed', 'failed', 'voicemail')),
    phone_number VARCHAR(20),
    sip_call_id VARCHAR(255),
    started_at TIMESTAMPTZ,
    ended_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- WHATSAPP MESSAGES
-- ================================================
CREATE TABLE whatsapp_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id),
    agent_id UUID REFERENCES users(id),
    wa_message_id VARCHAR(255) UNIQUE,    -- Meta message ID
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    message_type VARCHAR(20) DEFAULT 'text' CHECK (message_type IN ('text', 'image', 'audio', 'video', 'document', 'template', 'interactive')),
    content TEXT,
    media_url TEXT,
    media_mime_type VARCHAR(100),
    template_name VARCHAR(100),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'read', 'failed', 'received')),
    phone_number VARCHAR(20),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- EMAILS
-- ================================================
CREATE TABLE emails (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id),
    agent_id UUID REFERENCES users(id),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    subject VARCHAR(500),
    body TEXT,
    body_html TEXT,
    from_address VARCHAR(255),
    to_address VARCHAR(255),
    cc_addresses TEXT[],
    attachments JSONB DEFAULT '[]',   -- MinIO paths
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'bounced', 'opened', 'failed', 'received')),
    message_id VARCHAR(255),
    thread_id VARCHAR(255),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- SMS MESSAGES
-- ================================================
CREATE TABLE sms_messages (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id),
    agent_id UUID REFERENCES users(id),
    direction VARCHAR(10) CHECK (direction IN ('inbound', 'outbound')),
    content TEXT NOT NULL,
    phone_number VARCHAR(20),
    twilio_sid VARCHAR(255),
    status VARCHAR(20) DEFAULT 'sent' CHECK (status IN ('sent', 'delivered', 'failed', 'received')),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- UNIFIED ACTIVITY TIMELINE VIEW
-- ================================================
CREATE OR REPLACE VIEW contact_timeline AS
    SELECT 
        cr.id, cr.contact_id, cr.agent_id, 'call' AS channel,
        cr.started_at AS occurred_at,
        json_build_object(
            'duration', cr.duration_seconds,
            'direction', cr.direction,
            'status', cr.call_status,
            'recording_url', cr.recording_url,
            'notes', cr.notes,
            'phone', cr.phone_number
        ) AS data
    FROM call_recordings cr
UNION ALL
    SELECT 
        wm.id, wm.contact_id, wm.agent_id, 'whatsapp' AS channel,
        wm.created_at AS occurred_at,
        json_build_object(
            'direction', wm.direction,
            'type', wm.message_type,
            'content', wm.content,
            'status', wm.status,
            'phone', wm.phone_number
        ) AS data
    FROM whatsapp_messages wm
UNION ALL
    SELECT 
        e.id, e.contact_id, e.agent_id, 'email' AS channel,
        e.created_at AS occurred_at,
        json_build_object(
            'direction', e.direction,
            'subject', e.subject,
            'status', e.status,
            'from', e.from_address,
            'to', e.to_address
        ) AS data
    FROM emails e
UNION ALL
    SELECT 
        s.id, s.contact_id, s.agent_id, 'sms' AS channel,
        s.created_at AS occurred_at,
        json_build_object(
            'direction', s.direction,
            'content', s.content,
            'status', s.status,
            'phone', s.phone_number
        ) AS data
    FROM sms_messages s;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_name_search ON contacts USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_call_recordings_contact ON call_recordings(contact_id);
CREATE INDEX idx_whatsapp_contact ON whatsapp_messages(contact_id);
CREATE INDEX idx_email_contact ON emails(contact_id);
CREATE INDEX idx_sms_contact ON sms_messages(contact_id);
CREATE INDEX idx_timeline_contact_date ON call_recordings(contact_id, started_at DESC);


-- ================================================
-- NOTE: Sample/seed data removed for production.
-- Create your first admin user by running the following
-- after the schema is applied (replace values as needed):
--
--   INSERT INTO users (email, password_hash, full_name, role_id)
--   VALUES (
--     'admin@yourcompany.com',
--     '$2b$12$<bcrypt_hash_of_your_password>',
--     'Your Name',
--     1
--   );
--
-- Generate a bcrypt hash with: node -e "const b=require('bcryptjs'); b.hash('YourPassword',12).then(console.log)"
-- ================================================
