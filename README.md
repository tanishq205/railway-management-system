# IR-RailOps: Railway Management System
## Full-Stack College DBMS Project (Supabase PostgreSQL, Node.js Express, React + Vite)

A complete, enterprise-grade Railway Management and Seat Reservation System designed for a College Database Management System (DBMS) course project and viva examination.

---

## 1. Architectural Highlights & Features

- **Supabase Cloud PostgreSQL 15+**: Cloud-hosted PostgreSQL with strict ACID compliance, MVCC (Multi-Version Concurrency Control), and PL/pgSQL stored functions.
- **13 Normalized Relational Tables**: Full schema design meeting 1NF, 2NF, and 3NF principles with strict foreign key constraints (`ON DELETE CASCADE` / `RESTRICT`).
- **Pessimistic Concurrency Control**: Uses PostgreSQL row-level locking (`SELECT ... FOR UPDATE`) during seat reservation to prevent race conditions and double-booking.
- **ACID Transaction Management**: Atomic execution of ticket header creation, passenger detail creation, seat allocation updates, and simulated payment processing with automatic rollback on payment failure.
- **Automated Waitlist Promotion**: When a confirmed ticket is cancelled, the system automatically locates the earliest waitlisted passenger on the same train run, promotes them to `CONFIRMED`, assigns the vacated seat, and records the event in the audit trail.
- **Physical vs. Operational Separation**:
  - `Train` represents physical rolling stock metadata; `Train_Run` represents its operational instance on a specific date.
  - `Seat` represents physical coach hardware with maintenance condition (`OPERATIONAL` vs `UNDER_REPAIR`); `Seat_Allocation` isolates per-date inventory availability (`AVAILABLE`, `BOOKED`, `BLOCKED`).
- **Database Views**: Predefined views (`vw_booking_details`, `vw_train_occupancy`, `vw_revenue_summary`) for instant PNR lookup, reporting, and dashboard aggregation.
- **Database Triggers (PL/pgSQL)**: PostgreSQL triggers (`trg_seat_allocation_audit`, `trg_payment_audit`) automatically logging operational changes into the `Audit_Log` table.
- **Interactive DBMS Viva Guide**: Built-in visual console demonstrating 15 categories of relational SQL queries (JOINs, Nested Subqueries, GROUP BY/HAVING, Aggregate Metrics, Transactions, Views, and Triggers).

---

## 2. Project Directory Structure

