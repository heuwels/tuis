# Tuis - Household Management App

**IMPORTANT: Before making any changes, read `CONTRIBUTING.md` for test requirements. All unit tests, lint, and e2e tests must pass locally before raising a PR.**

## Branching & PRs

- **`master` is the main trunk** and is branch-protected. Never push directly to master.
- All changes must be made on a feature branch and merged via pull request.
- Branch naming: `feature/<name>`, `fix/<name>`, `chore/<name>`
- Create a PR with `gh pr create` after pushing your branch.

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

### Testing

**All new features must include both unit and e2e tests.**

- **Unit tests** (Vitest): `src/app/api/__tests__/*.test.ts`
  - Use in-memory SQLite via `better-sqlite3` for isolation
  - Mock `@/lib/db` with `vi.mock()` to inject test DB
  - Import and call route handlers directly as functions
  - Create tables with raw SQL in `createTables()`, reset per test via `beforeEach`
  - Use helper functions for HTTP request construction and test data insertion

- **E2e tests** (Playwright): `e2e/*.spec.ts`
  - Use `test.describe.serial()` for sequential test groups
  - Isolate test data with timestamped names: `` `E2E Test Foo ${Date.now()}` ``
  - Clean up via `cleanupTestData(request, type, pattern)` in `test.afterAll()`
  - Handle user picker dialog with `dismissUserPickerIfVisible(page)` helper
  - Wait for `networkidle` and loading states before assertions
  - Cleanup endpoint: `POST /api/e2e-cleanup` (dev-only)

### Dark Mode
- Class-based Tailwind v4 dark mode with `@custom-variant dark`
- Three modes: light, dark, system (stored in localStorage as `"tuis-theme"`)
- ThemeProvider in layout.tsx applies `.dark` class on `document.documentElement`
- Use `dark:` variant for all hardcoded color classes (e.g. `bg-gray-50 dark:bg-zinc-800`)

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
