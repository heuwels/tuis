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

## Debugging E2E Failures

When a test fails, default to **live debugging on the page**, not parsing `trace.zip`. The page is the source of truth; the trace is a frozen artefact that takes 5+ steps to query.

### First reach — print and screenshot

Add to the test, right before the failing assertion:

```ts
console.log(await page.locator("main").innerText());
await page.screenshot({ path: "debug.png" });
```

Re-run the single spec (not the whole suite). 90% of the time the question — "is the data there? is it inside the locator I'm scoping to?" — is answered immediately.

### Second reach — interactive

```bash
npx playwright test e2e/<spec>.spec.ts --debug    # step through with inspector
npx playwright test e2e/<spec>.spec.ts --ui       # time-travel UI
npx playwright test e2e/<spec>.spec.ts --headed   # watch the browser run
```

### Last reach — trace archaeology

Only if the failure is CI-only and can't be reproduced locally. Even then, prefer:

```bash
npx playwright show-trace test-results/.../trace.zip
```

over unzipping the file and grepping HTML/network resources by hand.

### Recurring locator gotchas

These have eaten time more than once. Check before going deep:

- **Tables render desktop and mobile rows side-by-side in the DOM** (Tailwind `hidden md:grid` / `md:hidden`). `getByText("X")` resolves to two elements → strict-mode violation. Use `.first()` or scope to a viewport-specific container.
- **`CardTitle` is a styled `<div>`, not an `<h*>`.** `getByRole("heading", ...)` will not match it. Use `page.locator("[data-slot='card-title']").filter({ hasText: ... })`.
- **`<select>` `<option>` text is matched by `getByText`** even when the option isn't visible. When the sidebar shows a household combobox, every household name on the page is also in an `<option>`. Scope to the relevant card or use a more specific element selector.
- **`dismissUserPickerIfVisible` only handles the user picker.** If the user is in 2+ households with no `tuis-household-id` in localStorage, the household picker is also blocking. Handle it explicitly or seed localStorage before navigating.
- **Each test gets a fresh `BrowserContext` by default.** Don't rely on localStorage persisting between tests in the same file — `test.describe.serial()` makes tests sequential, not stateful.

## Code Style

- No new lint warnings
- Dark mode: use `dark:` variant for all hardcoded colour classes
- Prefer editing existing files over creating new ones
