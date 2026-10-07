const pool = require('./pool');

const migrationSql = `
-- Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";

-- ================================================
-- CONTACT CHANNELS (Extensible Multi-channel Identity)
-- ================================================
CREATE TABLE IF NOT EXISTS contact_channels (
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

CREATE INDEX IF NOT EXISTS idx_contact_channels_contact ON contact_channels(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_channels_channel_ident ON contact_channels(channel, identifier);

-- ================================================
-- CONVERSATIONS (Unified Conversation Abstraction)
-- ================================================
CREATE TABLE IF NOT EXISTS conversations (
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

CREATE INDEX IF NOT EXISTS idx_conversations_contact ON conversations(contact_id);
CREATE INDEX IF NOT EXISTS idx_conversations_channel ON conversations(channel);
CREATE INDEX IF NOT EXISTS idx_conversations_last_msg ON conversations(last_message_at DESC);

-- ================================================
-- NOTES
-- ================================================
CREATE TABLE IF NOT EXISTS notes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
    user_id UUID REFERENCES users(id),
    title VARCHAR(255),
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_contact ON notes(contact_id);
CREATE INDEX IF NOT EXISTS idx_notes_created_at ON notes(created_at DESC);

-- ================================================
-- TASKS
-- ================================================
CREATE TABLE IF NOT EXISTS tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
    assigned_to UUID REFERENCES users(id),
    created_by UUID REFERENCES users(id),
    title VARCHAR(255) NOT NULL,
    description TEXT,
    due_date TIMESTAMPTZ,
    priority VARCHAR(20) DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'urgent')),
    status VARCHAR(50) DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_tasks_contact ON tasks(contact_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);

-- ================================================
-- TEMPLATES (Reusable Multi-channel Content)
-- ================================================
CREATE TABLE IF NOT EXISTS templates (
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

CREATE INDEX IF NOT EXISTS idx_templates_channel ON templates(channel);

-- ================================================
-- OFFERS (Commercial Offer Catalogue)
-- ================================================
CREATE TABLE IF NOT EXISTS offers (
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

CREATE INDEX IF NOT EXISTS idx_offers_status ON offers(status);

-- ================================================
-- CONTACT OFFERS (Offers Dispatched to Contacts)
-- ================================================
CREATE TABLE IF NOT EXISTS contact_offers (
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

CREATE INDEX IF NOT EXISTS idx_contact_offers_contact ON contact_offers(contact_id);
CREATE INDEX IF NOT EXISTS idx_contact_offers_offer ON contact_offers(offer_id);

-- ================================================
-- CAMPAIGNS (Marketing Broadcasts)
-- ================================================
CREATE TABLE IF NOT EXISTS campaigns (
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

CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);

-- ================================================
-- CAMPAIGN DELIVERIES (Per Contact Per Channel Tracking)
-- ================================================
CREATE TABLE IF NOT EXISTS campaign_deliveries (
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

CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_cmp ON campaign_deliveries(campaign_id, contact_id);
CREATE INDEX IF NOT EXISTS idx_campaign_deliveries_contact ON campaign_deliveries(contact_id, status);

-- ================================================
-- REFRESH UNIFIED ACTIVITY TIMELINE VIEW (9 Sources)
-- ================================================
DROP VIEW IF EXISTS contact_timeline;
CREATE OR REPLACE VIEW contact_timeline AS
    -- 1. Voice Calls
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
    -- 2. WhatsApp Messages
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
    -- 3. Emails
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
    -- 4. SMS Messages
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
    -- 5. Notes
    SELECT
        n.id, n.contact_id, n.user_id AS agent_id, 'note' AS channel,
        n.created_at AS occurred_at,
        json_build_object(
            'title', COALESCE(n.title, 'Internal Note'),
            'content', n.content
        ) AS data
    FROM notes n

UNION ALL
    -- 6. Deals
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
    -- 7. Offers Dispatched
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
    -- 8. Campaign Deliveries
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
    -- 9. Tasks
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

-- Migrate existing contacts channels
INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
SELECT id, 'phone', phone, true, true
FROM contacts
WHERE phone IS NOT NULL AND phone != ''
ON CONFLICT (contact_id, channel, identifier) DO NOTHING;

INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
SELECT id, 'email', email, true, true
FROM contacts
WHERE email IS NOT NULL AND email != ''
ON CONFLICT (contact_id, channel, identifier) DO NOTHING;

INSERT INTO contact_channels (contact_id, channel, identifier, is_primary, is_verified)
SELECT id, 'whatsapp', whatsapp_number, true, true
FROM contacts
WHERE whatsapp_number IS NOT NULL AND whatsapp_number != ''
ON CONFLICT (contact_id, channel, identifier) DO NOTHING;

-- Seed initial templates if none exist
INSERT INTO templates (name, category, channel, subject, content, variables)
SELECT 
    'Enterprise 20% Discount Offer', 
    'promotional', 
    'all', 
    'Special Enterprise Pricing: 20% Off for {{company}}', 
    'Hi {{first_name}}, We are pleased to offer {{company}} an exclusive 20% discount on our Enterprise Omnichannel CRM Plan. Claim before {{expiry_date}}!', 
    ARRAY['first_name', 'company', 'expiry_date']
WHERE NOT EXISTS (SELECT 1 FROM templates LIMIT 1);

INSERT INTO templates (name, category, channel, subject, content, variables)
SELECT 
    'Demo Follow-up & Proposal', 
    'sales', 
    'email', 
    'Following up on our conversation, {{first_name}}', 
    'Dear {{first_name}},\n\nThank you for taking the time to speak today regarding {{company}}. Here is the tailored proposal for your team.\n\nBest regards,\nHackQubit CRM Team', 
    ARRAY['first_name', 'company']
WHERE NOT EXISTS (SELECT 1 FROM templates WHERE name = 'Demo Follow-up & Proposal');

-- Seed initial offers if none exist
INSERT INTO offers (title, description, discount_type, discount_value, terms, status)
SELECT 
    'Enterprise Plan — 20% Discount', 
    'Annual subscription special package for high-growth omnichannel sales teams.', 
    'percentage', 
    '20%', 
    'Applicable on 12-month advance billing. Valid for new deployments.', 
    'active'
WHERE NOT EXISTS (SELECT 1 FROM offers LIMIT 1);

INSERT INTO offers (title, description, discount_type, discount_value, terms, status)
SELECT 
    'WhatsApp Business Onboarding Pack', 
    'Complimentary Meta Verified business setup with 5,000 free monthly tier conversations.', 
    'custom', 
    'Free Onboarding', 
    'Included with annual CRM contract.', 
    'active'
WHERE NOT EXISTS (SELECT 1 FROM offers WHERE title = 'WhatsApp Business Onboarding Pack');
`;

async function runMigration() {
  console.log('🔄 Running database migration...');
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    await client.query(migrationSql);
    await client.query('COMMIT');
    console.log('✅ Database migration applied successfully!');
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('❌ Migration failed:', err.message);
    throw err;
  } finally {
    client.release();
  }
}

if (require.main === module) {
  runMigration()
    .then(() => process.exit(0))
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { runMigration, migrationSql };
