# MediFlow
A comprehensive hospital management and appointment system built with Next.js and Prisma.

## Overview
MediFlow is a web application designed to streamline hospital operations, managing everything from patient appointments to doctor availability and hospital queues. It supports distinct roles for Patients, Doctors, and Admins, providing specialized interfaces and API endpoints for each. 

## Key Features
- **Role-Based Access Control**: Dedicated portals for Patients, Doctors, and Admins.
- **Appointment Management**: Book, reschedule, and track appointments with robust status handling (Confirmed, Checked-in, Waiting, etc.).
- **Queue Management**: Real-time queue tracking for patient visits.
- **Consultations & Prescriptions**: Record diagnoses, manage medical records, and issue structured prescriptions.
- **Doctor Availability Management**: Configurable working hours, blocked slots, and department affiliations.
- **Authentication**: Secure JWT-based authentication with refresh tokens and role validation.

## Tech Stack
- **Framework**: Next.js (16.3.0) with App Router
- **Language**: TypeScript (v5+) / Node (v20+)
- **Database ORM**: Prisma (7.9.1)
- **Database**: PostgreSQL (pg 8.23.0)
- **Styling**: Tailwind CSS (v4)
- **Data Fetching/State**: @tanstack/react-query (v5.101.4)
- **Form Management**: react-hook-form with Zod validation
- **Authentication**: bcryptjs, jose (for JWTs)
- **Icons & UI Utilities**: lucide-react, clsx, tailwind-merge

## Project Structure
- `src/app/` - Next.js App Router containing pages and layouts for roles (`admin/`, `doctor/`, `patient/`, `auth/`).
- `src/app/api/v1/` - REST API routes for core business logic.
- `src/components/` - React components categorized by domain (`admin/`, `doctor/`, `patient/`, `shared/`, `ui/`).
- `src/context/` - React context providers (e.g., authentication state).
- `src/hooks/` - Custom React hooks.
- `src/lib/` - Utility functions, shared constants, and external integrations.
- `prisma/` - Database schema (`schema.prisma`) and seed scripts (`seed.ts`).

## Prerequisites
- Node.js (v20 or higher)
- PostgreSQL database running locally or remotely

## Installation
```bash
# Clone the repository and install dependencies
npm install
```

## Configuration
Create a `.env` file in the root directory based on `.env.example`:

```env
# Database connection string
DATABASE_URL="postgresql://postgres:postgres@localhost:5432/mediflow?schema=public"

# JWT configuration (generate secret with: openssl rand -base64 32)
JWT_SECRET="your-secret-key"
JWT_ACCESS_EXPIRES="15m"
JWT_REFRESH_EXPIRES="7d"

# App
NEXT_PUBLIC_APP_URL="http://localhost:3000"
NODE_ENV="development"
```

## Database Setup
Run the following commands to configure your database and populate it with initial seed data:
```bash
npm run db:setup
```
*(This command runs `prisma db push` followed by `prisma/seed.ts`)*

## Usage

**Development Mode:**
```bash
npm run dev
```
Open [http://localhost:3000](http://localhost:3000) with your browser.

**Production Build:**
```bash
npm run build
npm start
```

## Running Tests
TODO: confirm (No test script is currently defined in `package.json`).

## API Reference
The application exposes the following main API namespaces under `/api/v1/`:
- `/api/v1/admin` - Administrative actions (managing users, hospital branches, etc.)
- `/api/v1/appointments` - Booking and managing appointments
- `/api/v1/auth` - Login, registration, token refresh
- `/api/v1/consultations` - Doctor notes, diagnoses, and prescriptions
- `/api/v1/doctors` - Doctor profiles, availability, and scheduling
- `/api/v1/patients` - Patient profiles, medical history, and reviews
- `/api/v1/queue` - Live token and queue management

## Deployment
TODO: confirm target environment and procedures. The app is standard Next.js, compatible with Vercel, Docker, or any Node.js hosting.

## Contributing
Please follow the standard GitHub Flow: create a feature branch, commit your changes, and open a Pull Request. Ensure that `npm run lint` passes before submitting.

## License
Not specified.
