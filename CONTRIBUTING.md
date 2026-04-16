# Contributing to Tuis

## Before Raising a PR

All tests must pass locally before opening a pull request. CI will reject PRs with failing tests.

### 1. Unit Tests

```bash
npm test
```

All vitest tests must pass with zero failures.

### 2. E2E Tests

```bash
npm run test:e2e
```

All Playwright tests must pass. Playwright runs in strict mode — if a locator resolves to multiple elements, the test fails. Fix with `.first()`, `.nth()`, or a more specific selector.

### 3. Lint

```bash
npm run lint
```

No new lint errors.

### Quick Check (run all three)

```bash
npm test && npm run lint && npm run test:e2e
```

## Writing Tests

### Unit Tests

- Located in `src/app/api/__tests__/`
- Use in-memory SQLite with `better-sqlite3`
- Mock `@/lib/db` with `vi.mock()` to inject the test DB
- Create tables with raw SQL in `createTables()`, reset per test via `beforeEach`

### E2E Tests

- Located in `e2e/`
- Use `test.describe.serial()` for tests that depend on prior state
- Isolate test data with timestamped names: `` `E2E Test Foo ${Date.now()}` ``
- Clean up via `cleanupTestData(request, type, pattern)` in `test.afterAll()`
- Handle user picker with `dismissUserPickerIfVisible(page)`
- Use `.first()` when a locator might match multiple elements (e.g. task names appear in both badges and card titles)
- Wait for `networkidle` and loading states before assertions

## Code Style

- No new lint warnings
- Dark mode: use `dark:` variant for all hardcoded colour classes
- Prefer editing existing files over creating new ones
