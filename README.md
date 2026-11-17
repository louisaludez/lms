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

## Deployment (Vercel + Render)

### Render API
1. Create a Render Web Service from this repository. The included `render.yaml` configures the service to use `backend/`.
2. Create a hosted MySQL 8 database with a provider of your choice, import the schema and required migrations, then set the `DB_HOST`, `DB_PORT`, `DB_USERNAME`, `DB_PASSWORD`, and `DB_NAME` environment variables in Render.
3. Set `JWT_SECRET` to a long, random secret, `FRONTEND_URL` to the production Vercel URL, and `BACKEND_URL` to the Render service URL (no trailing slash).
4. Deploy and confirm the API is reachable at `https://<render-service>.onrender.com/api/v1`.

### Vercel frontend
1. Import the same repository into Vercel and set the project Root Directory to `frontend`.
2. Set `VITE_BACKEND_URL` to the Render service origin, for example `https://<render-service>.onrender.com` (no `/api/v1` suffix).
3. Use `npm run build` as the build command and `dist` as the output directory, then deploy.

The Vercel rewrite supports Vue Router history routes. Render's local filesystem is ephemeral unless persistent storage is configured; use a persistent disk or object storage for profile uploads. The scheduled report jobs also require the Render service to stay running.

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
