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
-- CONTACT CHANNELS (Multi-Channel Extensible Identity)
-- ================================================
CREATE TABLE contact_channels (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'phone', 'email', 'sms', 'telegram', 'instagram', 'facebook', 'linkedin')),
    identifier VARCHAR(255) NOT NULL,
    is_primary BOOLEAN DEFAULT true,
    is_verified BOOLEAN DEFAULT false,
    is_active BOOLEAN DEFAULT true,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_contact_channel_identifier UNIQUE (contact_id, channel, identifier)
);

-- ================================================
-- CONVERSATIONS (Unified Conversation Abstraction)
-- ================================================
CREATE TABLE conversations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL CHECK (channel IN ('whatsapp', 'sms', 'email', 'call')),
    status VARCHAR(50) DEFAULT 'open' CHECK (status IN ('open', 'pending', 'closed')),
    assigned_to UUID REFERENCES users(id),
    last_message_at TIMESTAMPTZ DEFAULT NOW(),
    last_message_preview TEXT,
    unread_count INTEGER DEFAULT 0,
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_contact_channel_conversation UNIQUE (contact_id, channel)
);

-- ================================================
-- NOTES
-- ================================================
CREATE TABLE notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TASKS
-- ================================================
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    created_by REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- TEMPLATES
-- ================================================
CREATE TABLE templates (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    category VARCHAR(100) DEFAULT 'general',
    channel VARCHAR(50) DEFAULT 'all' CHECK (channel IN ('all', 'whatsapp', 'sms', 'email')),
    subject VARCHAR(255),
    content TEXT NOT NULL,
    variables TEXT[] DEFAULT ARRAY['first_name', 'company', 'offer_name', 'discount'],
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- OFFERS
-- ================================================
CREATE TABLE offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    discount_type VARCHAR(50) DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed', 'custom')),
    discount_value VARCHAR(100),
    valid_from DATE DEFAULT CURRENT_DATE,
    valid_until DATE,
    terms TEXT,
    status VARCHAR(50) DEFAULT 'active' CHECK (status IN ('active', 'expired', 'archived', 'draft')),
    target_audience TEXT,
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CONTACT OFFERS
-- ================================================
CREATE TABLE contact_offers (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    offer_id UUID NOT NULL REFERENCES offers(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    sent_by UUID REFERENCES users(id),
    channels TEXT[] DEFAULT ARRAY['whatsapp'],
    status VARCHAR(50) DEFAULT 'sent' CHECK (status IN ('sent', 'opened', 'accepted', 'declined', 'expired')),
    custom_notes TEXT,
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CAMPAIGNS
-- ================================================
CREATE TABLE campaigns (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    description TEXT,
    audience_filter JSONB DEFAULT '{"status": "all"}',
    channels TEXT[] DEFAULT ARRAY['whatsapp'],
    template_id UUID REFERENCES templates(id),
    subject VARCHAR(255),
    message_body TEXT,
    scheduled_at TIMESTAMPTZ,
    status VARCHAR(50) DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'running', 'completed', 'failed', 'cancelled')),
    metrics JSONB DEFAULT '{"sent": 0, "delivered": 0, "failed": 0, "opened": 0, "clicked": 0, "converted": 0}',
    created_by UUID REFERENCES users(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- CAMPAIGN DELIVERIES
-- ================================================
CREATE TABLE campaign_deliveries (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    campaign_id UUID NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    channel VARCHAR(50) NOT NULL,
    recipient VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'sent', 'delivered', 'failed', 'opened', 'clicked')),
    error_message TEXT,
    sent_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ================================================
-- UNIFIED ACTIVITY TIMELINE VIEW (9 Sources)
-- ================================================
CREATE OR REPLACE VIEW contact_timeline AS
    SELECT 
        cr.id, cr.contact_id, cr.agent_id, 'call' AS channel,
        COALESCE(cr.started_at, cr.created_at) AS occurred_at,
        json_build_object(
            'title', 'Voice Call',
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
            'title', 'WhatsApp Message',
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
            'title', 'Email Dispatched',
            'direction', e.direction,
            'subject', e.subject,
            'content', e.body,
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
            'title', 'SMS Message',
            'direction', s.direction,
            'content', s.content,
            'status', s.status,
            'phone', s.phone_number
        ) AS data
    FROM sms_messages s
UNION ALL
    SELECT
        n.id, n.contact_id, n.user_id AS agent_id, 'note' AS channel,
        n.created_at AS occurred_at,
        json_build_object(
            'title', COALESCE(n.title, 'Internal Note'),
            'content', n.content
        ) AS data
    FROM notes n
UNION ALL
    SELECT
        d.id, d.contact_id, d.assigned_to AS agent_id, 'deal' AS channel,
        d.created_at AS occurred_at,
        json_build_object(
            'title', d.title,
            'stage', d.stage,
            'value', d.value,
            'currency', d.currency,
            'probability', d.probability
        ) AS data
    FROM deals d
UNION ALL
    SELECT
        co.id, co.contact_id, co.sent_by AS agent_id, 'offer' AS channel,
        co.sent_at AS occurred_at,
        json_build_object(
            'title', o.title,
            'discount', o.discount_value,
            'channels', co.channels,
            'status', co.status,
            'notes', co.custom_notes
        ) AS data
    FROM contact_offers co
    JOIN offers o ON co.offer_id = o.id
UNION ALL
    SELECT
        cd.id, cd.contact_id, cmp.created_by AS agent_id, 'campaign' AS channel,
        COALESCE(cd.sent_at, cd.created_at) AS occurred_at,
        json_build_object(
            'title', cmp.name,
            'channel', cd.channel,
            'status', cd.status,
            'recipient', cd.recipient
        ) AS data
    FROM campaign_deliveries cd
    JOIN campaigns cmp ON cd.campaign_id = cmp.id
UNION ALL
    SELECT
        t.id, t.contact_id, t.assigned_to AS agent_id, 'task' AS channel,
        t.created_at AS occurred_at,
        json_build_object(
            'title', t.title,
            'priority', t.priority,
            'status', t.status,
            'due_date', t.due_date,
            'description', t.description
        ) AS data
    FROM tasks t;

-- ================================================
-- INDEXES FOR PERFORMANCE
-- ================================================
CREATE INDEX idx_contacts_email ON contacts(email);
CREATE INDEX idx_contacts_phone ON contacts(phone);
CREATE INDEX idx_contacts_assigned_to ON contacts(assigned_to);
CREATE INDEX idx_contacts_status ON contacts(status);
CREATE INDEX idx_contacts_name_search ON contacts USING gin(full_name gin_trgm_ops);
CREATE INDEX idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX idx_contact_channels_channel_ident ON contact_channels(channel, identifier);
CREATE INDEX idx_conversations_contact ON conversations(contact_id);
CREATE INDEX idx_conversations_channel ON conversations(channel);
CREATE INDEX idx_conversations_last_msg ON conversations(last_message_at DESC);
CREATE INDEX idx_call_recordings_contact ON call_recordings(contact_id);
CREATE INDEX idx_whatsapp_contact ON whatsapp_messages(contact_id);
CREATE INDEX idx_email_contact ON emails(contact_id);
CREATE INDEX idx_sms_contact ON sms_messages(contact_id);
CREATE INDEX idx_notes_contact ON notes(contact_id);
CREATE INDEX idx_tasks_contact ON tasks(contact_id);
CREATE INDEX idx_campaign_deliveries_cmp ON campaign_deliveries(campaign_id, contact_id);
CREATE INDEX idx_campaign_deliveries_contact ON campaign_deliveries(contact_id, status);
CREATE INDEX idx_contact_offers_contact ON contact_offers(contact_id);
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