```
railway/
├── .env.example                     # Environment configuration template
├── package.json                     # Root orchestrator scripts
├── README.md                        # Complete project manual & setup guide
│
├── database/                        # Database Architecture & Viva Documentation
│   ├── schema.sql                   # 13 tables, keys, indexes, views & triggers (PostgreSQL)
│   ├── seed.sql                     # Realistic Indian Railway demo dataset (PostgreSQL)
│   ├── demo_queries.sql             # 15 executable SQL queries for DBMS evaluation
│   ├── ER_DIAGRAM.md                # Mermaid Entity-Relationship diagram
│   ├── DFD.md                       # Mermaid Data Flow Diagrams (Level 0, 1 & Stores)
│   └── DBMS_VIVA.md                 # Complete examiner viva technical defense guide
│
├── server/                          # Backend Node.js + Express API
│   ├── .env                         # Server environment configuration (DATABASE_URL)
│   ├── package.json                 # Backend dependencies (pg, bcryptjs, jwt, cors)
│   ├── server.js                    # Express app entrypoint & centralized error handling
│   ├── db.js                        # PostgreSQL connection pool with SSL & diagnostics
│   ├── middleware/auth.js           # JWT validation & Admin role authorization guard
│   ├── routes/                      # Modular RESTful controllers
│   │   ├── auth.routes.js           # Registration, login, profile inspection
│   │   ├── station.routes.js        # Station master CRUD with duplicate code protection
│   │   ├── train.routes.js          # Train management & origin-destination route search
│   │   ├── route.routes.js          # Ordered stop sequence timetable management
│   │   ├── coach.routes.js          # Coaches & physical seat repair synchronization
│   │   ├── run.routes.js            # Train run scheduling & delay management
│   │   ├── booking.routes.js        # Transactional booking & waitlist promotion
│   │   ├── payment.routes.js        # Payment settlement & retry logic
│   │   ├── admin.routes.js          # Real-time SQL aggregate metrics & reporting
│   │   └── audit.routes.js          # System audit trail viewer
│   └── scripts/init_db.js           # One-click schema execution & seed runner for Supabase
│
└── client/                          # Frontend React + Vite SPA
    ├── index.html                   # HTML entry point with Inter & Outfit typography
    ├── package.json                 # Client dependencies (react, react-router-dom, lucide-react)
    ├── vite.config.js               # Vite config with backend proxy on /api
    └── src/
        ├── main.jsx                 # React root mounting
        ├── App.jsx                  # React Router routes and master shell layout
        ├── index.css                # Plain CSS design system (Navy & Railway Red palette)
        ├── context/AuthContext.jsx  # Authentication & session token management
        ├── components/              # Reusable UI components
        │   ├── Navbar.jsx           # Top navigation bar with live DB health indicator
        │   ├── AdminSidebar.jsx     # Admin operations control sidebar
        │   ├── AdminLayout.jsx      # Admin role route protection wrapper
        │   └── BookingModal.jsx     # Dynamic multi-passenger booking modal
        └── pages/                   # Application pages
            ├── HomeSearch.jsx       # Train search by origin, destination & date
            ├── PNRStatus.jsx        # PNR ticket lookup & passenger cancellation
            ├── MyBookings.jsx       # Personal booking history
            ├── MyPayments.jsx       # Payment transaction history & retry
            ├── Login.jsx            # Sign-in page with 1-click demo autofill
            ├── Register.jsx         # Passenger registration form
            └── admin/               # Admin Portal
                ├── AdminDashboard.jsx   # Live operational metrics & occupancy
                ├── StationManager.jsx   # Station master CRUD
                ├── TrainManager.jsx     # Train fleet & route stop editor
                ├── CoachSeatManager.jsx # Rolling stock & seat maintenance toggle
                ├── RunManager.jsx       # Train run scheduler & delay notes
                ├── BookingsManager.jsx  # System reservations & waitlist monitor
                ├── AuditLogs.jsx        # Audit log viewer with table filtering
                └── VivaQueries.jsx      # In-browser 15 DBMS viva SQL query guide
```

---

## 3. Technology Stack

- **Frontend**: React 18, Vite, React Router 6, Plain CSS with CSS Variables (No Tailwind), Lucide React icons.
- **Backend**: Node.js v24, Express 4, `pg` (node-postgres) with connection pooling and SSL, `bcryptjs` password hashing, `jsonwebtoken` (JWT) authentication, CORS.
- **Database**: Supabase PostgreSQL 15+ (Single source of truth).

---

## 4. Step-by-Step Supabase Setup Guide

