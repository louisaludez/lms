# Lumina — Smart Library Management System

A full-stack library management system built with **NestJS**, **Vue.js**, and **MySQL**.

## Tech Stack

| Layer     | Technology                          |
|-----------|-------------------------------------|
| Database  | MySQL 8.0+                          |
| Backend   | NestJS + TypeORM + Passport JWT     |
| Frontend  | Vue 3 (Composition API) + Pinia     |
| Styling   | Tailwind CSS v4                     |
| Scheduler | @nestjs/schedule (CRON jobs)        |

## Color Palette

| Token   | Hex       | Usage              |
|---------|-----------|--------------------|
| Primary | `#447794` | Buttons, accents   |
| Accent  | `#2D5B75` | Hover states       |
| Dark    | `#123249` | Navbar, sidebar    |
| Deep    | `#061222` | Login bg, darkest  |

---

## Setup Instructions

### 1. Database
```bash
# In MySQL Workbench or CLI:
mysql -u root -p < database/lumina_schema.sql
```

### 2. Backend (NestJS)
```bash
cd backend

# Copy environment file and fill in your DB credentials
copy .env .env.local   # (edit DB_PASSWORD, JWT_SECRET)

npm run start:dev
# API available at: http://localhost:3000/api/v1
```

### 3. Frontend (Vue)
```bash
cd frontend
npm run dev
# App available at: http://localhost:5173
```

---

## API Endpoints

### Auth
- `POST /api/v1/auth/login` — Login, returns JWT
- `GET  /api/v1/auth/me`    — Current user (JWT required)

### OPAC / Books (Public)
- `GET  /api/v1/books/search?q=...&categoryId=...&availableOnly=true&page=1` — Full-text search
- `GET  /api/v1/books/categories` — All categories
- `GET  /api/v1/books/:id`        — Book detail

### Transactions (Auth Required)
- `POST /api/v1/transactions/checkout` — Check out a book (librarian/admin)
- `POST /api/v1/transactions/return`   — Return a book (librarian/admin)
- `POST /api/v1/transactions/renew`    — Renew a borrow (any user)
- `GET  /api/v1/transactions/my`       — My borrow history
- `GET  /api/v1/transactions/my/active`— Active/overdue borrows

### Attendance
- `POST /api/v1/attendance/scan`        — Scan barcode entry/exit
- `GET  /api/v1/attendance/today`       — Today's logs (librarian)
- `GET  /api/v1/attendance/today/count` — Entry/exit counts

### Reservations
- `POST   /api/v1/reservations/book/:bookId` — Reserve a book
- `GET    /api/v1/reservations/my`           — My reservations
- `DELETE /api/v1/reservations/:id`          — Cancel reservation

### CRON (Admin Only)
- `POST /api/v1/admin/cron/run-overdue-check` — Manually trigger overdue check

---

## CRON Jobs

| Schedule           | Job                          | Description                                         |
|--------------------|------------------------------|-----------------------------------------------------|
| `5 0 * * *`        | `daily-overdue-check`        | Flags overdue transactions, calculates fines, suspends accounts |
| `0 10 * * 0`       | `weekly-reservation-cleanup` | Expires pending reservations past their expiry date  |

> The daily job runs at **00:05 AM Asia/Manila** via `@nestjs/schedule`.

---

## Default Seed Accounts

| Role      | Email                           | Password (change in prod)     |
|-----------|---------------------------------|-------------------------------|
| Admin     | admin@lumina.edu.ph             | Run password update script    |
| Librarian | librarian@lumina.edu.ph         | Run password update script    |
| Student   | juan.delacruz@student.edu.ph   | Run password update script    |
| Faculty   | faculty@lumina.edu.ph          | Run password update script    |

> **Important:** The seed SQL uses placeholder bcrypt hashes. Run the backend `UsersService.create()` to register real accounts, or manually update the `password_hash` column using bcrypt.

---

## Project Structure

```
lms-new/
├── database/
│   └── lumina_schema.sql          # Complete MySQL schema + seed data
├── backend/                       # NestJS application
│   └── src/
│       ├── auth/                  # JWT auth, guards, decorators
│       ├── users/                 # User entity, service, controller
│       ├── books/                 # Book entity, OPAC search service
│       ├── transactions/          # Checkout/return/renewal logic
│       ├── attendance/            # Entry/exit barcode scanning
│       ├── reservations/          # Book reservations
│       └── cron/                  # OverdueCronService (@Cron)
└── frontend/                      # Vue.js application
    └── src/
        ├── api/                   # Axios instance
        ├── stores/                # Pinia stores (auth + library)
        ├── router/                # Vue Router with guards
        ├── views/                 # All page components
        │   ├── StudentOpacView.vue
        │   ├── StudentProfileView.vue
        │   ├── LoginView.vue
        │   ├── BookDetailView.vue
        │   └── dashboard/        # Librarian dashboard views
        ├── components/            # Shared: NavBar, BookCard
        └── layouts/               # DashboardLayout
```
