# MediFlow — Product Requirements Document (PRD)

**Product**: MediFlow — Smart Hospital Appointment & Patient Flow Management Platform
**Document type**: Engineering & Design PRD (build-ready)
**Version**: 1.0
**Positioning**: *A hospital patient-flow platform that reduces waiting-room congestion by combining intelligent appointment scheduling with real-time queue management.*

---

## 1. Product Vision

### 1.1 Product Overview
MediFlow is a multi-role, multi-tenant hospital operations platform that manages the complete patient journey — **discovery → booking → check-in → live queue → consultation → prescription → follow-up → analytics.** It serves three roles (Patient, Doctor, Admin/Receptionist) inside a single system built around one canonical data model, so a slot that a patient books, a doctor sees, and an admin audits is always the same row, updated in real time.

The system is architected as a hospital-branch-aware, department-scoped scheduling engine with a real-time queue layer (WebSockets) layered on top of a deterministic slot-generation algorithm, rather than a simple CRUD calendar.

### 1.2 Problem Statement
- Patients book a time slot but have no visibility into actual wait time, so they either arrive too early (wasted time in a waiting room) or too late (missed turn).
- Hospitals cannot see real-time operational load — how many patients are waiting, which doctors are behind schedule, where bottlenecks are forming.
- Doctors' schedules are static (fixed slot durations) and don't account for breaks, holidays, or emergency delays, causing cascading overbooking.
- Reception staff manually manage cancellations, no-shows, and rebooking with no systematic audit trail, causing lost revenue and scheduling conflicts.
- Prescriptions and medical history are paper-based or fragmented, making follow-ups and continuity of care difficult.

### 1.3 Target Audience
- **Primary**: Small-to-mid-size private hospitals and multi-specialty clinics (50–500 appointments/day) that currently rely on a manual register or a legacy, non-real-time booking tool.
- **Secondary**: Independent doctors/clinics with 1–3 branches who want a professional booking + queue experience without enterprise HIS pricing.
- **End users**: Patients (18–70, mobile-first), Doctors (need a fast, low-friction consultation UI they can use between patients), Admin/Receptionists (need a high-density operational dashboard).

### 1.4 Goals
1. Give patients a live, trustworthy estimate of when they'll actually be seen.
2. Give doctors a schedule that reflects real working constraints (breaks, holidays, buffer time) and a fast in-consultation workflow.
3. Give admins full operational visibility and control (staffing, utilization, cancellations, revenue).
4. Reduce effective waiting-room time and no-show rate through proactive notifications.
5. Produce a data model clean enough to support analytics and, later, insurance/billing integrations.

### 1.5 Success Metrics
| Metric | Target (post-launch, 90 days) |
|---|---|
| Avg. patient-perceived wait accuracy (estimated vs. actual) | within ±10 min |
| No-show rate | reduced by 20% vs. baseline (via reminders) |
| Doctor schedule utilization | 80%+ average across active doctors |
| Booking completion rate (started → confirmed) | >85% |
| Admin time spent on manual queue management | reduced by 50% |
| Real-time queue update latency | <2s from doctor action to patient screen |
| System uptime | 99.5%+ |

---

## 2. User Personas

### 2.1 Patient — "Meet, 34, works full-time"
- **Goals**: Book a doctor quickly, know real wait time, avoid sitting in a crowded waiting room, access prescriptions later without calling the clinic.
- **Pain points**: Opaque wait times, no way to reschedule without a phone call, losing paper prescriptions, forgetting follow-up dates.

### 2.2 Doctor — "Dr. Patel, Cardiologist"
- **Goals**: See only what's relevant *right now* (next patient, history), spend minimal time on scheduling admin, avoid overbooking, document consultations quickly.
- **Pain points**: Manually maintained paper schedules, no quick access to patient history, interruptions from front-desk questions about queue status.

### 2.3 Admin/Receptionist — "Priya, Front Desk Lead"
- **Goals**: Manage multiple doctors' schedules and holidays, resolve conflicts, monitor live queue and utilization, handle payments and reports.
- **Pain points**: No single source of truth across departments/branches, manual no-show tracking, disconnected payment records.

---

## 3. Functional Requirements

Each feature below is expanded into user stories, flow, edge cases, validation, and states. All screens must define: **loading state, empty state, error state** — these are not optional and are called out per feature.

### 3.1 Authentication & Roles
**User stories**
- As a patient, I can register with email/phone + password or OTP, so I can book appointments.
- As a doctor/admin, I log in with credentials provisioned by the hospital (no self-registration for these roles).
- As any user, my session persists securely and role-based UI renders automatically.

**Flow**: Register → verify (OTP/email link) → set profile → land on role-specific dashboard.

**Edge cases**
- Duplicate phone/email registration → merge suggestion, not silent overwrite.
- OTP expiry/resend abuse → rate-limited (max 5 requests / 15 min).
- Doctor account deactivated by admin mid-session → force logout on next request via session-validity check.

