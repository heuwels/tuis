#!/bin/bash
set -e

ROOT="/Users/luke/Sites/personal/tuis"
export GIT_DIR="$ROOT/.git"
export GIT_WORK_TREE="$ROOT"

git checkout feature/dark-mode
echo "On branch: $(git branch --show-current)"

# Run the fix script
bash "$ROOT/fix-dark-mode.sh" 2>&1 || true

# Now run the remaining fixes that the first script couldn't handle

# ActivityCard
sed -i '' '/from "lucide-react";/{
a\
import { activityCategoryColors, activityStatusColors } from "@/lib/area-colors";
}' "$ROOT/src/components/together/ActivityCard.tsx"
sed -i '' 's/<Badge className={categoryConfig.color}/<Badge className={activityCategoryColors[activity.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}/' "$ROOT/src/components/together/ActivityCard.tsx"
sed -i '' 's/<Badge className={statusConfig.color}/<Badge className={activityStatusColors[activity.status] || activityStatusColors.wishlist}/' "$ROOT/src/components/together/ActivityCard.tsx"
sed -i '' 's/relative bg-gray-100">/relative bg-gray-100 dark:bg-gray-800">/' "$ROOT/src/components/together/ActivityCard.tsx"

# ActivityDetail
sed -i '' '/from ".\/ActivityCard";/{
a\
import { activityCategoryColors, activityStatusColors } from "@/lib/area-colors";
}' "$ROOT/src/components/together/ActivityDetail.tsx"
sed -i '' 's/<Badge className={categoryConfig.color}/<Badge className={activityCategoryColors[activity.category] || "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300"}/' "$ROOT/src/components/together/ActivityDetail.tsx"
sed -i '' 's/<Badge className={statusConfig.color}/<Badge className={activityStatusColors[activity.status] || activityStatusColors.wishlist}/' "$ROOT/src/components/together/ActivityDetail.tsx"
sed -i '' 's/relative bg-gray-100 rounded-lg/relative bg-gray-100 dark:bg-gray-800 rounded-lg/' "$ROOT/src/components/together/ActivityDetail.tsx"

# VendorCard
sed -i '' '/from "lucide-react";/{
a\
import { vendorCategoryColors, areaColorFallback } from "@/lib/area-colors";
}' "$ROOT/src/components/vendors/VendorCard.tsx"
sed -i '' '/^const categoryColors: Record<string, string> = {/,/^};/d' "$ROOT/src/components/vendors/VendorCard.tsx"
sed -i '' 's/categoryColors\[vendor.category || ""\] || "bg-gray-100 text-gray-800"/vendorCategoryColors[vendor.category || ""] || areaColorFallback/' "$ROOT/src/components/vendors/VendorCard.tsx"
sed -i '' 's/: "text-gray-300"/: "text-gray-300 dark:text-gray-600"/' "$ROOT/src/components/vendors/VendorCard.tsx"
sed -i '' 's/bg-emerald-100 rounded-lg/bg-emerald-100 dark:bg-emerald-950 rounded-lg/' "$ROOT/src/components/vendors/VendorCard.tsx"
sed -i '' 's/text-gray-900">{vendor.name}/text-gray-900 dark:text-gray-100">{vendor.name}/' "$ROOT/src/components/vendors/VendorCard.tsx"

# VendorDetail
sed -i '' '/from "date-fns";/{
a\
import { vendorCategoryColors, areaColorFallback } from "@/lib/area-colors";
}' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' '/^const categoryColors: Record<string, string> = {/,/^};/d' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/categoryColors\[vendor.category || ""\] || "bg-gray-100 text-gray-800"/vendorCategoryColors[vendor.category || ""] || areaColorFallback/' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/: "text-gray-300"/: "text-gray-300 dark:text-gray-600"/' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/bg-emerald-100 rounded-lg/bg-emerald-100 dark:bg-emerald-950 rounded-lg/g' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/bg-gray-50 rounded-lg p-3/bg-gray-50 dark:bg-zinc-900 rounded-lg p-3/g' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/p-2 bg-gray-50 rounded-lg text-sm/p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm/g' "$ROOT/src/components/vendors/VendorDetail.tsx"
sed -i '' 's/bg-green-100 text-green-800"/bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"/g' "$ROOT/src/components/vendors/VendorDetail.tsx"

# VendorForm
sed -i '' 's/: "text-gray-300 hover:text-yellow-400"/: "text-gray-300 dark:text-gray-600 hover:text-yellow-400"/' "$ROOT/src/components/vendors/VendorForm.tsx"

# ApplianceCard
sed -i '' '/from "lucide-react";/{
a\
import { locationColors as sharedLocationColors, areaColorFallback } from "@/lib/area-colors";
}' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' '/^const locationColors: Record<string, string> = {/,/^};/d' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/locationColors\[appliance.location || ""\] || "bg-gray-100 text-gray-800"/sharedLocationColors[appliance.location || ""] || areaColorFallback/' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/"bg-gray-100 text-gray-600"/"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"/' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/"bg-amber-100 text-amber-800"/"bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"/' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/"bg-green-100 text-green-800"/"bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"/' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/bg-blue-100 rounded-lg/bg-blue-100 dark:bg-blue-950 rounded-lg/' "$ROOT/src/components/appliances/ApplianceCard.tsx"
sed -i '' 's/text-gray-900">{appliance.name}/text-gray-900 dark:text-gray-100">{appliance.name}/' "$ROOT/src/components/appliances/ApplianceCard.tsx"

