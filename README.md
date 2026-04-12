# Tuis

*Afrikaans for "at home"*

A household management app for tracking chores, meal planning, shopping lists, appliances, vendors, and quotes. Built with Next.js, SQLite, and Tailwind CSS.

## Screenshots

### Dashboard
Home hub with stats overview, tonight's meal, shopping progress, recent completions, and task sections.

![Dashboard](docs/screenshots/01-dashboard.png)

<details>
<summary>Mobile view</summary>

![Dashboard Mobile](docs/screenshots/01-dashboard-mobile.png)
</details>

### Chores
Track household tasks with area/frequency filters, status grouping (overdue, today, upcoming), completion, and snooze.

![Tasks](docs/screenshots/02-tasks.png)

<details>
<summary>Mobile view</summary>

![Tasks Mobile](docs/screenshots/02-tasks-mobile.png)
</details>

### Shopping Lists
Multiple colour-coded shopping lists with items, quantities, check-off, and autocomplete suggestions.

![Shopping](docs/screenshots/03-shopping.png)

<details>
<summary>Mobile view</summary>

![Shopping Mobile](docs/screenshots/03-shopping-mobile.png)
</details>

### Meal Planner
Weekly meal planning with recipe picker, custom meals, servings multiplier, and ingredient aggregation for shopping.

![Meals](docs/screenshots/04-meals.png)

<details>
<summary>Mobile view</summary>

![Meals Mobile](docs/screenshots/04-meals-mobile.png)
</details>

### Recipe Library
Create and manage recipes with structured ingredients (amount, unit, section), prep/cook times, and scaling.

| Recipes | Recipe Detail |
|---------|---------------|
| ![Recipes](docs/screenshots/05-recipes.png) | ![Recipe Detail](docs/screenshots/05-recipe-detail.png) |

### Appliances
Track appliances with brand, model, warranty dates, linked chores, and service history.

| Appliances | Appliance Detail |
|------------|------------------|
| ![Appliances](docs/screenshots/06-appliances.png) | ![Appliance Detail](docs/screenshots/06-appliance-detail.png) |

### Vendors
Manage service providers with categories, ratings, contact details, and job history.

| Vendors | Vendor Detail |
|---------|---------------|
| ![Vendors](docs/screenshots/07-vendors.png) | ![Vendor Detail](docs/screenshots/07-vendor-detail.png) |

### Quotes
Track vendor quotes with labour/materials breakdown, status management, and Home Maintenance budget from Actual Budget.

| Quotes | Quote Detail |
|--------|--------------|
| ![Quotes](docs/screenshots/08-quotes.png) | ![Quote Detail](docs/screenshots/08-quote-detail.png) |

<details>
<summary>Mobile view</summary>

![Quotes Mobile](docs/screenshots/08-quotes-mobile.png)
</details>

### Together
Shared activity wishlist for things to do as a couple - locations, restaurants, films, dishes, and activities.

![Together](docs/screenshots/09-together.png)

### Stats
Task completion analytics with trends, area breakdown, and most completed tasks.

![Stats](docs/screenshots/10-stats.png)

### Settings
Household member management with colour picker.

![Settings](docs/screenshots/11-settings.png)

## Getting Started

```bash
npm install
npm run seed:demo  # Populate with demo data (optional)
npm run dev        # Start dev server at http://localhost:3000
```

## Scripts

| Script | Description |
|--------|-------------|
| `npm run dev` | Start development server |
| `npm run build` | Production build |
| `npm run seed` | Seed tasks from CSV |
| `npm run seed:demo` | Seed all features with demo data |
| `npm test` | Run unit tests (Vitest) |
| `npm run test:e2e` | Run end-to-end tests (Playwright) |
| `npm run test:coverage` | Run tests with coverage report |

## Tech Stack

- **Framework**: Next.js 16 with React 19
- **Database**: SQLite with Drizzle ORM
- **UI**: Tailwind CSS + Radix UI (shadcn/ui)
- **Testing**: Vitest (unit) + Playwright (e2e)
- **Budget Integration**: Actual Budget API