**Validation**: Email format, phone E.164 format, password ≥8 chars with complexity, OTP 6-digit numeric with 5-minute TTL.

**States**: Loading spinner on submit; empty state N/A; error states for network failure, invalid OTP, account locked (after 5 failed logins → 15 min lockout).

---

### 3.2 Doctor Search & Discovery (Patient)
**User stories**
- As a patient, I can search/filter doctors by specialty, hospital/branch, availability (today/this week), consultation fee range, and language, so I find a suitable doctor fast.
- As a patient, I can view a doctor's profile (bio, qualifications, experience, fee, ratings, next available slot) before booking.

**Flow**: Search screen → apply filters (debounced, 300ms) → results list (paginated/infinite scroll) → doctor profile → slot picker.

**Edge cases**
- No doctors match filters → show "No doctors found" with a "clear filters" CTA and suggested nearby specialties.
- Doctor has zero available slots in selected window → show profile but disable booking, display "Next available: <date>".
- Filter combination returns doctors across multiple branches → group results by branch.

**Validation**: Fee range min ≤ max; date filters cannot be in the past.

**States**: Skeleton cards while loading; empty state illustration + copy; retry button on fetch error.

---

### 3.3 Smart Appointment Scheduling Engine
This is the core differentiator and must be implemented as a **pure, testable function**, not ad-hoc UI logic.

**Algorithm** (per doctor, per date):
```
slots = generateSlots(workingHours, appointmentDuration)
slots = subtract(slots, breakTimes)
slots = subtract(slots, blockedSlots/holidays)
slots = subtract(slots, existingAppointments)
slots = markBufferIfBackToBack(slots, bufferMinutes)
return slots.map(slot => ({ time, status: AVAILABLE | BOOKED | BLOCKED }))
```

**User stories**
- As a patient, I only ever see truly available slots — never a slot I could book and have rejected.
- As a doctor, when I set working hours (e.g., 10:00–13:00) and duration (20 min), the system generates slots automatically (10:00, 10:20, … 12:40).
- As a doctor, I can block specific slots (emergency, personal) or entire days (holiday) and they immediately disappear from patient view.

**Edge cases**
- Doctor changes working hours *after* appointments exist outside the new hours → existing appointments are flagged for admin review, not auto-cancelled.
- Timezone: all times stored in UTC, rendered in hospital branch's local timezone; patient's device timezone is used only for display formatting, never for slot computation.
- Concurrent booking race (two patients hit "book" on the same slot within ms) → handled via DB-level unique constraint on `(doctorId, date, startTime)` plus optimistic UI rollback on 409 conflict.
- Daylight saving transitions → slot generation is timezone-aware using IANA tz database, not fixed UTC offsets.

**Validation**: `appointmentDuration` must divide evenly into working-hour window (else remainder slot dropped, not silently rounded); break times must be within working hours; blocked slots cannot overlap confirmed appointments (admin gets a conflict warning, must reassign first).

**States**: Slot grid shows loading skeleton per column; if a slot becomes unavailable between fetch and click, show inline toast "This slot was just booked — pick another" and refresh grid.

---

### 3.4 Appointment Booking, Reschedule, Cancellation
**User stories**
- As a patient, I book a slot, optionally pay, and receive confirmation with a token number.
- As a patient, I can reschedule (subject to a configurable cutoff, e.g., 2 hours before) or cancel.
- As a patient, I can request a follow-up appointment directly from a past visit or prescription.

**Flow**: Select slot → review (fee, doctor, branch) → payment (or "pay at clinic") → confirmation screen with token + calendar-add option.

**Edge cases**
- Reschedule within cutoff window → blocked with explanation and "Call clinic" fallback.
- Cancellation after payment → triggers refund workflow (`PAID → REFUND_PENDING → REFUNDED`).
- Double-booking prevention across reschedule (old slot released only after new slot confirmed — two-phase commit pattern).

**Validation**: Cannot book in the past; cannot book more than N days ahead (configurable, default 30); one active appointment per patient per doctor per day (soft warning, admin can override).

**States**: Booking button shows loading + disables on click (idempotent submit via client-generated request ID); success state = confirmation screen; failure = inline error with retry, slot re-validated automatically.

---

### 3.5 Live Patient Queue
**User stories**
- As a patient, I see my real-time position in queue, patients ahead, estimated wait, and doctor's current status ("consulting", "on break", "running late").
- As a doctor, when I click "Call Next Patient," every affected patient's queue view updates within 2 seconds.

**Flow**: Patient opens "View Queue" → subscribes to WebSocket channel `queue:{doctorId}:{date}` → receives live diffs → UI updates position/ETA without reload.

**Queue math**: `estimatedWait = patientsAhead * avgConsultationDuration(doctor, rolling 20-visit average) + currentConsultationRemaining`.

