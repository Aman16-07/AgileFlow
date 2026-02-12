# ProjectFlow

ProjectFlow is a full-stack project management app with boards, backlog, sprints, tasks, comments, activity tracking, recents, starred items, and realtime updates.

## Tech Stack

- Frontend: Next.js 14 (App Router), React 18, TypeScript, Tailwind CSS, Zustand, Axios, Socket.IO client
- Backend: NestJS 10, Prisma, SQLite, Socket.IO, JWT auth infrastructure, Swagger

## Key Features

- Space-based organization (`/spaces/[spaceKey]`)
- Kanban board with drag-and-drop task movement
- Backlog and sprint views
- Task detail panel with inline edits, comments, activity feed, labels, due dates, points, assignees
- Dashboard widgets (assigned work, recent activity, metrics)
- Starred entities (space, board, task)
- Recents dropdown with search
- Realtime gateway for task/comment/sprint broadcasts
- API docs through Swagger UI

## How It Works

### 1) Frontend app shell

- `frontend/src/app/(app)/layout.tsx` mounts global UI: sidebar, task detail panel, create-space modal, recents dropdown.
- A socket connection is opened once at app-shell level via `frontend/src/lib/socket.ts`.

### 2) Data fetching and state

- API base URL is configured in `frontend/src/lib/api.ts` using `NEXT_PUBLIC_API_URL` (fallback: `http://localhost:4000/api/v1`).
- Zustand stores manage shared UI and board state:
  - `frontend/src/stores/ui-store.ts`
  - `frontend/src/stores/board-store.ts`
  - `frontend/src/stores/space-store.ts`
- Board drag-and-drop applies optimistic local updates first, then persists with `PATCH /tasks/move`.

### 3) Backend modules

- App wiring is in `backend/src/app.module.ts`.
- Main functional modules include:
  - `auth`, `users`, `spaces`, `boards`, `tasks`, `sprints`, `workflows`
  - `comments`, `activities`, `dashboard`, `stars`, `recents`, `realtime`

### 4) Persistence layer

- Prisma schema lives in `backend/prisma/schema.prisma`.
- Current datasource is SQLite (`provider = "sqlite"`), using `DATABASE_URL="file:./dev.db"` by default.

### 5) Realtime

- WebSocket namespace: `/realtime`
- Room model:
  - `space:{spaceId}`
  - `board:{boardId}`
  - `task:{taskId}`
- Events emitted by backend gateway include `task:moved`, `task:updated`, `task:created`, `task:deleted`, `comment:added`, `sprint:updated`.

## Project Structure

```txt
backend/
  prisma/
  src/
frontend/
  src/
README.md
```

## Prerequisites

- Node.js 18+ (Node 20 recommended)
- npm 9+

## Environment Variables

### Backend (`backend/.env`)

Copy from `backend/.env.example`:

```env
DATABASE_URL="file:./dev.db"
JWT_SECRET="your-super-secret-jwt-key-change-in-production"
JWT_REFRESH_SECRET="your-super-secret-refresh-key-change-in-production"
JWT_EXPIRATION="15m"
JWT_REFRESH_EXPIRATION="7d"
REDIS_URL="redis://localhost:6379"
PORT=4000
CORS_ORIGIN="http://localhost:3000"
GEMINI_API_KEY="your-gemini-api-key-here"
```

### Frontend (`frontend/.env.local`)

```env
NEXT_PUBLIC_API_URL="http://localhost:4000/api/v1"
NEXT_PUBLIC_SOCKET_URL="http://localhost:4000"
```

## Local Setup

1. Install backend dependencies:

```bash
cd backend
npm install
```

2. Run Prisma migration and client generation:

```bash
npx prisma migrate dev
npx prisma generate
```

3. Start backend:

```bash
npm run start:dev
```

4. In a second terminal, install frontend dependencies:

```bash
cd frontend
npm install
```

5. Start frontend:

```bash
npm run dev
```

6. Open:

- Frontend: `http://localhost:3000`
- Backend API docs: `http://localhost:4000/api/docs`

## Available Scripts

### Backend

- `npm run start:dev` - run NestJS in watch mode
- `npm run build` - compile backend
- `npm run prisma:migrate` - run Prisma migrations
- `npm run prisma:generate` - regenerate Prisma client
- `npm run prisma:studio` - open Prisma Studio

### Frontend

- `npm run dev` - run Next.js dev server
- `npm run build` - production build
- `npm run start` - run production server

## Notes

- The frontend auth store currently uses a demo user mode in `frontend/src/stores/auth-store.ts`.
- Backend auth service supports JWT/refresh-token logic, but frontend login/register flows are stubbed for demo UX.