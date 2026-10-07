# 🏆 HackQubit CRM: Hackathon Pitch & Deployment Guide (Hinglish / हिंदी)

Yeh guide tumhare hackathon presentation aur live demo ke liye banayi gayi hai taaki tum judges ko confidently impress kar sako!

---

## ⚡ 1. Live Deployment Guide (Hackathon Demo Kaise Run Karein)

### Option A: Pure Docker (Sabse Simple & Fast - 1 Command)
Agar tumhare laptop par Docker Desktop installed hai:
```powershell
# Project folder me jao
cd c:\Users\USER\Downloads\hackqubit-crm

# Ek command me sabhi 6 containers up ho jayenge:
docker compose up -d --build
```
Is command se:
1. **PostgreSQL** chalega aur `schema.sql` automatic run hoke table bana dega.
2. **MinIO** chalega persistent volume ke sath.
3. `minio-init` container automatic `call-recordings` aur `attachments` buckets create kar dega.
4. **Redis** start ho jayega.
5. **Backend (Express)** start hoga port `5000` par.
6. **Frontend (React)** build hoke Nginx ke sath port `3000` par run hoga.

Browser open karo: **`http://localhost:3000`**

---

### Option B: Local Development Run (Bina Docker ke - Instant Demo)

#### Terminal 1: Backend
```powershell
cd c:\Users\USER\Downloads\hackqubit-crm\backend
npm install
node src/server.js
```

#### Terminal 2: Frontend
```powershell
cd c:\Users\USER\Downloads\hackqubit-crm\frontend
npm install
npm start
```

---

## 🎤 2. Hackathon 2-Minute Pitch Script (Judges ke Samne Bolne ke Liye)

> *"Good morning respected judges!*
>
> *Aaj traditional CRMs jaise Salesforce aur HubSpot me do sabse badi problem hoti hain:*
> 1. **Data Sovereignty & Vendor Lock-in:** Enterprise companies apne sensitive voice recordings aur customer communication US cloud servers par host nahi karna chahti compliance ke chalte.
> 2. **Siloed Omnichannel Chaos:** Call alag app me hoti hai, WhatsApp alag phone par, Email alag client me, aur customer ka context kho jata hai.
>
> *Isliye humne banaya **HackQubit CRM** — ek **100% Fully Self-Hosted, Docker-Ready Omnichannel CRM**.*
>
> *Key Highlights:*
> - 📦 **Persistent Object Storage via MinIO (S3-compatible):** Hamari WebRTC voice calls ka recording audio directly self-hosted MinIO me securely store hota hai aur timeline me time-limited presigned URLs ke sath play hota hai.
> - 🛡️ **Strict 5-Tier RBAC:** Super Admin (Level 1) se lekar Viewer (Level 5) tak granular role policy backend middleware aur PostgreSQL level par strictly enforced hai.
> - ⚡ **Unified Customer Timeline:** Voice Calls, WhatsApp Cloud API, SMTP Emails, aur Twilio SMS — sabhi interactions ek single unified customer timeline me merge hoti hain bina kisi data mismatch ke.
>
> *Ab hum aapko iska 1-minute live working demo dikhate hain!"*

---

## 🖥️ 3. Step-by-Step Live Demo Flow (Kaha Click Karna Hai)

1. **Login Screen:**
   - Dikhao clean dark glassmorphism UI.
   - Click "Sign In" with default `admin@hackqubit.com` / `Admin@123`.
   
2. **Dashboard Overview:**
   - Judges ko dikhao: KPI metrics (Contacts, Calls, WhatsApp, Deals).
   - Real-time 30-day omnichannel activity chart dikhao (Voice, WA, Email, SMS trends).

3. **Customer Interaction Timeline (Key Requirement):**
   - Left sidebar me **"Customers & CRM"** par click karo.
   - "Arjun Sharma" par click karo.
   - Right panel me dekhein: ek hi timeline me **Call recording**, **WhatsApp chat**, **Email**, aur **SMS** ek sath dikh rahe hain.

4. **Live Call & Recording Simulation:**
   - Click karo **"Voice & Recordings"** tab par.
   - "New Call" initiate karo. Screen par WebRTC floating dialer widget appear hoga with live timer.
   - Hangup karne par notes save honge aur MinIO bucket me audio push hoga.

5. **WhatsApp Cloud API Inbox:**
   - Click karo **"WhatsApp Cloud"**.
   - Live chat thread open hoga jisme incoming/outgoing Meta webhook simulation dikhegi.

6. **5-Tier RBAC Demonstration:**
   - Click karo **"5-Tier RBAC"**.
   - Show karo kaise:
     - **Tier 1 (Super Admin):** Full system & Docker engine controls.
     - **Tier 2 (Admin):** Organization-wide access.
     - **Tier 3 (Manager):** Team audit & call playback.
     - **Tier 4 (Agent):** Sirf unke assigned customers & dialer.
     - **Tier 5 (Viewer):** Read-only mode.

---

## ❓ 4. Judges Expected Questions & Best Answers (Q&A)

### Q1: "Call recordings ko MinIO me store karne ka kya advantage hai instead of standard SQL database?"
> **Answer:** "Audio recordings large binary blobs (BLOBs) hoti hain. Agar unhe PostgreSQL me store karenge to database ka size bohot jaldi inflate hoga, backups slow ho jayenge aur performance degrade hogi. MinIO ek lightweight S3-compatible object storage hai jo Docker container me persistent volume ke sath chal raha hai. Hamara backend audio ko MinIO me stream karta hai aur database me sirf path save karta hai. Playback ke time secure presigned URLs generate hote hain jo 1 hour me expire ho jate hain."

### Q2: "5-Tier RBAC ko security perspective se kaise enforce kiya hai?"
> **Answer:** "Humne RBAC ko purely frontend visual check tak limit nahi kiya. JWT token ke payload me role and level store hota hai. Express ke middleware layer par `authorize(minRole, resource, action)` function har API call par numeric hierarchy (Level 1 < Level 2 < ... < Level 5) verify karta hai. Agent level users sirf unhi contacts ko query kar sakte hain jahan `assigned_to = user.id` ho."

### Q3: "WhatsApp Cloud API me rate limiting aur webhook verification kaise handle hota hai?"
> **Answer:** "Humne Meta ke standard `GET /webhook` verification endpoint implement kiya hai with SHA verification token. Inbound messages aane par system phone number se contact lookup karta hai, aur agar contact exist nahi karta to automatically new lead create karke timeline se attach kar deta hai."
