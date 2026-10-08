# 🔌 HackQubit CRM — API & Integration Documentation

---

## 1. Twenty CRM — GraphQL API

Twenty CRM exposes a **GraphQL API** at `http://localhost:3000/api`.

### Authentication

```bash
# Get a token via the Twenty API
curl -X POST http://localhost:3000/api \
  -H "Content-Type: application/json" \
  -d '{"query":"mutation { signInWithPassword(email:\"superadmin@hackqubit.local\", password:\"Admin@HackQubit2026!\") { token { accessToken } } }"}'
```

### Sample Queries

```graphql
# List all contacts
query {
  people(filter: {}) {
    edges {
      node {
        id
        name { firstName lastName }
        emails { primaryEmail }
        phones { primaryPhoneNumber }
        createdAt
      }
    }
  }
}

# Create a new lead / person
mutation {
  createPerson(data: {
    name: { firstName: "John", lastName: "Doe" }
    emails: { primaryEmail: "john.doe@example.com" }
    phones: { primaryPhoneNumber: "+911234567890" }
  }) {
    id
    name { firstName lastName }
  }
}

# Create an opportunity
mutation {
  createOpportunity(data: {
    name: "Q4 Enterprise Deal"
    stage: NEW
    amount: { amountMicros: "500000000000", currencyCode: "INR" }
  }) {
    id
    name
    stage
  }
}
```

---

## 2. Chatwoot — REST API

Chatwoot exposes a REST API at `http://localhost:3001/api/v1`.

### Authentication

```bash
# Get your API token from Chatwoot:
# Profile Settings → Access Token

export CHATWOOT_TOKEN="your_api_access_token"
export CHATWOOT_ACCOUNT=1
export BASE_URL="http://localhost:3001/api/v1"
```

### Send a Message

```bash
curl -X POST "$BASE_URL/accounts/$CHATWOOT_ACCOUNT/conversations/1/messages" \
  -H "api_access_token: $CHATWOOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "content": "Hello! How can I help you today?",
    "message_type": "outgoing",
    "content_type": "text"
  }'
```

### Create a Contact

```bash
curl -X POST "$BASE_URL/accounts/$CHATWOOT_ACCOUNT/contacts" \
  -H "api_access_token: $CHATWOOT_TOKEN" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Jane Smith",
    "email": "jane@example.com",
    "phone_number": "+911234567890"
  }'
```

### List Conversations

```bash
curl -X GET "$BASE_URL/accounts/$CHATWOOT_ACCOUNT/conversations" \
  -H "api_access_token: $CHATWOOT_TOKEN"
```

---

## 3. WhatsApp Business Cloud API

### Webhook Setup

Set your Meta App webhook URL to:
```
http://your-server:3001/api/v1/integrations/webhooks/whatsapp
```

Verify token: Set `WHATSAPP_VERIFY_TOKEN` in `.env`

### Send WhatsApp Message (Direct API)

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "recipient_type": "individual",
    "to": "919876543210",
    "type": "text",
    "text": {
      "preview_url": false,
      "body": "Hello from HackQubit CRM!"
    }
  }'
```

### Send Template Message

```bash
curl -X POST \
  "https://graph.facebook.com/v18.0/${WHATSAPP_PHONE_NUMBER_ID}/messages" \
  -H "Authorization: Bearer ${WHATSAPP_ACCESS_TOKEN}" \
  -H "Content-Type: application/json" \
  -d '{
    "messaging_product": "whatsapp",
    "to": "919876543210",
    "type": "template",
    "template": {
      "name": "hello_world",
      "language": { "code": "en_US" }
    }
  }'
```

---

## 4. Voice Calling — Twilio Integration

### Initiate an Outbound Call

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Calls.json" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  --data-urlencode "From=${TWILIO_PHONE_NUMBER}" \
  --data-urlencode "To=+919876543210" \
  --data-urlencode "Record=true" \
  --data-urlencode "RecordingStatusCallback=http://your-server:3001/webhooks/twilio/recording" \
  --data-urlencode "Url=http://your-server:3001/webhooks/twilio/voice"
```

### Call Recording Webhook Handler (n8n)

Configure n8n with this webhook to auto-save recordings to MinIO:

```json
{
  "nodes": [
    {
      "name": "Twilio Recording Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "twilio-recording",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Download Recording",
      "type": "n8n-nodes-base.httpRequest",
      "parameters": {
        "url": "={{$json.RecordingUrl}}.mp3",
        "authentication": "basicAuth",
        "options": { "response": { "fullResponse": true } }
      }
    },
    {
      "name": "Save to MinIO",
      "type": "n8n-nodes-base.s3",
      "parameters": {
        "operation": "upload",
        "bucketName": "call-recordings",
        "fileName": "call-={{$json.CallSid}}.mp3"
      }
    },
    {
      "name": "Update Twenty CRM",
      "type": "n8n-nodes-base.graphql",
      "parameters": {
        "endpoint": "http://twenty-server:3000/api",
        "query": "mutation { createNote(data: { body: \"Call recording: {{$json.RecordingUrl}}\" }) { id } }"
      }
    }
  ]
}
```

---

## 5. SMS — Twilio SMS

### Send SMS

```bash
curl -X POST "https://api.twilio.com/2010-04-01/Accounts/${TWILIO_ACCOUNT_SID}/Messages.json" \
  -u "${TWILIO_ACCOUNT_SID}:${TWILIO_AUTH_TOKEN}" \
  --data-urlencode "From=${TWILIO_PHONE_NUMBER}" \
  --data-urlencode "To=+919876543210" \
  --data-urlencode "Body=Your appointment is confirmed. - HackQubit CRM"
```

---

## 6. n8n — Chatwoot ↔ Twenty CRM Sync Workflow

### Import this workflow into n8n (http://localhost:5678):

```json
{
  "name": "Chatwoot → Twenty CRM Contact Sync",
  "nodes": [
    {
      "name": "Chatwoot Contact Created Webhook",
      "type": "n8n-nodes-base.webhook",
      "parameters": {
        "path": "chatwoot-contact",
        "httpMethod": "POST"
      }
    },
    {
      "name": "Create Contact in Twenty",
      "type": "n8n-nodes-base.graphql",
      "parameters": {
        "endpoint": "http://twenty-server:3000/api",
        "query": "mutation CreatePerson($firstName: String!, $lastName: String!, $email: String!, $phone: String!) { createPerson(data: { name: { firstName: $firstName, lastName: $lastName }, emails: { primaryEmail: $email }, phones: { primaryPhoneNumber: $phone } }) { id name { firstName lastName } } }",
        "variables": {
          "firstName": "={{$json.contact.name.split(' ')[0]}}",
          "lastName": "={{$json.contact.name.split(' ').slice(1).join(' ')}}",
          "email": "={{$json.contact.email}}",
          "phone": "={{$json.contact.phone_number}}"
        }
      }
    }
  ]
}
```

---

## 7. MinIO Object Storage API

### Upload a File (Call Recording)

```bash
# Using AWS CLI (configured for MinIO)
aws s3 cp recording.mp3 s3://call-recordings/2026-10-08/call-abc123.mp3 \
  --endpoint-url http://localhost:9000
```

### List Recordings

```bash
aws s3 ls s3://call-recordings/ --recursive \
  --endpoint-url http://localhost:9000
```

### Pre-signed URL for Secure Download

```bash
aws s3 presign s3://call-recordings/2026-10-08/call-abc123.mp3 \
  --expires-in 3600 \
  --endpoint-url http://localhost:9000
```

---

## 8. RBAC — Role Permission Matrix

| Module | Super Admin | Admin | Manager | Sales Exec | Support |
|--------|:-----------:|:-----:|:-------:|:----------:|:-------:|
| Contacts | CRUD (all) | CRUD (all) | CRUD (team) | CRUD (own) | R (all) |
| Leads | CRUD (all) | CRUD (all) | CRUD (team) | CRUD (own) | R (all) |
| Accounts | CRUD (all) | CRUD (all) | CRUD (team) | CRUD (own) | R (all) |
| Opportunities | CRUD (all) | CRUD (all) | CRUD (team) | CRUD (own) | R (all) |
| Tasks | CRUD (all) | CRUD (all) | CRUD (team) | CRUD (own) | CRU (own) |
| Reports | CRUD (all) | CRUD (all) | R (all) | — | — |
| Users | CRUD (all) | CRUD (all) | — | — | — |
| Roles | CRUD (all) | — | — | — | — |
| Integrations | CRUD (all) | CRUD (all) | — | — | — |
| Call Logs | CRUD (all) | CRUD (all) | R (team) | R (own) | R (all) |
| WhatsApp | CRUD (all) | CRUD (all) | CR (team) | CR (own) | — |
| SMS | CRUD (all) | CRUD (all) | CR (team) | CR (own) | — |

**Legend:** C=Create, R=Read, U=Update, D=Delete | Scope: all/team/own

---

*HackQubit CRM — API & Integration Documentation*