**Edge cases**
- WebSocket disconnect (patient's phone locks/loses signal) → auto-reconnect with exponential backoff; on reconnect, fetch authoritative queue snapshot via REST before resuming live diffs.
- Doctor calls a patient who is a no-show → queue auto-advances to next token after grace period, original token flagged NO_SHOW.
- Doctor takes an unscheduled break → status broadcast to all waiting patients ("Doctor is currently on a break"), ETA recalculated.

**Validation**: Queue position can never go negative or exceed total booked-today count; token numbers are branch+doctor+date scoped and monotonically increasing (e.g., `A-27`).

**States**: Initial load shows skeleton with "Connecting to live queue…"; disconnected state shows a subtle banner "Reconnecting…" without blocking the last known data; if queue data is unavailable entirely, fall back to static appointment time.

---

### 3.6 Check-in & No-Show Handling
**User stories**
- As reception, I check a patient in on arrival, moving them into the active queue.
- As the system, if a checked-in-eligible patient hasn't checked in by a grace period after their slot time, I mark them NO_SHOW automatically and notify admin.

**Flow**: `Appointment (CONFIRMED) → Check-in → Queue (WAITING) → Consultation → Completed` OR `Appointment → grace period elapsed, no check-in → NO_SHOW`.

**Edge cases**
- Patient checks in late but doctor hasn't reached their token yet → allowed, rejoin queue at correct token position (not pushed to the back).
- Patient checks in after being marked NO_SHOW → admin can manually reinstate into queue (audit-logged).

**Validation**: Grace period configurable per branch (default 15 min); check-in cannot happen more than 60 min before scheduled slot (prevents queue gaming).

**States**: Reception check-in list shows loading skeleton, empty state "No appointments scheduled for today," per-row action buttons disabled while a check-in request is in flight.

---

### 3.7 Doctor Dashboard & Consultation Workflow
**User stories**
- As a doctor, I see today's overview (appointments, waiting, completed, cancelled) at a glance.
- As a doctor, I click "Start Consultation" on the next token, view patient history, and complete the visit by adding diagnosis, prescription, notes, and follow-up.

**Flow**: Dashboard → "Next Patient" card → Start Consultation → Consultation screen (diagnosis, prescription builder, notes, follow-up date) → Complete Consultation → auto-advances queue, generates prescription PDF.

**Edge cases**
- Doctor accidentally starts wrong patient → "Undo/Switch Patient" available within 30 seconds, reverts queue state.
- Consultation left open >X minutes with no action → dashboard reminder, but does not auto-close (clinical safety: never auto-submit medical data).
- Prescription with zero medicines but a diagnosis → allowed (e.g., "rest advised, no medication").

**Validation**: Diagnosis field required to complete consultation; prescription medicine name required if a row is added (dose/duration optional but warned); follow-up date, if set, must be in the future.

**States**: Autosave draft of in-progress consultation notes every 10s (so a browser refresh doesn't lose data) — draft stored client-side + synced; explicit "Complete Consultation" is the only action that finalizes the record.

---

### 3.8 Admin/Receptionist Management
**User stories**
- As an admin, I manage doctors, departments, branches, fees, schedules, and holidays.
- As an admin, I view and resolve appointment conflicts, process payments/refunds, and generate reports.

**Functional scope**: full CRUD on Doctor, Department, Branch, Fee schedule; bulk holiday assignment; manual appointment creation/edit on behalf of a patient (phone bookings); queue override (reorder/reassign in exceptional cases, always audit-logged with reason).

**Edge cases**
- Deleting a doctor with future appointments → soft-delete only; must reassign or cancel appointments first (blocking action with a guided flow).
- Editing fees mid-day → does not retroactively change already-confirmed appointments' fees.

**Validation**: Cannot deactivate a branch with active doctors/appointments without explicit confirmation + cascade summary shown first.

**States**: All admin tables use server-side pagination, sorting, and filtering; bulk actions show progress indicator; destructive actions require a confirmation modal restating the impact.

---

### 3.9 Payments (Mock-first, gateway-ready)
**User stories**
- As a patient, I optionally pay online at booking or choose "pay at clinic."
- As an admin, I view payment status per appointment and process refunds for cancellations.

**Flow**: `Booking → Payment (PENDING) → Success/Fail → PAID/FAILED` ; cancellation of a PAID appointment → `REFUND_PENDING → REFUNDED`.

**Edge cases**: Payment succeeds but booking confirmation write fails (network) → reconciliation job matches payment intent ID to appointment and auto-heals; never silently lose a successful payment.

**Validation**: Amount must match the doctor's current fee at time of booking (snapshotted, not live-referenced, so later fee changes don't affect past invoices).

**States**: Payment step shows processing spinner with a timeout fallback (poll status after 10s if webhook hasn't arrived); failure state offers "retry payment" or "pay at clinic" alternative.

---

### 3.10 Digital Prescription (PDF)
**User stories**: As a doctor, completing a consultation generates a structured, downloadable/printable PDF prescription. As a patient, I can view/download all past prescriptions.

**Edge cases**: Doctor edits a completed consultation's prescription (correction) → new PDF version generated, previous version retained for audit (never overwritten silently).

**Validation**: PDF generation must not block consultation completion in the UI — generate asynchronously and notify when ready (with synchronous fallback for small payloads).

---

### 3.11 Notification System
**Events**: booking confirmed, 24h reminder, 1h reminder, doctor running late (>15 min behind), "you're next" queue alert, cancellation/reschedule confirmation.

**Channels**: Email (Phase 1), Push/WebSocket in-app (Phase 2), SMS/WhatsApp (Phase 2+).

**Edge cases**: Notification for a cancelled appointment already queued for send → cancel the queued job (idempotent notification worker with cancellable job IDs).

**Validation**: Respect user notification preferences (opt-out of non-critical categories, but critical ones like "doctor running late" cannot be fully disabled if an appointment is active today).

---

### 3.12 Optional AI Appointment Assistant
**User story**: As a patient, I describe a symptom in plain language and get a suggested department + relevant available doctors — never a diagnosis.

**Guardrails (hard requirement)**: The assistant must map symptoms → department only, using a constrained classifier/prompt with an explicit disclaimer ("This is not a medical diagnosis"). It must never output medication suggestions, severity assessments, or diagnostic language. All AI suggestions are logged for review.

**Edge cases**: Ambiguous or emergency-sounding input ("chest pain," "can't breathe") → immediately show an emergency banner directing to emergency services, bypass normal booking flow.

---

### 3.13 Hospital Analytics
**Metrics**: daily appointments, peak hours, cancellation rate, no-show rate, doctor utilization, department performance, average wait time, average consultation time — all filterable by branch/department/doctor/date range.

**Edge cases**: Sparse-data periods (new branch, <7 days of data) → show "insufficient data" instead of misleading charts.

---

## 4. Information Architecture

```
MediFlow
├── /auth
│   ├── /login
│   ├── /register
│   └── /verify-otp
├── /patient
│   ├── /dashboard
│   ├── /search               (doctor search + filters)
│   ├── /doctor/[id]           (profile + slot picker)
│   ├── /book/[doctorId]       (booking flow)
│   ├── /appointments          (upcoming + past, tabs)
│   ├── /appointments/[id]     (detail + live queue)
│   ├── /prescriptions
│   ├── /prescriptions/[id]
│   ├── /medical-history
│   └── /profile
├── /doctor
│   ├── /dashboard
│   ├── /schedule              (availability, breaks, holidays)
│   ├── /consultation/[tokenId]
│   ├── /patients/[id]         (history view)
│   └── /profile
├── /admin
│   ├── /overview              (hospital-wide dashboard)
│   ├── /doctors
│   ├── /departments
│   ├── /branches
│   ├── /appointments          (manage/override)
│   ├── /queue                 (live monitor, all doctors)
│   ├── /payments
│   ├── /reports
│   └── /settings
└── /shared
    ├── /notifications
    └── /support
```

**Navigation model**: Role-scoped sidebar (Doctor/Admin, desktop-first) and bottom tab bar (Patient, mobile-first). Global top bar: search (patient), branch selector (admin), notification bell (all roles).

---

## 5. UI/UX Specification

**Design language**: Clean, high-contrast, generous whitespace, restrained color palette (a single medical-trust primary — deep teal/blue — plus semantic colors for status). Typography: one geometric sans for UI (Inter/Geist-style), tabular numerals for schedules/tokens. Motion is purposeful and short (150–250ms), never decorative. This should feel closer to Linear/Stripe dashboards than a typical hospital portal.

### 5.1 Patient Dashboard
- **Hero card**: greeting, next upcoming appointment (doctor, specialty, date/time, token, live "View Queue" button with a pulsing live-dot indicator).
- **Quick actions**: 4-tile grid (Book Appointment, My Appointments, Prescriptions, Medical History) — icon + label, tap target ≥44px.
- **Upcoming appointments list**: card per appointment — doctor avatar, name, specialty, date/time, token, status pill (Confirmed/Waiting/Completed/Cancelled color-coded), inline Reschedule/Cancel buttons (secondary/ghost style, confirmation modal on cancel).
- **Empty state**: illustration + "No upcoming appointments" + primary CTA "Find a Doctor."
- **Loading**: skeleton cards matching final layout (no spinner-only loading).

### 5.2 Doctor Search
- **Search bar**: debounced text input (name/specialty), sticky on scroll.
- **Filter bar**: horizontally scrollable chips (Specialty, Branch, Availability, Fee range, Language) opening bottom-sheet/drawer filters on mobile, popover on desktop.
- **Results**: card grid — doctor photo, name, specialty, rating, fee, next available slot chip, "Book" CTA.
- **Map** (optional, if multi-branch): toggle list/map view for branch location.

### 5.3 Live Queue Screen
- **Primary card**: doctor name/specialty, appointment time, large queue position number (`#4`), patients-ahead count, estimated wait (large, prominent), status line ("Doctor is currently consulting") with an animated live-dot.
- **Micro-interaction**: queue number animates (count-down transition) when it updates via WebSocket rather than hard-refreshing.
- **Disconnected banner**: subtle amber bar "Reconnecting to live updates…" — never blocks the last known state.

### 5.4 Doctor Dashboard
- **Overview strip**: 4 stat cards (Today's Appointments, Waiting, Completed, Cancelled) — large numeral, label, small trend indicator.
- **Next Patient card**: token, name, age, waiting duration, "Start Consultation" primary button (full-width on mobile).
- **Schedule list**: today's timeline, current token highlighted, past tokens dimmed/strikethrough-status.

### 5.5 Consultation Screen
- Two-column desktop layout: left = patient history (collapsible past visits/prescriptions), right = active consultation form (Diagnosis textarea, Prescription table builder with add/remove row, Notes textarea, Follow-up date picker).
- Prescription table: inline-editable rows (Medicine, Dose e.g. "1-0-1", Duration), add-row button, drag-to-reorder optional.
- Sticky footer action bar: "Save Draft" (auto, silent) / "Complete Consultation" (primary, confirmation modal summarizing what will be sent to the patient).

### 5.6 Admin Overview
- KPI row (Today's Appointments, Completed, Waiting, Cancelled, No-show) as compact stat cards.
- Department breakdown: horizontal bar list with counts.
- Doctor utilization: horizontal progress bars with percentage labels, color-coded by threshold (green ≥80%, amber 50–79%, red <50%).
- Trend chart: line/area chart, daily appointments over selectable range (7/30/90 days), using a charting library (recharts) with tooltip on hover, responsive down to mobile (simplified sparkline).

### 5.7 Cross-cutting UI rules
- **Tables** (admin): sticky header, sortable columns, server-side pagination, row-hover actions, skeleton-row loading, empty-state row spanning full width.
- **Modals/Drawers**: modals for confirmations and short forms; drawers (slide-in) for filters and multi-step flows on mobile.
- **Dark mode**: full token-based theme (CSS variables), not per-component overrides; respects system preference with manual override toggle.
- **Mobile responsiveness**: mobile-first for Patient app; desktop-first (with responsive fallback) for Doctor/Admin, since those are typically used on tablets/desktops in a clinical setting.
- **Micro-interactions**: button press scale (0.98), toast notifications slide-in/out, skeleton shimmer, status pill color transitions, queue number count animation.

---

## 6. Technical Architecture

### 6.1 High-Level Architecture
```
┌────────────┐      ┌─────────────────────┐      ┌───────────────┐
│  Next.js    │◄────►│  API Layer            │◄────►│ PostgreSQL     │
│  (App Router)│      │  (Route Handlers /    │      │ (Prisma ORM)   │
│  Patient/Doc │      │   Server Actions)      │      └───────────────┘
│  /Admin UIs  │      │                        │
└─────┬───────┘      │  ┌──────────────────┐  │      ┌───────────────┐
      │              │  │ Queue Service     │──┼─────►│ Redis (pub/sub,│
      │  WebSocket    │  │ Notification Svc  │  │      │ rate limiting, │
      └──────────────►│  │ Payment Svc (mock)│  │      │ session cache) │
                       │  │ Scheduling Engine │  │      └───────────────┘
                       │  └──────────────────┘  │
                       └─────────────────────────┘
```

### 6.2 Frontend Architecture
- **Framework**: Next.js 15 (App Router), TypeScript strict mode.
- **Styling**: Tailwind CSS + shadcn/ui component primitives, design tokens via CSS variables (theming/dark mode).
- **Forms**: React Hook Form + Zod schemas shared between client validation and server-side validation (single source of truth per entity).
- **State management**:
  - Server state: TanStack Query (React Query) for all API data — caching, retries, background refetch.
  - Real-time state: dedicated `useQueueSocket` hook layering WebSocket events on top of the React Query cache (optimistic merge, not replace).
  - Local/UI state: React `useState`/`useReducer`, no global client store needed beyond auth/session context.
- **Routing**: role-based route groups `(patient)`, `(doctor)`, `(admin)` with middleware-enforced access control.

### 6.3 Backend Architecture
- **API**: Next.js Route Handlers for public/REST-shaped endpoints; Server Actions for internal form mutations where colocated with UI.
- **ORM**: Prisma over PostgreSQL.
- **Service layer**: business logic isolated from route handlers — `SchedulingService`, `QueueService`, `ConsultationService`, `NotificationService`, `PaymentService` — each a pure/testable class or module, route handlers only orchestrate.
- **Real-time**: Socket.IO (or native WebSocket) server co-located or as a separate small Node service, backed by Redis pub/sub so it can scale horizontally.
- **Background jobs**: queue-backed worker (BullMQ + Redis) for: notification sending, no-show grace-period sweeps, PDF generation, payment reconciliation.

### 6.4 Folder Structure
```
/app
  /(auth)/login, /register, /verify-otp
  /(patient)/dashboard, /search, /doctor/[id], /book/[doctorId], /appointments, /prescriptions, /medical-history, /profile
  /(doctor)/dashboard, /schedule, /consultation/[tokenId], /patients/[id]
  /(admin)/overview, /doctors, /departments, /branches, /appointments, /queue, /payments, /reports, /settings
  /api
    /auth/*
    /doctors/*
    /appointments/*
    /queue/*
    /consultations/*
    /prescriptions/*
    /payments/*
    /notifications/*
    /analytics/*
/components
  /ui            (shadcn primitives)
  /patient       (feature components: DoctorCard, QueueCard, AppointmentCard...)
  /doctor        (NextPatientCard, PrescriptionBuilder...)
  /admin         (StatCard, UtilizationBar, TrendChart...)
  /shared        (StatusPill, EmptyState, Skeletons, Modal, Drawer)
/lib
  /services      (SchedulingService, QueueService, NotificationService, PaymentService, ConsultationService)
  /db            (prisma client singleton)
  /validation    (zod schemas per entity)
  /auth          (session, RBAC helpers)
  /socket        (server + client socket setup)
  /utils         (date/timezone helpers, formatters)
/hooks
  useQueueSocket.ts
  useAvailableSlots.ts
  useDebounce.ts
  useInfiniteDoctors.ts
  useAuth.ts
/prisma
  schema.prisma
  /migrations
```

### 6.5 Reusable Hooks (selection)
- `useAvailableSlots(doctorId, date)` — fetches + memoizes slot grid, revalidates on booking events.
- `useQueueSocket(doctorId, date)` — subscribes/unsubscribes to queue channel, merges live diffs into cache.
- `useDebounce(value, delay)` — generic debounce for search/filter inputs.
- `useInfiniteDoctors(filters)` — cursor-based infinite scroll for doctor search.
- `useAutosaveDraft(key, data)` — periodic local + server draft sync for consultation notes.

---

## 7. API Design

All endpoints are versioned under `/api/v1`. Standard envelope: `{ data, error, meta }`. Auth via JWT in httpOnly cookie; role enforced via middleware.

| Endpoint | Purpose | Method |
|---|---|---|
| `/api/v1/auth/register` | Patient self-registration | POST |
| `/api/v1/auth/login` | Login (all roles) | POST |
| `/api/v1/auth/otp/verify` | OTP verification | POST |
| `/api/v1/doctors` | Search/filter doctors (cursor pagination) | GET |
| `/api/v1/doctors/:id` | Doctor profile | GET |
| `/api/v1/doctors/:id/availability` | Computed slot grid for a date | GET |
| `/api/v1/doctors/:id/schedule` | Set working hours/breaks (doctor/admin) | PUT |
| `/api/v1/doctors/:id/blocked-slots` | Block slots/holidays | POST |
| `/api/v1/appointments` | Create booking | POST |
| `/api/v1/appointments/:id` | Get/update (reschedule/cancel) | GET/PATCH |
| `/api/v1/appointments/:id/checkin` | Check-in | POST |
| `/api/v1/queue/:doctorId` | Current queue snapshot | GET |
| `/api/v1/queue/:doctorId/call-next` | Doctor calls next token | POST |
| `/api/v1/consultations/:tokenId` | Start/complete consultation | POST/PATCH |
| `/api/v1/prescriptions/:id` | Fetch prescription (+PDF link) | GET |
| `/api/v1/payments/intent` | Create payment intent (mock/gateway) | POST |
| `/api/v1/payments/:id/refund` | Trigger refund | POST |
| `/api/v1/admin/doctors` \| `/departments` \| `/branches` | Admin CRUD | GET/POST/PUT/DELETE |
| `/api/v1/analytics/overview` | Hospital KPIs | GET |
| `/api/v1/analytics/trends` | Time-series metrics | GET |
| `/api/v1/ai/assistant` | Symptom → department suggestion | POST |
| WS `ws://.../queue` | Real-time queue channel (namespaced per doctor+date) | — |

**Per-endpoint pattern (example: `POST /appointments`)**
- **Request flow**: validate payload (Zod) → `SchedulingService.validateSlotAvailable()` → DB transaction (create appointment + decrement slot availability atomically) → enqueue confirmation notification job → return created resource.
- **Response**: `201 { data: Appointment, meta: { tokenNumber } }`.
- **Error handling**: `409 SLOT_ALREADY_BOOKED`, `422 VALIDATION_ERROR` (field-level detail), `403 FORBIDDEN` (role mismatch), `500` generic with correlation ID logged.
- **Caching**: doctor availability responses cached 30s (Redis) with cache-bust on any write to that doctor/date; queue snapshot never cached (always live).
- **Retry strategy**: client retries idempotent GETs automatically (React Query default); mutating POSTs use a client-generated idempotency key so a retried "book" request cannot double-book.

---

## 8. Data Models

```prisma
model User {
  id            String   @id @default(cuid())
  email         String?  @unique
  phone         String?  @unique
  passwordHash  String?
  role          Role
  createdAt     DateTime @default(now())
  patient       Patient?
  doctor        Doctor?
  admin         Admin?
}

enum Role { PATIENT DOCTOR ADMIN }

model Patient {
  id            String   @id @default(cuid())
  userId        String   @unique
  user          User     @relation(fields: [userId], references: [id])
  name          String
  age           Int?
  gender        String?
  appointments  Appointment[]
  medicalRecords MedicalRecord[]
}

model Hospital {
  id       String    @id @default(cuid())
  name     String
  branches Branch[]
}

model Branch {
  id           String       @id @default(cuid())
  hospitalId   String
  hospital     Hospital     @relation(fields: [hospitalId], references: [id])
  name         String
  timezone     String
  departments  Department[]
  appointments Appointment[]
}

model Department {
  id       String   @id @default(cuid())
  branchId String
  branch   Branch   @relation(fields: [branchId], references: [id])
  name     String
  doctors  Doctor[]
}

model Doctor {
  id               String   @id @default(cuid())
  userId           String   @unique
  user             User     @relation(fields: [userId], references: [id])
  departmentId     String
  department       Department @relation(fields: [departmentId], references: [id])
  name             String
  specialty        String
  fee              Decimal
  language         String[]
  appointmentDurationMin Int  @default(20)
  availability     DoctorAvailability[]
  appointments     Appointment[]
}

model DoctorAvailability {
  id         String   @id @default(cuid())
  doctorId   String
  doctor     Doctor   @relation(fields: [doctorId], references: [id])
  dayOfWeek  Int
  startTime  String   // "10:00"
  endTime    String   // "13:00"
  breakStart String?
  breakEnd   String?
}

model BlockedSlot {
  id        String   @id @default(cuid())
  doctorId  String
  date      DateTime
  startTime String?
  endTime   String?
  reason    String?
}

model Appointment {
  id           String   @id @default(cuid())
  patientId    String
  patient      Patient  @relation(fields: [patientId], references: [id])
  doctorId     String
  doctor       Doctor   @relation(fields: [doctorId], references: [id])
  branchId     String
  branch       Branch   @relation(fields: [branchId], references: [id])
  date         DateTime
  startTime    String
  tokenNumber  String
  status       AppointmentStatus @default(CONFIRMED)
  feeSnapshot  Decimal
  createdAt    DateTime @default(now())
  queueToken   QueueToken?
  consultation Consultation?
  payment      Payment?

  @@unique([doctorId, date, startTime])
}

enum AppointmentStatus { CONFIRMED CHECKED_IN WAITING IN_CONSULTATION COMPLETED CANCELLED NO_SHOW }

model QueueToken {
  id            String   @id @default(cuid())
  appointmentId String   @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  position      Int
  calledAt      DateTime?
  status        QueueStatus @default(WAITING)
}

enum QueueStatus { WAITING IN_PROGRESS DONE NO_SHOW }

model Consultation {
  id            String   @id @default(cuid())
  appointmentId String   @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  diagnosis     String
  notes         String?
  followUpDate  DateTime?
  startedAt     DateTime
  completedAt   DateTime?
  prescription  Prescription?
}

model Prescription {
  id             String   @id @default(cuid())
  consultationId String   @unique
  consultation   Consultation @relation(fields: [consultationId], references: [id])
  items          PrescriptionItem[]
  pdfUrl         String?
  version        Int      @default(1)
}

model PrescriptionItem {
  id             String   @id @default(cuid())
  prescriptionId String
  prescription   Prescription @relation(fields: [prescriptionId], references: [id])
  medicine       String
  dose           String?
  duration       String?
}

model MedicalRecord {
  id         String   @id @default(cuid())
  patientId  String
  patient    Patient  @relation(fields: [patientId], references: [id])
  type       String
  fileUrl    String?
  createdAt  DateTime @default(now())
}

model Payment {
  id            String   @id @default(cuid())
  appointmentId String   @unique
  appointment   Appointment @relation(fields: [appointmentId], references: [id])
  amount        Decimal
  status        PaymentStatus @default(PENDING)
  provider      String?
  createdAt     DateTime @default(now())
}

enum PaymentStatus { PENDING PAID FAILED REFUND_PENDING REFUNDED }

model Notification {
  id         String   @id @default(cuid())
  userId     String
  type       String
  payload    Json
  sentAt     DateTime?
  readAt     DateTime?
  createdAt  DateTime @default(now())
}

model Review {
  id        String   @id @default(cuid())
  doctorId  String
  patientId String
  rating    Int
  comment   String?
  createdAt DateTime @default(now())
}

model AuditLog {
  id        String   @id @default(cuid())
  actorId   String
  action    String
  entity    String
  entityId  String
  metadata  Json?
  createdAt DateTime @default(now())
}
```

---

## 9. Component Inventory

**Shared**: `Button`, `Input`, `Select`, `DatePicker`, `Modal`, `Drawer`, `Toast`, `StatusPill`, `Skeleton`, `EmptyState`, `Avatar`, `Badge`, `Tabs`, `Table` (with sort/paginate), `StatCard`, `Chart` (line/bar wrapper), `ConfirmDialog`.

**Patient**: `DoctorCard`, `DoctorFilterBar`, `SlotGrid`, `AppointmentCard`, `QueueLiveCard`, `PrescriptionCard`, `MedicalHistoryTimeline`, `QuickActionTile`.

**Doctor**: `TodayOverviewStrip`, `NextPatientCard`, `ScheduleTimeline`, `AvailabilityEditor`, `BreakTimeEditor`, `HolidayPicker`, `PrescriptionBuilder`, `ConsultationForm`, `PatientHistoryPanel`.

**Admin**: `KPIStatCard`, `DepartmentBreakdownList`, `DoctorUtilizationBar`, `TrendChart`, `DoctorManagementTable`, `BranchSelector`, `ConflictResolutionModal`, `PaymentsTable`, `ReportExportButton`.

---

## 10. Performance Strategy
- **Code splitting**: route-level automatic (Next.js App Router); heavy components (PDF viewer, charts, AI assistant modal) dynamically imported (`next/dynamic`, `ssr: false` where appropriate).
- **Lazy loading**: below-the-fold admin analytics charts and doctor profile "reviews" tab loaded on demand.
- **Memoization**: `useMemo`/`React.memo` for slot grid rendering (avoid recompute on unrelated state changes), utilization bar calculations.
- **Image optimization**: `next/image` for doctor photos with responsive sizes and blur placeholders.
- **API caching**: React Query stale-while-revalidate for doctor lists/profiles; Redis cache for computed availability (30s TTL, invalidated on write).
- **Virtualization**: admin tables (appointments, payments) use row virtualization beyond ~200 rows.
- **Debouncing**: search input (300ms), filter changes (250ms).
- **Infinite scrolling**: doctor search results, patient appointment history (cursor-based).

---

## 11. Security
- **Authentication**: JWT in httpOnly, secure, sameSite cookies; short-lived access token + refresh token rotation.
- **Authorization**: RBAC middleware on every route/server action; row-level checks (a patient can only fetch *their own* appointments/prescriptions — enforced at the service layer, not just UI).
- **Input validation**: Zod schemas on every mutation, shared between client and server; server never trusts client-side validation alone.
- **API security**: CSRF protection on cookie-based mutations, strict CORS allowlist, all endpoints behind auth except public doctor search.
- **Environment variables**: DB URL, JWT secrets, payment provider keys, SMTP creds — never committed, validated at boot (fail fast if missing).
- **Rate limiting**: Redis-backed, per-IP and per-user (login/OTP endpoints stricter: 5/15min; general API: 100/min).
- **Audit logs**: every admin override, cancellation, refund, and consultation edit written to `AuditLog` with actor, action, entity, timestamp.
- **Data handling**: use fictional seed data only in dev/demo; medical record file access via short-lived signed URLs, not public storage paths.

---

## 12. Accessibility (WCAG 2.1 AA)
- Color contrast ≥4.5:1 for body text, ≥3:1 for large text/icons; status pills paired with text/icon, never color-only.
- Full keyboard navigation for booking flow, consultation form, and admin tables (focus rings visible, logical tab order).
- All interactive elements have accessible names (`aria-label` where icon-only, e.g., queue live-dot).
- Live queue updates announced via `aria-live="polite"` region for screen readers.
- Forms: labels programmatically associated, error messages linked via `aria-describedby`.
- Motion respects `prefers-reduced-motion` (disable count-up animations, shimmer reduced to static skeleton).
- Minimum tap target 44×44px on mobile patient UI.

---

## 13. Development Roadmap

### Phase 1 — MVP (Weeks 1–4)
Auth (all roles) → Doctor search/profile → Scheduling engine (slot generation) → Booking (no payment, "pay at clinic" only) → Doctor dashboard (today's list, mark complete) → Basic appointment management (reschedule/cancel).

### Phase 2 (Weeks 5–8)
Live queue (WebSocket) → Check-in flow + no-show automation → Notifications (email) → Digital prescription (PDF) → Mock payments.

### Phase 3 (Weeks 9–12)
Admin analytics dashboard (utilization, trends) → AI appointment assistant (guardrailed) → Multi-branch support → Doctor availability engine refinements (buffers, DST-safe) → Audit logs → Follow-up automation.

### Phase 4 (Post-MVP hardening)
Real payment gateway integration → SMS/WhatsApp notifications → Performance/load testing on queue WebSocket layer → Accessibility audit pass → Security review (RBAC edge cases, rate-limit tuning).

---

*End of PRD. This document is intended to be sufficient for a team to begin sprint planning and implementation without further clarification meetings; open questions should be resolved via the assumptions stated inline (e.g., default grace periods, cutoff windows) which are all configurable per-branch settings, not hardcoded values.*
