# CAREVERSE — AI-Powered Intelligent Elderly Healthcare Management Ecosystem

> **Your Health. Your Family. One Connected Circle.**

CAREVERSE is a production-quality, full-stack healthcare ecosystem engineered specifically for the needs of elderly individuals and their surrounding care network (family members, home caregivers, nurses, and clinicians).

Built for competitive hackathon evaluation and cloud deployment, CAREVERSE delivers:
- **Patient-Centric Simplicity**: Designed to maximize autonomy with high contrast mode, 125% large text scaling, audible screen-reader announcements, and multilingual support (English, தமிழ், हिन्दी).
- **Clinical Safety First**: Automated medication dose tracking with advance notices, grace periods, caregiver missed-dose escalations, and strict clinical protocols (such as never suggesting double doses).
- **Family Care Collaboration**: Secure cryptographically hashed invitations, granular permissions, and automated family daily care summaries.
- **CareBuddy AI Companion**: Context-aware assistant knowing the patient's schedule, appointments, and vitals, providing plain-language explanations with transparent medical safety guardrails.
- **Evaluator-Ready Zero Config**: Instant 1-click demo logins for all 4 roles, built-in persistent storage adapter mirroring the Supabase Postgres schema & RLS policies, and a visual in-app Notification Simulator.

---

## 🚀 Quick Start

### Prerequisites
- Node.js v18+ (tested on Node.js v22 & v26)
- npm v9+

### 1. Installation
Clone the repository and install dependencies for all workspaces:
```bash
git clone https://github.com/your-username/Careverse.git
cd Careverse
npm install
```

### 2. Run Automated Test Suite
Run the 33 comprehensive automated unit, integration, and security tests:
```bash
npm test
```
To run tests separately:
```bash
npm run test:server    # 28 Vitest unit, API, and security tests
npm run test:client    # 5 Vitest component & i18n accessibility tests
```

### 3. Start Development Servers
Start both backend API (`http://localhost:5000`) and frontend Vite client (`http://localhost:5173`):
```bash
npm run dev:server     # Terminal 1: Backend Express API + Reminder Engine
npm run dev:client     # Terminal 2: Frontend Vite React Application
```

Visit **`http://localhost:5173`** in your browser.

---

## 👥 Instant Evaluator Demo Logins (1-Click)

On both the Landing Page and Login Page, you can click any of the 4 demo accounts to immediately test role-specific workflows with realistic fictional healthcare data:

| Role | Demo Name | Demo Email | Password | Primary Workflow |
| :--- | :--- | :--- | :--- | :--- |
| **Elderly Patient** | Eleanor Vance (Age 74) | `eleanor@careverse.demo` | `Demo1234!` | Daily dose timeline, mark doses taken, Daily Care Score, SOS trigger, CareBuddy |
| **Family Member** | David Vance (Son) | `david@careverse.demo` | `Demo1234!` | Daily care digest, adherence trends, upcoming doctor visits, care notes |
| **Caregiver / Nurse** | Sarah Jenkins, RN | `sarah@careverse.demo` | `Demo1234!` | Medication administration, missed dose alerts, vitals & clinical notes |
| **Administrator** | Dr. Marcus Chen | `admin@careverse.demo` | `Demo1234!` | System health monitor, platform stats, complete security audit activity log |

---

## 🧩 Architectural Modules

### 1. Smart Reminder & Notification Engine
- **Background Cron Engine**: Runs every 60 seconds inspecting medication schedules, appointment timings, and remaining prescription supply.
- **Advance Notices**: 15 minutes before scheduled dose.
- **Grace Periods & Escalation**: If an elderly patient does not record a dose within 30 minutes, it is marked as `missed` and an urgent escalation alert is dispatched to authorized Care Circle members.
- **Appointment Alerts**: Automated notices 24 hours and 2 hours prior to medical consultations.
- **Visual Notification Simulator**: Evaluators can open the **Simulated Inbox** button in the navbar to inspect all dispatched email templates with complete HTML formatting, delivery timestamps, and recipient details.
- **Production Email Delivery**: Integrates seamlessly with the **Resend SDK** when `RESEND_API_KEY` is supplied in `.env`.

### 2. Medication Management & Dose Tracking
- **Prescription Details**: Name, category, dosage, strength, frequency, times of day, instructions, prescribing clinician, pharmacy, icon, total and remaining pill counts.
- **Dose Status Transitions**: `upcoming` → `due_now` → `taken` / `missed` / `skipped` / `acknowledged`.
- **Duplicate Administration Prevention**: Conflicting multiple administrations for the same slot are rejected with HTTP 409.
- **Refill Intelligence**: Automatically warns patient and family when remaining pill count reaches 5 or fewer doses.
- **Medical Safety Protocol**: Missed dose notices strictly emphasize never taking a double dose.