# ApplianceDetail
sed -i '' 's/"bg-gray-100 text-gray-600"/"bg-gray-100 text-gray-600 dark:bg-gray-800 dark:text-gray-400"/' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/"bg-amber-100 text-amber-800"/"bg-amber-100 text-amber-800 dark:bg-amber-950 dark:text-amber-300"/' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/"bg-green-100 text-green-800"/"bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"/' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/className="bg-gray-100">/className="bg-gray-100 dark:bg-gray-800">/' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/bg-blue-100 rounded-lg/bg-blue-100 dark:bg-blue-950 rounded-lg/' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/bg-gray-50 rounded-lg p-3/bg-gray-50 dark:bg-zinc-900 rounded-lg p-3/g' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/p-2 bg-gray-50 rounded-lg text-sm/p-2 bg-gray-50 dark:bg-zinc-900 rounded-lg text-sm/g' "$ROOT/src/components/appliances/ApplianceDetail.tsx"
sed -i '' 's/bg-green-100 text-green-800"/bg-green-100 text-green-800 dark:bg-green-950 dark:text-green-300"/g' "$ROOT/src/components/appliances/ApplianceDetail.tsx"

# UserPicker
sed -i '' 's/hover:bg-gray-50 active:bg-gray-100/hover:bg-gray-50 dark:hover:bg-zinc-800 active:bg-gray-100 dark:active:bg-zinc-700/' "$ROOT/src/components/user-identity/UserPicker.tsx"
sed -i '' 's/text-gray-900">/text-gray-900 dark:text-gray-100">/' "$ROOT/src/components/user-identity/UserPicker.tsx"

# BudgetCard
sed -i '' 's/border-red-200 bg-red-50\/50/border-red-200 dark:border-red-800 bg-red-50\/50 dark:bg-red-950\/30/' "$ROOT/src/components/quotes/BudgetCard.tsx"
sed -i '' 's/bg-green-50\/50 border-green-200/bg-green-50\/50 dark:bg-green-950\/30 border-green-200 dark:border-green-800/' "$ROOT/src/components/quotes/BudgetCard.tsx"
sed -i '' 's/? "bg-red-100" : "bg-green-100"/? "bg-red-100 dark:bg-red-950" : "bg-green-100 dark:bg-green-950"/' "$ROOT/src/components/quotes/BudgetCard.tsx"

# Layout inline script - fix 3
sed -i '' "s|if (d) document.documentElement.classList.add('dark');|if (d) document.documentElement.classList.add('dark'); else document.documentElement.classList.remove('dark');|" "$ROOT/src/app/layout.tsx"

# ThemeProvider try/catch - fix 4
sed -i '' 's/    const stored = localStorage.getItem(STORAGE_KEY) as Theme | null;/    let stored: Theme | null = null;\
    try {\
      stored = localStorage.getItem(STORAGE_KEY) as Theme | null;\
    } catch (e) {\
      \/\/ localStorage may be unavailable (SSR, private browsing, etc.)\
    }/' "$ROOT/src/components/ThemeProvider.tsx"

# e2e test - fix 5
cat > "$ROOT/e2e/theme.spec.ts" << 'E2EEOF'
import { test, expect } from "@playwright/test";

test.describe("Theme toggle", () => {
  test.beforeEach(async ({ page }) => {
    await page.goto("/");
    await page.evaluate(() => localStorage.removeItem("tuis-theme"));
    await page.reload();
  });

  test("switching to dark mode adds dark class", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.reload();
    const hasDark = await page.evaluate(() =>
      document.documentElement.classList.contains("dark")
    );
    expect(hasDark).toBe(true);
  });

  test("switching to light mode removes dark class", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.evaluate(() => localStorage.setItem("tuis-theme", "light"));
    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(false);
  });

  test("theme persists across navigation", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.goto("/settings");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
  });

  test("theme persists across reload", async ({ page }) => {
    await page.evaluate(() => localStorage.setItem("tuis-theme", "dark"));
    await page.goto("/");
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);

    await page.reload();
    expect(await page.evaluate(() => document.documentElement.classList.contains("dark"))).toBe(true);
    expect(await page.evaluate(() => localStorage.getItem("tuis-theme"))).toBe("dark");
  });
});
E2EEOF

echo "=== All fixes applied ==="

# Build
echo "=== Running build ==="
cd "$ROOT"
npx next build 2>&1 | tail -10

# Stage and commit
echo "=== Staging and committing ==="
git add -A
git status --short

git commit -m "$(cat <<'EOF'
Fix dark mode PR review issues: shared area colours, dark variants, and e2e tests

- Extract duplicated areaColors maps into shared src/lib/area-colors.ts
- Add dark: variants to ALL remaining hardcoded light-only colours across
  ~30 component files (bg-white, bg-gray-50, text-gray-900, etc.)
- Fix inline theme script to both add AND remove dark class
- Add try/catch around localStorage.getItem in ThemeProvider
- Add e2e/theme.spec.ts for theme toggle persistence tests

Co-Authored-By: Claude Opus 4.6 (1M context) <noreply@anthropic.com>
EOF
)"

echo "=== Pushing ==="
git push origin feature/dark-mode

echo "=== Done ==="