### Step 1: Create a Free Supabase Project
1. Open your browser and go to [https://supabase.com](https://supabase.com).
2. Sign in with GitHub or your email.
3. Click **"New project"**.
4. Set a Project Name (e.g. `railway-management-db`) and enter a strong database password (remember this password!).
5. Select a region near you (e.g., *South Asia (Mumbai)*) and click **"Create new project"**.

### Step 2: Obtain your PostgreSQL Connection URI
1. In your Supabase dashboard, click on the **Project Settings** (gear icon at the bottom of the left sidebar).
2. Go to **Database** &rarr; scroll down to **Connection parameters** or **Connection string**.
3. Select the **URI** tab.
4. Copy the URI. It will look like:
   ```
   postgresql://postgres.[YOUR-PROJECT-REF]:[YOUR-PASSWORD]@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
   ```
   *(Or direct port 5432: `postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres`)*
5. Replace `[YOUR-PASSWORD]` with the database password you chose in Step 1.

### Step 3: Paste into `server/.env`
Open [`server/.env`](file:///c:/development/railway/server/.env) and set:
```env
DATABASE_URL=postgresql://postgres.yourprojectid:yourpassword@aws-0-ap-south-1.pooler.supabase.com:6543/postgres
JWT_SECRET=super_secret_railway_jwt_key_2026_dbms_project
JWT_EXPIRES_IN=7d
PORT=5000
NODE_ENV=development
```

### Step 4: Run the Database Initializer
Execute the initialization script from the workspace root:
```bash
npm run db:init
```
*(This automatically executes `database/schema.sql` and `database/seed.sql` on Supabase, creating all 13 tables, views, triggers, and realistic sample data).*

> **Alternative Method (Direct in Supabase UI)**:
> If your network blocks outbound database ports (5432/6543), you can simply open the **SQL Editor** in your Supabase dashboard:
> 1. Copy the contents of [`database/schema.sql`](file:///c:/development/railway/database/schema.sql) &rarr; paste and click **Run**.
> 2. Copy the contents of [`database/seed.sql`](file:///c:/development/railway/database/seed.sql) &rarr; paste and click **Run**.

---

## 5. Starting the Application

With your `DATABASE_URL` configured:

**Terminal 1 — Backend API:**
```bash
npm run server
# Starts Express server on http://localhost:5000
```

**Terminal 2 — Frontend Client:**
```bash
npm run client
# Starts Vite dev server on http://localhost:3000
```

---

## 6. Demo Login Credentials (Local Project Only)

For rapid evaluation and viva demonstration, pre-seeded accounts can be filled with 1 click on the Login page:

| Role | Email | Password | Access Level |
|---|---|---|---|
| **System Administrator** | `admin@railway.gov.in` | `admin123` | Full Admin Portal, Station/Train CRUD, Seat Repair, Runs, Analytics, Audit Trail |
| **Demo Passenger 1** | `rahul.sharma@example.com` | `password123` | Ticket booking, PNR history, ticket cancellation |
| **Demo Passenger 2** | `amit.kumar@example.com` | `password123` | Confirmed booking on Vande Bharat |
| **Demo Passenger 3** | `sneha.reddy@example.com` | `password123` | Waitlisted ticket on Rajdhani Express |

---

## 7. Pre-Seeded Sample Data Overview

- **Stations (10)**: NDLS (New Delhi), MMCT (Mumbai Central), HWH (Howrah), MAS (Chennai Central), SBC (KSR Bengaluru), PNBE (Patna), ADI (Ahmedabad), HYB (Hyderabad Deccan), CNB (Kanpur Central), BRC (Vadodara).
- **Trains (4)**:
  1. *Capital Rajdhani Superfast* (#1) — NDLS &rarr; ADI &rarr; BRC &rarr; MMCT
  2. *Kaveri Vande Bharat Express* (#2) — MAS &rarr; SBC
  3. *Howrah Bengal Duronto* (#3) — MMCT &rarr; HYB &rarr; HWH
  4. *Ganga Purvanchal Express* (#4) — NDLS &rarr; CNB &rarr; PNBE
- **Coaches & Seats**: AC 1 Tier (`1A`), AC 2 Tier (`2A`), AC 3 Tier (`3A`), Chair Car (`CC`), Executive Class (`EC`), Sleeper (`SL`). Seat `B1-06` is pre-configured as `UNDER_REPAIR` to showcase physical maintenance blocking.
- **Train Runs**: Multi-date scheduled runs for today (`2026-10-30`), tomorrow (`2026-10-31`), and upcoming dates.
- **Sample PNRs**:
  - `PNR8492013`: Multi-passenger confirmed ticket.
  - `PNR7381920`: Waitlisted passenger ticket.
  - `PNR9920145`: Cancelled ticket with refunded payment.

---

## 8. REST API Route Summary

### Authentication (`/api/auth`)
- `POST /api/auth/register`: Create new user account & passenger profile.
- `POST /api/auth/login`: Validate credentials & generate JWT token.
- `GET /api/auth/me`: Fetch authenticated user profile.

### Station Management (`/api/stations`)
- `GET /api/stations`: Retrieve all stations ordered alphabetically.
- `POST /api/stations`: Create station (Admin only, checks unique code).
- `PUT /api/stations/:id`: Update station details (Admin only).
- `DELETE /api/stations/:id`: Delete station with foreign key safety check.

### Train & Route Management (`/api/trains`, `/api/routes`)
- `GET /api/trains/search?from=ID&to=ID&date=YYYY-MM-DD`: Find eligible trains where Origin sequence < Destination sequence with available seat counts.
- `GET /api/trains`: List all registered trains with coach and seat counts.
- `GET /api/trains/:id`: Get single train details with full route stops.
- `POST /api/trains`: Register train (Admin only).
- `GET /api/routes/:trainId`: Get timetable stops ordered by `Stop_Sequence`.
- `POST /api/routes/:trainId`: Add intermediate stop (Admin only).
- `DELETE /api/routes/stop/:scheduleId`: Delete stop from timetable (Admin only).

### Rolling Stock & Seat Maintenance (`/api/coaches`)
- `GET /api/coaches/:trainId`: List coaches and seat condition statuses.
- `POST /api/coaches`: Add coach with auto-generated seats (Admin only).
- `PUT /api/coaches/seats/:seatId/condition`: Toggle `OPERATIONAL` vs `UNDER_REPAIR` and synchronize `Seat_Allocation` rows (Admin only).

### Train Runs (`/api/runs`)
- `GET /api/runs`: List train runs with real-time seat statistics.
- `POST /api/runs`: Schedule train run on date & generate all `Seat_Allocation` rows (Admin only).
- `PUT /api/runs/:runId/status`: Update status (`SCHEDULED`, `RUNNING`, `DELAYED`, `COMPLETED`, `CANCELLED`).

### Reservations & Ticketing (`/api/bookings`, `/api/payments`)
- `POST /api/bookings`: Transactional multi-passenger reservation (`SELECT ... FOR UPDATE`).
- `GET /api/bookings/pnr/:pnr`: PNR lookup via SQL view `vw_booking_details`.
- `GET /api/bookings/my`: Current user's booking history.
- `GET /api/bookings/all`: System-wide reservations ledger (Admin only).
- `POST /api/bookings/cancel`: Cancel passenger ticket with automated waitlist promotion.
- `GET /api/payments`: Payment settlement history.
- `POST /api/payments/retry`: Retry failed payment for a PNR.

### Admin Dashboard & Audit Logs (`/api/admin`, `/api/audit-logs`)
- `GET /api/admin/dashboard`: Real-time SQL aggregate metrics (counts, revenue, occupancy %).
- `GET /api/audit-logs`: Query immutable event audit trail.

---

## 9. Verified Features & DBMS Viva Checklist

| Feature | Implementation | Verified Status |
|---|---|---|
| **Supabase PostgreSQL Schema** | Strict foreign keys, identities, checks, unique constraints | ✅ Tested in `schema.sql` |
| **ACID Booking Transaction** | PostgreSQL `SELECT ... FOR UPDATE` row locks | ✅ Tested in `booking.routes.js` |
| **Multi-Passenger PNR** | 1 to 6 passengers per reservation | ✅ Tested in `BookingModal.jsx` |
| **Payment Failure Rollback** | Simulated payment failure triggers rollback | ✅ Tested via toggle checkbox |
| **Waitlist Promotion** | Atomic promotion on cancellation | ✅ Verified in `booking.routes.js` |
| **Derived Coach Capacity** | `COUNT(Seat_ID)` (eliminates redundancy) | ✅ Implemented in queries |
| **Physical Seat Maintenance** | `UNDER_REPAIR` blocks seat allocations | ✅ Tested in `CoachSeatManager.jsx` |
| **PL/pgSQL Triggers** | `trg_seat_allocation_audit`, `trg_payment_audit` | ✅ Tested in `schema.sql` |
| **PostgreSQL Views** | `vw_booking_details`, `vw_train_occupancy` | ✅ Used for PNR lookup & analytics |
| **Frontend Production Build** | Vite bundles HTML, CSS, and JS | ✅ Built cleanly (0 errors) |