### 3. Family Care Circle & Cryptographic Invitations
- **Zero Shared Passcodes**: Each family member or caregiver registers their own individual authenticated account.
- **Hashed Token Exchange**: The patient creates an invitation code hashed using SHA-256 with a 7-day expiration.
- **Granular Permissions**:
  - `can_view`: View profile & health records
  - `can_manage_meds`: Record medication administration & doses
  - `can_manage_appointments`: Schedule and update doctor consultations
  - `can_add_notes`: Log vitals and observations
- **Access Revocation**: Patient can revoke any member's access instantly.
- **Audit Logging**: Patient can inspect a real-time list of who accessed their profile.

### 4. CareBuddy AI Assistant
- **Context-Aware Assistance**: Gathers real-time patient context including active prescriptions, today's taken vs pending doses, next appointment, and wellbeing check-in.
- **Capabilities**:
  - Summarize today's routine in a friendly conversational style
  - Suggest personalized questions for upcoming clinician appointments
  - Explain medical terminology (e.g., ACE inhibitors, HbA1c, Metformin) in plain language
  - Safety protocol explanations for missed doses
- **Audio Read-Aloud Accessibility**: Uses Web Speech API to read assistant replies aloud for seniors with visual fatigue.
- **Medical Safety Guardrails**: Includes a permanent clinical disclaimer; never prescribes, changes dosages, or replaces a licensed doctor.

### 5. Emergency SOS Assistance
- **Prominent Accessible SOS Button**: Positioned in the header and dashboard.
- **Confirmation Dialog**: Prevents accidental activation while remaining accessible.
- **Immediate Dispatch**: Alerts all active Care Circle members with known address, primary conditions, and allergies.
- **Emergency Dialing Instructions**: Prominently displays local medical dispatch numbers (911 in US/Canada, 112 in India/Europe, 999 in UK).
- **Accidental Press Cancellation**: Patient can cancel activation to notify family that they are safe.

### 6. Analytics & Reports
- **Real Calculated Adherence**: Interactive Recharts bar and pie graphs for 7, 14, and 30-day compliance.
- **Prescription Category Breakdown**: Shows adherence per medical category.
- **CSV Report Export**: Real-time downloadable CSV containing every administration record, scheduled time, actual time, recording user, and notes.

### 7. WCAG 2.2 AA Accessibility & Multilingual Support
- **Large Text Scaling**: 125% font scaling toggle across the entire application.
- **High Contrast Mode**: 7:1+ contrast borders, deep backgrounds, and high-visibility focus indicators.
- **Multilingual System**: Real-time switching between English, தமிழ் (Tamil), and हिन्दी (Hindi).

---

## 🛠️ Tech Stack & Directory Structure

```
Careverse/
├── client/                     # Frontend (React 18 + Vite + TypeScript + Tailwind CSS)
│   ├── src/
│   │   ├── components/         # A11y, Emergency, CareBuddy, Medication, Appointment, CareCircle
│   │   ├── context/            # AuthContext, A11yContext, LanguageContext
│   │   ├── i18n/               # en.ts, ta.ts, hi.ts
│   │   ├── pages/              # Landing, Dashboards (Elderly, Family, Caregiver, Admin), Feature pages
│   │   ├── services/           # Typed api.ts client
│   │   └── types/              # Frontend TypeScript definitions
├── server/                     # Backend (Express + TypeScript + REST + Storage Adapter)
│   ├── src/
│   │   ├── config/             # Environment configuration & constants
│   │   ├── db/                 # Storage adapter with Supabase schema & realistic seed data
│   │   ├── middleware/         # Auth, RBAC, Rate Limiting, Error Handler
│   │   ├── routes/             # Auth, Meds, Appointments, Circle, Wellbeing, AI, SOS, Audit, System
│   │   ├── services/           # ReminderEngine, EmailService (Resend + Simulator), CareScore, CareBuddy
│   │   └── server.ts           # Server entry point
│   └── tests/                  # Vitest Unit, Integration, and Security test suites
├── database/                   # Database migrations & Supabase RLS
│   ├── migrations/             # 001_initial_schema.sql, 002_rls_policies.sql
│   └── seeds/                  # 001_seed_realistic_demo_data.sql
├── Dockerfile                  # Multi-stage production container
├── docker-compose.yml          # Containerized local testing
├── ARCHITECTURE.md             # Detailed engineering architecture
├── SECURITY.md                 # Threat model & RLS policies
└── TESTING.md                  # Test execution report
```

---

## 🚢 Docker & Production Deployment

### Build and Run with Docker Compose
```bash
docker-compose up --build
```
The application will be accessible at `http://localhost:8080`.

### Google Cloud Run Deployment
The Dockerfile is structured as a multi-stage Alpine build serving both backend API and static frontend assets on the standard `$PORT` (default 8080):
```bash
gcloud run deploy careverse \
  --source . \
  --platform managed \
  --region us-central1 \
  --allow-unauthenticated
```

---

## 📜 License
MIT License. Built for the Intelligent Elderly Healthcare Ecosystem Challenge.
