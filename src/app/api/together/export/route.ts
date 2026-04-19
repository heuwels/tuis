import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { activities } from "@/lib/db/schema";
import { desc } from "drizzle-orm";
import { validateApiRequest } from "@/lib/auth/validate";

export const dynamic = "force-dynamic";

const CATEGORY_LABELS: Record<string, string> = {
  location: "Locations",
  activity: "Activities",
  restaurant: "Restaurants",
  dish: "Dishes to Make",
  film: "Films & Shows",
};

const STATUS_LABELS: Record<string, string> = {
  wishlist: "Wishlist",
  planned: "Planned",
  completed: "Completed",
};

const COST_LABELS: Record<string, string> = {
  low: "$",
  medium: "$$",
  high: "$$$",
  splurge: "$$$$",
};

const DURATION_LABELS: Record<string, string> = {
  quick: "Quick (< 2 hours)",
  "half-day": "Half day",
  "full-day": "Full day",
  weekend: "Weekend",
  "week+": "Week or more",
};

const SEASON_LABELS: Record<string, string> = {
  any: "Any time",
  spring: "Spring",
  summer: "Summer",
  fall: "Fall",
  winter: "Winter",
};

const PRIORITY_LABELS: Record<string, string> = {
  low: "Low",
  medium: "Medium",
  high: "High",
};

export async function GET(request: Request) {
  try {
    const authError = await validateApiRequest(request);
    if (authError) return authError;

    const { searchParams } = new URL(request.url);
    const format = searchParams.get("format") || "json";

    const allActivities = await db
      .select()
      .from(activities)
      .orderBy(desc(activities.updatedAt));

    if (format === "json") {
      // Structured JSON export
      const data = {
        exportedAt: new Date().toISOString(),
        version: "1.0",
        activities: allActivities.map((a) => ({
          ...a,
          tags: a.tags ? JSON.parse(a.tags) : null,
        })),
      };

      return new NextResponse(JSON.stringify(data, null, 2), {
        headers: {
          "Content-Type": "application/json",
          "Content-Disposition": `attachment; filename="to-do-together-${new Date().toISOString().split("T")[0]}.json"`,
        },
      });
    }

    if (format === "csv") {
      // CSV export
      const headers = [
        "Title",
        "Category",
        "Status",
        "Notes",
        "URL",
        "Location",
        "Estimated Cost",
        "Duration",
        "Season",
        "Priority",
        "Rating",
        "Completed Date",
        "Review",
        "Image URL",
        "Created At",
      ];

      const escapeCSV = (value: string | null | undefined) => {
        if (value === null || value === undefined) return "";
        const str = String(value);
        if (str.includes(",") || str.includes('"') || str.includes("\n")) {
          return `"${str.replace(/"/g, '""')}"`;
        }
        return str;
      };

      const rows = allActivities.map((a) =>
        [
          a.title,
          CATEGORY_LABELS[a.category] || a.category,
          STATUS_LABELS[a.status] || a.status,
          a.notes,
          a.url,
          a.location,
          a.estimatedCost ? COST_LABELS[a.estimatedCost] || a.estimatedCost : "",
          a.duration ? DURATION_LABELS[a.duration] || a.duration : "",
          a.season ? SEASON_LABELS[a.season] || a.season : "",
          a.priority ? PRIORITY_LABELS[a.priority] || a.priority : "",
          a.rating ? "★".repeat(a.rating) : "",
          a.completedDate || "",
          a.review,
          a.imageUrl,
          a.createdAt,
        ]
          .map(escapeCSV)
          .join(",")
      );

      const csv = [headers.join(","), ...rows].join("\n");

      return new NextResponse(csv, {
        headers: {
          "Content-Type": "text/csv",
          "Content-Disposition": `attachment; filename="to-do-together-${new Date().toISOString().split("T")[0]}.csv"`,
        },
      });
    }

    if (format === "markdown") {
      // Markdown document export - grouped by category, then by status
      const lines: string[] = [];
      lines.push("# To-Do Together");
      lines.push("");
      lines.push(`*Exported ${new Date().toLocaleDateString()}*`);
      lines.push("");

      // Group by category
      const byCategory = allActivities.reduce(
        (acc, a) => {
          if (!acc[a.category]) acc[a.category] = [];
          acc[a.category].push(a);
          return acc;
        },
        {} as Record<string, typeof allActivities>
      );

      const categoryOrder = ["location", "activity", "restaurant", "dish", "film"];

      for (const category of categoryOrder) {
        const items = byCategory[category];
        if (!items || items.length === 0) continue;

        lines.push(`## ${CATEGORY_LABELS[category] || category}`);
        lines.push("");

        // Group by status within category
        const byStatus = items.reduce(
          (acc, a) => {
            if (!acc[a.status]) acc[a.status] = [];
            acc[a.status].push(a);
            return acc;
          },
          {} as Record<string, typeof items>
        );

        const statusOrder = ["wishlist", "planned", "completed"];

        for (const status of statusOrder) {
          const statusItems = byStatus[status];
          if (!statusItems || statusItems.length === 0) continue;

          lines.push(`### ${STATUS_LABELS[status] || status}`);
          lines.push("");

          for (const item of statusItems) {
            // Title with checkbox style
            const checkbox = status === "completed" ? "[x]" : "[ ]";
            lines.push(`- ${checkbox} **${item.title}**`);

            // Details as sub-items
            const details: string[] = [];

            if (item.notes) {
              details.push(`  - ${item.notes}`);
            }
            if (item.location) {
              details.push(`  - 📍 ${item.location}`);
            }
            if (item.url) {
              details.push(`  - 🔗 ${item.url}`);
            }
            if (item.estimatedCost) {
              details.push(`  - 💰 ${COST_LABELS[item.estimatedCost] || item.estimatedCost}`);
            }
            if (item.duration) {
              details.push(`  - ⏱️ ${DURATION_LABELS[item.duration] || item.duration}`);
            }
            if (item.season && item.season !== "any") {
              details.push(`  - 🗓️ Best in ${SEASON_LABELS[item.season] || item.season}`);
            }
            if (item.rating) {
              details.push(`  - ${"⭐".repeat(item.rating)}`);
            }
            if (item.completedDate) {
              details.push(`  - ✅ Completed: ${new Date(item.completedDate).toLocaleDateString()}`);
            }
            if (item.review) {
              details.push(`  - 💭 *${item.review}*`);
            }

            lines.push(...details);
            lines.push("");
          }
        }
      }

      // Add summary stats
      lines.push("---");
      lines.push("");
      lines.push("## Summary");
      lines.push("");
      const total = allActivities.length;
      const completed = allActivities.filter((a) => a.status === "completed").length;
      const planned = allActivities.filter((a) => a.status === "planned").length;
      const wishlist = allActivities.filter((a) => a.status === "wishlist").length;
      lines.push(`- **Total items:** ${total}`);
      lines.push(`- **Completed:** ${completed}`);
      lines.push(`- **Planned:** ${planned}`);
      lines.push(`- **Wishlist:** ${wishlist}`);

      const markdown = lines.join("\n");

      return new NextResponse(markdown, {
        headers: {
          "Content-Type": "text/markdown",
          "Content-Disposition": `attachment; filename="to-do-together-${new Date().toISOString().split("T")[0]}.md"`,
        },
      });
    }

    return NextResponse.json({ error: "Invalid format" }, { status: 400 });
  } catch (error) {
    console.error("Error exporting activities:", error);
    return NextResponse.json(
      { error: "Failed to export activities" },
      { status: 500 }
    );
  }
}
