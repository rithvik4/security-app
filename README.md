# Society Security Management System

Full-stack secure web app for residential society visitor and gate operations.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT access/refresh tokens + RBAC

## Roles

- Admin
- Security
- Member

## Project Structure

```text
secuirty/
  backend/
    prisma/
      schema.prisma
      seed.js
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      validations/
      app.js
      server.js
    .env.example
    package.json
  frontend/
# Society Security Management System

Full-stack secure web app for residential society visitor and gate operations.

## Tech Stack

- Frontend: React + Vite + Tailwind CSS
- Backend: Node.js + Express
- Database: PostgreSQL + Prisma ORM
- Authentication: JWT access/refresh tokens + RBAC

## Roles

- Admin
- Security
- Member

## Project Structure

```text
secuirty/
  backend/
    prisma/
      schema.prisma
      seed.js
    src/
      config/
      controllers/
      middlewares/
      routes/
      services/
      validations/
      app.js
      server.js
    .env.example
    package.json
  frontend/
    src/
      api/
      contexts/
      layouts/
      pages/
        admin/
        security/
        member/
      routes/
      App.jsx
      main.jsx
      index.css
    .env.example
    package.json
  docker-compose.yml
  README.md
```

## Setup Steps

1. Start PostgreSQL:
```bash
docker compose up -d
```

2. Backend setup:
```bash
cd backend
npm install
copy .env.example .env
npm run prisma:generate
npx prisma migrate dev --name init
npm run prisma:seed
npm run dev
```

3. Frontend setup:
```bash
cd frontend
npm install
copy .env.example .env
npm run dev
```

4. Open:
- Frontend: http://localhost:5173
- Backend health: http://localhost:5000/api/health

## Seed Credentials

- admin@society.local / Pass@123
- guard@society.local / Pass@123
- member@society.local / Pass@123

## Core API Endpoints

### Auth
- POST /api/auth/login
- POST /api/auth/refresh
- POST /api/auth/logout
- GET /api/auth/me

### Admin
- GET /api/admin/dashboard/summary
- POST /api/admin/flats
- GET /api/admin/flats
- PATCH /api/admin/flats/:id
- DELETE /api/admin/flats/:id
- POST /api/admin/members
- GET /api/admin/members
- PATCH /api/admin/members/:id
- DELETE /api/admin/members/:id
- POST /api/admin/security
- GET /api/admin/security
- PATCH /api/admin/security/:id
- DELETE /api/admin/security/:id
- GET /api/admin/visitor-logs?dateFrom=&dateTo=&block=&flatNumber=&status=

### Security
- POST /api/security/visitor-entry
- GET /api/security/active-entries
- PATCH /api/security/visitor-exit/:logId

### Member
- GET /api/member/visitors
- PATCH /api/member/visitors/:logId/decision

## Security Measures Included

- bcrypt password hashing
- JWT access + refresh token flow
- Refresh token persistence and revocation
- Role-based authorization middleware
- Zod input validation
- Helmet headers
- Express rate limiting
- CORS origin allowlist
- Basic request sanitization
- Centralized error handling

## Optional Extensions

### Real-Time Updates (Socket.io)

1. Add Socket.io server in backend and authenticate socket connections using JWT.
2. Emit `visitor:created`, `visitor:exited`, and `visitor:rejected` events.
3. Subscribe in frontend role dashboards for live card/table updates.

### PWA Conversion

1. Add `vite-plugin-pwa` to frontend.
2. Configure manifest with app name/icons.
3. Enable runtime caching for API and static assets.
4. Add offline fallback screens for role dashboards.
5. Use install prompt banner for mobile home-screen experience.
>>>>>>> 2e83dab (Initial commit: add all project files)
