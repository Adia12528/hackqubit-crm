# Omnichannel Communication Integration

None of the four channels below are natively wired to each other — each
is its own bridge that talks to EspoCRM's REST API and lands activity on
the contact's timeline. This doc covers the pattern once, then each
channel's specifics.

## The shared pattern

```
External channel (WhatsApp / SMS / Voice provider)
        │  webhook (inbound) / API call (outbound)
        ▼
  Small bridge service  ───────────────►  EspoCRM REST API
  (Node/Express or Python/Flask,                │
   one per channel or one combined)              ▼
        │                              Contact/Lead timeline
        ▼                              (Email, Call, or Note record,
  MinIO (for recordings/attachments)    linked by phone/email match)
```

**EspoCRM REST API basics** (same for every bridge):
- Create an API user: Administration → API Users → generate a key.
- Auth header: `X-Api-Key: <ESPOCRM_API_KEY>`.
- Entities are REST resources: `GET/POST /api/v1/Contact`,
  `/api/v1/Lead`, `/api/v1/Call`, `/api/v1/Email`, `/api/v1/Note`, etc.
  Search existing contacts by phone/email with a `where` filter before
  creating a duplicate — full field reference is in EspoCRM's own API
  docs (Administration → look for the built-in API documentation link,
  or docs.espocrm.com).

## 1. Email — native, no bridge needed

EspoCRM has built-in IMAP/SMTP. Configure from the admin UI (not code):
- **Outbound:** Administration → Outbound Emails — fill in your
  `SMTP_HOST`/port/credentials from `.env`.
- **Inbound:** Administration → Email Accounts (personal) or Group Email
  Accounts (shared team inbox) — fill in `IMAP_HOST`/port/credentials.
  EspoCRM polls IMAP via the `espocrm-daemon` container, so make sure
  that service is running (it is, in our `docker-compose.yml`).

Every email sent/received this way is automatically logged against the
matching Contact/Lead by email address — nothing further to build.

## 2. WhatsApp — Meta Cloud API bridge

1. Create a Meta Developer App → add the WhatsApp product → get a test
   phone number (or your own verified business number).
2. Set `WHATSAPP_PHONE_NUMBER_ID`, `WHATSAPP_ACCESS_TOKEN`, and a
   `WHATSAPP_VERIFY_TOKEN` (any string you choose) in `.env`.
3. **Inbound bridge:** a small webhook endpoint (e.g.
   `POST /webhooks/whatsapp`) that Meta calls on every message:
   - Verify the request (Meta's GET challenge on setup, uses
     `WHATSAPP_VERIFY_TOKEN`).
   - Look up the sender's phone number against EspoCRM Contacts via the
     REST API; create the Contact if not found.
   - Create a timeline record (an `Email`-type entity works well since
     EspoCRM's stream UI renders it nicely, or define a custom
     `WhatsAppMessage` entity via Administration → Entity Manager if you
     want it visually distinct — Entity Manager is no-code).
4. **Outbound:** trigger from an EspoCRM Workflow (Administration →
   Workflows can call a webhook on a button click or status change) that
   POSTs to the bridge, which then calls Meta's
   `POST /{phone-number-id}/messages` Graph API endpoint.

## 3. SMS — gateway bridge

Same shape as WhatsApp, simpler payloads. Any gateway with inbound
webhooks + an outbound send API works (Twilio, MSG91, Plivo — swap the
`SMS_GATEWAY_*` variables in `.env` for whichever you pick). Log every
message as a Note or custom `SmsMessage` entity linked to the Contact by
phone number, same as WhatsApp.

## 4. Voice calling with recording — the hard one

Two realistic paths — pick based on your remaining time:

### Option A: Reuse your own WebRTC calling (recommended if time allows)
If your team already has a working WebRTC + Socket.io calling setup,
this is the most "fully self-hosted" option and the fastest to build on
top of existing code:
- Embed a click-to-call button on the EspoCRM Contact page (a small
  custom frontend extension, or simply an external page opened from a
  button) that starts a WebRTC call to/through your signaling server.
- **Recording:** pure peer-to-peer WebRTC audio never touches a server,
  so record client-side with the `MediaRecorder` API. Mix local + remote
  tracks into one stream (via the Web Audio API) so the recording
  captures both sides of the conversation, not just one.
- On call end, upload the recorded audio blob to a small backend
  endpoint, which pushes it to the MinIO bucket and creates a `Call`
  record in EspoCRM (via the REST API) with the recording attached as a
  Document, linked to the right Contact.
- Caveat: PSTN (actual phone numbers) isn't reachable this way — this
  only covers browser-to-browser calls (CRM user ↔ CRM user, or CRM user
  ↔ someone you send a call link to). Fine for an internal/demo
  scenario; not for calling a customer's real phone number.

### Option B: Cloud telephony provider (Twilio Voice, Exotel, Plivo)
If you need to call real phone numbers (PSTN):
- The provider handles the actual call + recording server-side.
- Their webhook delivers a recording URL + call metadata when the call
  ends → your bridge downloads the recording, uploads it to MinIO, and
  creates the `Call` record in EspoCRM via the REST API, same as above.
- Faster to get working, but it's an external paid service doing the
  actual calling — be upfront about that trade-off in your presentation
  (no cloud/self-hosted CRM setup can originate real PSTN calls without
  *some* carrier connection; this is true even for commercial CRMs).

Either way, every recording lands in the same place: **MinIO**, with a
`Call` record in EspoCRM pointing at it — so the rest of the CRM
(timeline, reporting, RBAC) treats it identically regardless of which
option you chose.

## What to show the judges

A single flow end-to-end is more convincing than four half-built ones:
pick **one** channel (Email is the fastest since it's native — zero
custom code) and get it fully working first, then add WhatsApp/SMS/Voice
in that order if time remains.
