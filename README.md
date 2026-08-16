# 🏥 MediFlow — Smart Hospital Operations & Real-Time Patient Flow Platform

[![Next.js](https://img.shields.io/badge/Next.js-16.3.0-black?style=flat-square&logo=next.js)](https://nextjs.org/)
[![React](https://img.shields.io/badge/React-19.2.8-blue?style=flat-square&logo=react)](https://react.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0+-3178c6?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![Prisma](https://img.shields.io/badge/Prisma-7.9.1-2D3748?style=flat-square&logo=prisma)](https://www.prisma.io/)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-Neon_DB-4169e1?style=flat-square&logo=postgresql)](https://neon.tech/)
[![Tailwind CSS](https://img.shields.io/badge/Tailwind_CSS-v4.0-38bdf8?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![Vitest](https://img.shields.io/badge/Vitest-4.1-6e9f18?style=flat-square&logo=vitest)](https://vitest.dev/)
[![TanStack Query](https://img.shields.io/badge/TanStack_Query-v5-ff4154?style=flat-square&logo=reactquery)](https://tanstack.com/query/latest)

MediFlow is a modern, full-stack hospital management and real-time patient-flow orchestration platform. Built with **Next.js 16 (App Router)**, **React 19**, **TypeScript**, and **Prisma ORM**, it transforms the outpatient department (OPD) experience by replacing crowded waiting rooms with deterministic appointment booking, live queue streaming (SSE), digital consultation rooms, structured electronic prescriptions, and AI-driven clinical triage.

---

## 📑 Table of Contents

1. [Platform Overview](#-platform-overview)
2. [Key Capabilities & Architecture](#-key-capabilities--architecture)
3. [Role Portals & Feature Matrix](#-role-portals--feature-matrix)
   - [Patient Portal](#1-patient-portal)
   - [Doctor Portal](#2-doctor-portal)
   - [Admin & Front-Desk Portal](#3-admin--front-desk-portal)
4. [AI Clinical Assistant & Triage](#-ai-clinical-assistant--triage)
5. [Real-Time Queue & Scheduling Engine](#-real-time-queue--scheduling-engine)
6. [Security & Authentication](#-security--authentication)
7. [Tech Stack](#-tech-stack)
8. [Database Schema & Entity Model](#-database-schema--entity-model)
9. [API Reference Directory](#-api-reference-directory)
10. [Environment Variables](#-environment-variables)
11. [Installation & Setup](#-installation--setup)
12. [Seeding & Admin Account Creation](#-seeding--admin-account-creation)
13. [Automated Cron Jobs](#-automated-cron-jobs)
14. [Testing & Quality Assurance](#-testing--quality-assurance)
15. [Project Structure](#-project-structure)

---

## 🌟 Platform Overview

In traditional healthcare setups, patients book appointment slots but face unpredictable wait times due to doctor delays, emergency walk-ins, and manual queue registers. MediFlow solves this end-to-end:

```
[ Discovery / Search ] ──► [ Deterministic Booking ] ──► [ Smart Check-In ]
                                                                │
[ Follow-Up / Records ] ◄── [ Digital Prescription ] ◄── [ Live Queue / Consultation ]
```

- **Zero Overbooking**: Deterministic slot-generation algorithm accounts for doctor working hours, shift breaks, customizable buffer times, and temporary blocked dates.
- **Live Queue Streaming**: Patients and receptionists track real-time queue position, estimated wait times, and doctor status updates via Server-Sent Events (SSE) and reactive polling.
- **Clinical Productivity**: Streamlined consultation screen for doctors to review medical history, enter diagnostic notes, and generate itemized electronic prescriptions in under 60 seconds.
- **Enterprise Multi-Branch Operations**: Manage hospitals across multiple branches with independent departments, localized timezones, and branch-level booking policies.

---

## ⚙️ Key Capabilities & Architecture

```mermaid
graph TD
    Client[Patient / Doctor / Admin Client] --> Proxy[Next.js Proxy & RBAC Middleware]
    Proxy --> CSRF[Origin & CSRF Verifier]
    CSRF --> RateLimit[In-Memory IP Rate Limiter]
    RateLimit --> API[App Router REST Endpoints /api/v1/*]
    
    subgraph "Core Business Logic Services"
        API --> AuthService[Auth & Session Service]
        API --> AppointmentService[Appointment & Slot Engine]
        API --> QueueService[Queue & SSE EventBus Service]
        API --> ConsultationService[Consultation & Rx Service]
        API --> AdminService[Admin & Analytics Service]
        API --> AIService[AI Symptom Assistant]
        API --> PaymentService[Payment & Refund Service]
    end
    
    subgraph "Data Layer"
        AuthService --> Prisma[Prisma ORM 7.9]
        AppointmentService --> Prisma
        QueueService --> Prisma
        ConsultationService --> Prisma
        AdminService --> Prisma
        PaymentService --> Prisma
        Prisma --> NeonDB[(PostgreSQL / Neon DB)]
    end
```

---

## 👥 Role Portals & Feature Matrix

### 1. 🩺 Patient Portal
- **Interactive Dashboard (`/patient/dashboard`)**: Live summary of upcoming appointments, current queue position tracker with dynamic progress visualization, active prescription cards, and quick shortcuts.
- **Doctor Search & Discovery (`/patient/search`)**: Filter doctors by department, branch, language, consultation fee range, rating, and earliest available slot with debounced search.
- **Doctor Profile (`/patient/doctor/[id]`)**: Full biography, medical qualifications, years of experience, patient reviews, OPD schedule, and interactive booking modal.
- **Booking Wizard (`/patient/book`)**: 4-step wizard with branch/doctor selector, interactive date & slot picker, patient details confirmation, payment provider choice, and instant token generation (`A-01`, etc.).
- **Appointment Management (`/patient/appointments`)**: Filter between upcoming and past visits with self-service check-in, rescheduling within allowed cutoffs, cancellations with automated refunds, and navigation directions.
- **Live Queue Tracking (`/patient/queue`)**: Real-time queue tracker showing current serving token, tokens ahead, estimated minutes remaining, doctor delay notices, and kiosk arrival instructions.
- **Prescription Repository (`/patient/prescriptions`)**: Structured list of all digital prescriptions with medicine dosage, frequency (`1-0-1`), duration, special instructions, and print-ready format.
- **Medical History (`/patient/medical-history`)**: Centralized repository of past diagnoses, clinical notes, doctor comments, and uploaded lab documents.
- **Profile & Health Data (`/patient/profile`)**: Manage personal details, emergency contacts, blood group, age, gender, and security settings.

---

### 2. 👨‍⚕️ Doctor Portal
- **Clinical Dashboard (`/doctor/dashboard`)**: Real-time snapshot of today's OPD queue, currently called patient, completed consultations counter, and doctor availability status switch (`AVAILABLE`, `IN_CONSULTATION`, `ON_BREAK`, `DELAYED`, `OFFLINE`).
- **Live Consultation Room (`/doctor/consultation/[tokenId]`)**:
  - Patient history drawer displaying past visits and diagnoses.
  - Clinical notes & primary diagnosis capture.
  - **Prescription Builder**: Dynamic medication rows with auto-complete fields for drug name, dosage (e.g. `500mg`), frequency (e.g. `1-0-1`), duration (e.g. `5 days`), and dietary instructions.
  - Follow-up date scheduler.
  - One-click completion that marks the queue token as `DONE` and auto-advances the OPD queue.
- **Schedule & Availability Manager (`/doctor/schedule`)**: Configure weekly working hours per day, lunch break windows, consultation slot duration (e.g. 15/20/30 mins), and slot buffer times.
- **Blocked Slots & Leave Calendar (`/doctor/schedule`)**: Block full days or partial hours for emergency leave or surgery without disrupting previously confirmed slots.
- **Doctor Profile (`/doctor/profile`)**: Customize public profile, bio, languages spoken, specialties, and consultation fees.

---

### 3. 🏛️ Admin & Front-Desk Portal
- **Executive Operations Dashboard (`/admin/overview`)**: High-level hospital overview showing total appointments today, patient check-in rate, active OPD doctors, revenue collected, and live queue bottleneck indicators.
- **Multi-Doctor Queue Orchestrator (`/admin/queue`)**: Central control room for all OPD rooms. Call next patient on behalf of doctors, reorder tokens for medical emergencies, mark no-shows, and adjust doctor delay announcements.
- **Reception Check-in Kiosk (`/admin/checkin`)**: Fast search by Token ID, patient name, or phone number. Check in arriving patients, enforce branch grace periods, and reinstate missed tokens.
- **Master Appointment Registry (`/admin/appointments`)**: Searchable, filterable list of all hospital appointments with filters for branch, department, doctor, date range, and status. Manual booking and administrative overrides.
- **Doctor Roster & Onboarding (`/admin/doctors`)**: Onboard new medical specialists, configure department assignments, set consultation fees, and activate/deactivate accounts.
- **Branch & Booking Policy Management (`/admin/branches`)**: Configure branch addresses, timezones, and operational policies:
  - `earlyCheckinMin` (e.g., 60 mins before slot)
  - `gracePeriodMin` (e.g., 15 mins after slot)
  - `maxAdvanceBookDays` (e.g., 30 days)
  - `rescheduleCutoffHrs` (e.g., 2 hours before slot)
- **Department Directory (`/admin/departments`)**: Organize clinical specialties and department hierarchies per hospital branch.
- **Analytics & Revenue Reporting (`/admin/analytics`)**: Interactive visual analytics powered by **Recharts**:
  - Daily & weekly appointment volume trends.
  - Departmental revenue breakdown.
  - Average patient waiting times vs. consultation durations.
  - Doctor schedule utilization & cancellation metrics.

---

## 🤖 AI Clinical Assistant & Triage

MediFlow features an embedded **AI Symptom Assistant** (`/api/v1/ai/symptom-checker`) accessible from the landing page and patient dashboard:

1. **Critical Emergency Detection**: Scans symptom inputs against life-threatening indicators (e.g., severe chest pain, stroke symptoms, respiratory distress, anaphylaxis) and alerts the patient to seek immediate emergency care.
2. **Urgency Classification**: Categorizes symptoms into `LOW`, `MEDIUM`, `HIGH`, or `CRITICAL` triage priority.
3. **Smart Department Recommendation**: Maps patient symptoms to the most relevant medical department (e.g. Cardiology, Neurology, Orthopedics, Pediatrics, Dermatology) with confidence scoring and clinical rationale.
4. **Doctor Consultation Prep**: Generates personalized questions the patient should ask their doctor during the appointment.

---

## ⏱️ Real-Time Queue & Scheduling Engine

### Slot Calculation Engine
The scheduling service generates valid booking slots on-the-fly:
1. Resolves doctor's weekly recurring availability for the target day (`dayOfWeek`, `startTime`, `endTime`, `breakStart`, `breakEnd`).
2. Checks branch advance booking limits (`maxAdvanceBookDays`).
3. Subtracts all active `BlockedSlot` ranges (full-day or partial-day leave).
4. Slices available time into discrete intervals based on `appointmentDurationMin` + `bufferMinutes`.
5. Removes existing confirmed appointments (`Appointment` records with `CONFIRMED`, `CHECKED_IN`, `WAITING`, `IN_CONSULTATION`).
6. Returns clean, collision-free slot arrays with idempotency guarantees.

### Live Queue State Transitions
```
[ Booked: CONFIRMED ]
       │ (Patient arrives at clinic / kiosk check-in)
       ▼
[ CHECKED_IN / WAITING ] ──► (QueueToken created with position #)
       │
       ├── (Doctor clicks "Call Next") ──► [ IN_PROGRESS / IN_CONSULTATION ]
       │                                            │
       │                                            ▼
       │                                    [ DONE / COMPLETED ]
       │
       └── (Patient fails to arrive) ──► [ NO_SHOW ] ──► (Optional Reinstatement)
```

- **SSE Streaming**: `/api/v1/queue/[doctorId]/stream` provides an open Server-Sent Events stream for instant UI updates when a token is called or status changes.
- **Idempotency Protection**: All booking and payment requests require unique idempotency keys to prevent double-booking on network retries.

---

## 🔐 Security & Authentication

- **Dual-Secret JWT Architecture**:
  - `JWT_ACCESS_SECRET`: Signs short-lived access tokens (15-minute TTL) stored in `HttpOnly`, `SameSite=Lax` cookies.
  - `JWT_REFRESH_SECRET`: Signs long-lived refresh tokens (7-day TTL).
  - Cryptographic token hashing (`sha256`) stored in the database for instant session invalidation upon logout or credential reset.
- **Next.js Proxy & RBAC Middleware (`src/proxy.ts`)**:
  - Server-side route interception for `/patient/*`, `/doctor/*`, and `/admin/*`.
  - Automatic redirect of authenticated users away from `/auth/login` to their designated dashboard.
- **CSRF & Origin Verification (`src/lib/api/csrf.ts`)**:
  - Rejects mutating cross-origin HTTP requests (`POST`, `PUT`, `PATCH`, `DELETE`) in production.
- **IP Sliding-Window Rate Limiting (`src/lib/api/rate-limit.ts`)**:
  - Protects auth routes (`/api/v1/auth/login`, `/api/v1/auth/otp/*`) against brute-force attacks.
- **Account Lockout Policy**:
  - Automatically locks accounts for 15 minutes after 5 consecutive failed login attempts.
- **OTP Verification via Resend (`src/lib/services/OtpDeliveryService.ts`)**:
  - 6-digit numeric OTPs with 5-minute TTL delivered via **Resend Email API** in production (with dev fallback logging).

---

## 💻 Tech Stack

| Layer | Technology | Description |
|---|---|---|
| **Framework** | Next.js 16.3.0 | App Router, Server Components, Route Handlers |
| **UI Library** | React 19.2.8 | Latest React features and concurrent rendering |
| **Language** | TypeScript 5+ | Strict type safety across client and server |
| **Database** | PostgreSQL | Hosted on Neon DB with connection pooling |
| **ORM** | Prisma 7.9.1 | Type-safe query builder with `@prisma/adapter-pg` |
| **Styling** | Tailwind CSS v4 | Modern styling with `@tailwindcss/postcss` |
| **State & Cache**| TanStack Query v5 | Server-state caching, background revalidation |
| **Forms & Validation** | React Hook Form & Zod | Client & server-side schema validation |
| **Auth & Crypto** | `jose` & `bcryptjs` | JWT signing, verification, and bcrypt hashing |
| **Animations** | Motion 13 | Smooth UI transitions, tilt cards, magnetic buttons |
| **Charts** | Recharts 3.10 | Data visualization for admin & doctor analytics |
| **Icons** | Lucide React | High-density vector iconography |
| **Testing** | Vitest 4.1 | Fast unit and integration test runner |

---

## 🗄️ Database Schema & Entity Model

The MediFlow schema (`prisma/schema.prisma`) represents a complete hospital relational model:

```
User (Role: PATIENT, DOCTOR, ADMIN)
 ├── RefreshToken (tokenHash, expiresAt)
 ├── PasswordResetToken (tokenHash, expiresAt)
 ├── OtpVerification (code, attempts, expiresAt)
 ├── Notification (type, channel, readAt)
 │
 ├── Patient
 │    ├── Appointment (status, tokenNumber, date, feeSnapshot)
 │    │    ├── QueueToken (position, status, calledAt)
 │    │    ├── Payment (amount, status, provider, transactionId)
 │    │    └── Consultation (diagnosis, notes, followUpDate)
 │    │         └── Prescription
 │    │              └── PrescriptionItem (medicine, dose, frequency, duration)
 │    ├── MedicalRecord (type, title, fileUrl)
 │    └── Review (rating, comment)
 │
 ├── Doctor
 │    ├── Department ──► Branch ──► Hospital
 │    ├── DoctorAvailability (dayOfWeek, startTime, endTime, breakStart, breakEnd)
 │    ├── BlockedSlot (date, startTime, endTime, isFullDay)
 │    ├── Appointment / Consultation
 │    └── Review
 │
 └── Admin
      └── AuditLog (actorId, action, entity, metadata)
```

---

## 📡 API Reference Directory

All endpoints reside under the `/api/v1` namespace:

### 🔐 Authentication (`/api/v1/auth`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/auth/register` | Register new patient account | Public |
| `POST` | `/api/v1/auth/login` | Email/Phone + password login (sets HTTP-only cookies) | Public |
| `POST` | `/api/v1/auth/logout` | Revokes refresh token and clears auth cookies | Yes |
| `GET` | `/api/v1/auth/me` | Fetch authenticated user session and role profile | Yes |
| `POST` | `/api/v1/auth/otp/verify` | Verify 6-digit OTP code | Public |
| `POST` | `/api/v1/auth/otp/resend` | Resend OTP code (rate-limited) | Public |
| `POST` | `/api/v1/auth/forgot-password`| Request password reset link / token | Public |
| `POST` | `/api/v1/auth/reset-password` | Reset password using verified token | Public |
| `POST` | `/api/v1/auth/change-password`| Change account password | Yes |

### 📅 Appointments (`/api/v1/appointments`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/appointments` | List patient / doctor appointments with filters | Yes |
| `POST` | `/api/v1/appointments` | Book appointment (requires idempotencyKey) | Patient / Admin |
| `GET` | `/api/v1/appointments/[id]` | Fetch appointment details and token status | Yes |
| `PATCH` | `/api/v1/appointments/[id]` | Cancel or reschedule appointment | Yes |
| `POST` | `/api/v1/appointments/[id]/checkin` | Check in patient for appointment | Yes |
| `POST` | `/api/v1/appointments/[id]/reinstate` | Reinstate missed / no-show token | Admin / Doctor |
| `POST` | `/api/v1/appointments/send-reminders`| Automated 24h SMS/email appointment reminders | Cron / Admin |
| `POST` | `/api/v1/appointments/sweep-noshows` | Automated end-of-day no-show sweeper | Cron / Admin |

### 🚶 Queue Management (`/api/v1/queue`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/queue/[doctorId]` | Get current queue status, waiting list, active token | Yes |
| `GET` | `/api/v1/queue/[doctorId]/stream` | Server-Sent Events (SSE) live queue feed | Yes |
| `POST` | `/api/v1/queue/[doctorId]/call-next` | Advance OPD queue & call next patient | Doctor / Admin |
| `POST` | `/api/v1/queue/[doctorId]/reorder` | Emergency priority reordering of tokens | Admin / Doctor |
| `PATCH`| `/api/v1/queue/[doctorId]/status` | Update doctor status (`AVAILABLE`, `DELAYED`, etc.) | Doctor / Admin |

### 🩺 Consultations & Prescriptions (`/api/v1/consultations`, `/api/v1/patients`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/consultations/[tokenId]` | Get consultation session details & patient history | Doctor / Admin |
| `POST` | `/api/v1/consultations/[tokenId]` | Complete consultation with diagnosis & prescription | Doctor |
| `GET` | `/api/v1/patients/prescriptions` | List digital prescriptions for patient | Patient |
| `GET` | `/api/v1/patients/prescriptions/[id]` | Fetch detailed prescription with medication items | Yes |
| `GET` | `/api/v1/patients/[id]/history` | Access complete medical consultation history | Doctor / Admin |
| `GET` | `/api/v1/patients/profile` | View / update patient demographic profile | Patient |

### 👨‍⚕️ Doctors & Directory (`/api/v1/doctors`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/doctors` | Search doctor directory with filters | Public |
| `GET` | `/api/v1/doctors/[id]` | Fetch doctor profile, fees, and reviews | Public |
| `GET` | `/api/v1/doctors/[id]/schedule` | Get available booking slots for selected date | Public |
| `GET` | `/api/v1/doctors/[id]/availability` | Get weekly recurring OPD working hours | Public |
| `POST` | `/api/v1/doctors/[id]/availability` | Save weekly working hours and break times | Doctor / Admin |
| `GET` | `/api/v1/doctors/[id]/blocked-slots`| List doctor blocked dates / leaves | Doctor / Admin |
| `POST` | `/api/v1/doctors/[id]/blocked-slots`| Block date / slot range for leave | Doctor / Admin |
| `DELETE`| `/api/v1/doctors/[id]/blocked-slots/[slotId]` | Remove blocked date / slot | Doctor / Admin |
| `POST` | `/api/v1/doctors/[id]/reviews` | Submit patient rating & review | Patient |

### 💳 Payments & AI Triage (`/api/v1/payments`, `/api/v1/ai`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `POST` | `/api/v1/payments/process` | Process appointment consultation fee payment | Patient / Admin |
| `POST` | `/api/v1/payments/refund` | Trigger refund on eligible cancellation | Admin |
| `POST` | `/api/v1/ai/symptom-checker` | AI clinical triage & department recommendation | Public |
| `GET` | `/api/v1/notifications` | Fetch user notification stream | Yes |
| `PATCH`| `/api/v1/notifications` | Mark notifications as read | Yes |

### 🏛️ Administration (`/api/v1/admin`)
| Method | Endpoint | Description | Auth Required |
|---|---|---|---|
| `GET` | `/api/v1/admin/overview` | Hospital operational metrics & active queue summary | Admin |
| `GET` | `/api/v1/admin/analytics` | Recharts financial, volume, and wait-time statistics | Admin |
| `GET` | `/api/v1/admin/branches` | List hospital branches & policy configurations | Admin |
| `POST` | `/api/v1/admin/branches` | Create new hospital branch | Admin |
| `PATCH`| `/api/v1/admin/branches/[id]` | Update branch booking rules & policies | Admin |
| `GET` | `/api/v1/admin/departments` | List clinical departments across branches | Admin |
| `POST` | `/api/v1/admin/departments` | Create new department | Admin |
| `GET` | `/api/v1/admin/doctors` | List all doctors with credential status | Admin |
| `POST` | `/api/v1/admin/doctors` | Onboard new doctor & provision credentials | Admin |
| `POST` | `/api/v1/admin/checkins` | Manual check-in and token lookup | Admin |
| `POST` | `/api/v1/admin/cleanup-tokens` | Purge expired refresh tokens and stale OTPs | Admin / Cron |

---

## 🔑 Environment Variables

Create a `.env` file in the root directory (refer to `.env.example`):

```env
# ─── Database ─────────────────────────────────────────────
# PostgreSQL connection string (supports Neon Serverless Postgres)
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mediflow?schema=public"

# ─── JWT Authentication (Dual Secret) ─────────────────────
# Cryptographically random secrets (min 32 chars). Generate with: openssl rand -base64 32
JWT_ACCESS_SECRET="your-secure-access-token-secret-at-least-32-characters"
JWT_REFRESH_SECRET="your-secure-refresh-token-secret-at-least-32-characters"

# ─── Application ──────────────────────────────────────────
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"

# ─── OTP Email Delivery ───────────────────────────────────
# If provided, OTPs are emailed via Resend. In development, OTPs are also logged to console.
RESEND_API_KEY=""

# ─── Automated Vercel Cron Security ───────────────────────
# Secret used by Vercel Cron to authenticate scheduled jobs. Generate with: openssl rand -hex 32
CRON_SECRET="your-cron-secret-key"

# ─── Admin Provisioning ───────────────────────────────────
# Default credentials used by: npm run create-admin
DEFAULT_ADMIN_EMAIL="admin@mediflow.test"
DEFAULT_ADMIN_PASSWORD="MediFlowAdmin123!"
DEFAULT_ADMIN_NAME="System Administrator"
```

---

## 🚀 Installation & Setup

### 1. Prerequisites
- **Node.js**: `v20.0.0` or higher
- **PostgreSQL**: Local instance or remote database (e.g., [Neon DB](https://neon.tech/))
- **npm** or **pnpm** / **yarn**

### 2. Clone and Install Dependencies
```bash
git clone https://github.com/your-username/mediflow.git
cd mediflow
npm install
```

### 3. Configure Environment Variables
```bash
cp .env.example .env
# Edit .env and supply your DATABASE_URL, JWT secrets, and admin config
```

### 4. Setup Database
Apply tracked migrations and seed initial hospital branches, departments, doctors, and demo users:
```bash
npm run db:setup
```
*(Runs `prisma migrate deploy` followed by `prisma/seed.ts`)*

### 5. Start Development Server
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) in your browser.

---

## 👤 Seeding & Admin Account Creation

### Default Test Credentials (from `npm run db:seed`)
| Role | Email | Password | Details |
|---|---|---|---|
| **Patient** | `patient@mediflow.test` | `MediFlow123!` | Pre-seeded patient with medical profile |
| **Doctor** | `doctor@mediflow.test` | `MediFlow123!` | Cardiologist with full schedule |
| **Admin** | `admin@mediflow.test` | `MediFlow123!` | Hospital front-desk administrator |

### Dedicated Admin CLI Provisioning
To create or reset a custom administrator directly in the database without an HTTP endpoint:

**Option A — Using `.env` variables:**
```bash
npm run create-admin
```

**Option B — Using CLI parameters:**
```bash
npm run create-admin -- --email="director@hospital.com" --name="Dr. Director" --phone="+919876543210"
```

---

## ⏰ Automated Cron Jobs

MediFlow includes scheduled automation configured for **Vercel Cron** (`vercel.json`):

| Path | Schedule | Purpose |
|---|---|---|
| `/api/v1/appointments/sweep-noshows` | Daily at 02:00 UTC (`0 2 * * *`) | Automatically marks unattended past appointments as `NO_SHOW` |
| `/api/v1/appointments/send-reminders` | Daily at 02:00 UTC (`0 2 * * *`) | Sends 24-hour advance SMS/email notifications for upcoming visits |
| `/api/v1/admin/cleanup-tokens` | Periodic maintenance | Purges expired refresh tokens and stale OTP verifications |

---

## 🧪 Testing & Quality Assurance

MediFlow includes automated test suites covering RBAC middleware, CSRF protections, appointment booking validation, consultation workflows, and queue state transitions:

```bash
# Run unit & integration test suites
npm test

# Run TypeScript type check
npx tsc --noEmit

# Run ESLint validation
npm run lint
```

---

## 📁 Project Structure

```
MediFlow/
├── __tests__/                     # Vitest test suites (RBAC, Auth, Queue, Appointments)
├── prisma/
│   ├── schema.prisma              # Complete PostgreSQL database schema
│   ├── seed.ts                    # Database seeder (hospital, doctors, patients, admin)
│   ├── create-admin.ts            # CLI tool for provisioning admin accounts
│   ├── MIGRATIONS.md              # Database migration guidelines
│   └── migrations/                # Tracked SQL migration history
├── public/                        # Static assets, icons, and SVG illustrations
├── src/
│   ├── proxy.ts                   # Next.js Proxy middleware (RBAC, CSRF, Route Guard)
│   ├── app/
│   │   ├── layout.tsx             # Root HTML layout and global styles
│   │   ├── page.tsx               # High-converting landing page with AI assistant
│   │   ├── providers.tsx          # TanStack Query, Theme, and Auth Providers
│   │   ├── globals.css            # Tailwind CSS v4 design tokens and utilities
│   │   ├── admin/                 # Administrator Portal
│   │   │   ├── overview/          # Operational overview
│   │   │   ├── queue/             # Multi-doctor queue manager
│   │   │   ├── checkin/           # Reception kiosk check-in
│   │   │   ├── appointments/      # Master appointment registry
│   │   │   ├── doctors/           # Doctor onboarding and roster
│   │   │   ├── branches/          # Hospital branches & policies
│   │   │   ├── departments/       # Department hierarchy
│   │   │   └── analytics/         # Recharts financial and operational charts
│   │   ├── doctor/                # Doctor Clinical Portal
│   │   │   ├── dashboard/         # Today's OPD queue & active patients
│   │   │   ├── consultation/      # Focused clinical workspace & Rx builder
│   │   │   ├── schedule/          # Working hours & blocked leaves
│   │   │   └── profile/           # Professional profile customization
│   │   ├── patient/               # Patient Portal
│   │   │   ├── dashboard/         # Live queue tracker & upcoming visits
│   │   │   ├── search/            # Doctor directory & filters
│   │   │   ├── doctor/[id]/       # Doctor profile & booking modal
│   │   │   ├── book/              # Multi-step appointment booking wizard
│   │   │   ├── appointments/      # Appointment history & self check-in
│   │   │   ├── queue/             # Live queue streaming view
│   │   │   ├── prescriptions/     # Digital prescription repository
│   │   │   ├── medical-history/   # Medical records & diagnosis history
│   │   │   └── profile/           # Patient health data & credentials
│   │   ├── auth/                  # Authentication Screens
│   │   │   ├── login/             # Email/Phone login
│   │   │   ├── register/          # Patient registration
│   │   │   ├── verify-otp/        # OTP verification screen
│   │   │   ├── forgot-password/   # Password reset request
│   │   │   └── reset-password/    # Password reset submission
│   │   └── api/v1/                # REST API Route Handlers
│   │       ├── admin/             # Administrative endpoints
│   │       ├── ai/                # AI Symptom Assistant
│   │       ├── appointments/      # Booking, check-in, reminders, no-shows
│   │       ├── auth/              # JWT login, register, OTP, tokens
│   │       ├── consultations/     # Clinical notes & prescriptions
│   │       ├── doctors/           # Schedule, availability, reviews
│   │       ├── notifications/     # In-app notifications
│   │       ├── patients/          # Patient profiles & prescription archives
│   │       ├── payments/          # Payment processing & refunds
│   │       └── queue/             # SSE queue streaming & call-next
│   ├── components/
│   │   ├── admin/                 # Admin navigation and widgets
│   │   ├── doctor/                # Consultation, Rx builder, patient history
│   │   ├── patient/               # Appointment cards, slot grid, queue card, AI modal
│   │   ├── shared/                # Magnetic button, tilt card, notification bell
│   │   └── ui/                    # Base UI components (buttons, modals, inputs, toasts)
│   ├── context/
│   │   └── AuthContext.tsx        # Global client authentication context
│   ├── hooks/
│   │   ├── useAuth.ts             # Authentication hook
│   │   └── useQueueSocket.ts      # Real-time SSE queue subscriber hook
│   └── lib/
│       ├── api/                   # CSRF verification and rate limiting
│       ├── auth/                  # JWT token sign/verify and session hashing
│       ├── db/                    # Prisma database client instance
│       ├── services/              # Domain business services (Appointment, Queue, etc.)
│       └── validation/            # Zod validation schemas
├── package.json                   # Project dependencies and npm scripts
├── tsconfig.json                  # TypeScript compiler configuration
├── vercel.json                    # Vercel deployment and cron job definitions
└── vitest.config.ts               # Vitest configuration
```

---

## 📄 License

This project is proprietary and intended for hospital management operations. All rights reserved.
