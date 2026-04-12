# Tuis - Household Management App

## Overview
Tuis (Afrikaans for "at home") is a self-hosted household management web app built with Next.js. It handles chores, meal planning, shopping lists, recipes, appliance tracking, vendor management, quotes, and couple activities.

## Tech Stack
- **Framework**: Next.js 16 (App Router)
- **Language**: TypeScript
- **Database**: SQLite via better-sqlite3 + Drizzle ORM
- **Styling**: Tailwind CSS v4 + shadcn/ui components
- **Icons**: lucide-react

## Project Structure
```
src/
  app/              # Next.js App Router pages and API routes
    api/            # REST API endpoints
    setup/          # Onboarding wizard for first-time setup
  components/
    ui/             # shadcn/ui primitives (button, card, dialog, etc.)
    layout/         # AppLayout, BottomNav
    user-identity/  # UserPicker, UserAvatar
    dashboard/      # Dashboard widgets
    settings/       # Settings page components
  lib/
    db/             # Database connection (index.ts), schema (schema.ts), seeds
    user-identity.tsx  # User identity context provider
    utils.ts        # cn() utility
```

## Key Patterns

### Pages
- Pages use `AppLayout` component for consistent navigation (sidebar + mobile bottom nav)
- Client pages use `"use client"` directive
- Server pages can do direct DB access via `import { db } from "@/lib/db"`

### API Routes
- Located in `src/app/api/`
- Use `NextResponse.json()` for responses
- Import `db` from `@/lib/db` and schema from `@/lib/db/schema`
- Mark dynamic routes with `export const dynamic = "force-dynamic"`

### Database
- SQLite file at `chore-calendar.db` (or `/app/data/chore-calendar.db` in Docker)
- Schema defined in `src/lib/db/schema.ts` using Drizzle ORM
- Table creation and migrations handled in `src/lib/db/index.ts`
- Lazy initialization via Proxy pattern

### User Identity
- No auth - users are household members identified by localStorage selection
- `UserIdentityProvider` wraps the app in layout.tsx
- `useCurrentUser()` hook for accessing current user

### UI Components
- shadcn/ui components in `src/components/ui/`
- Color palette for users: blue, red, green, amber, violet, pink, cyan, orange

## Commands
```bash
npm run dev          # Start dev server
npm run build        # Production build
npm run seed         # Seed database
npm run seed:demo    # Seed demo data
npm run db:studio    # Drizzle Kit studio
npm test             # Run vitest tests
npm run test:e2e     # Run Playwright tests
```

## Deployment
- Dockerised, pushed to local Gitea registry via `.gitea/workflows/build.yml`
- Runs on homeserver at chores.home.lukeboyle.com
