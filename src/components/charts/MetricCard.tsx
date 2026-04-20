"use client";

const colorMap: Record<string, { bg: string; text: string }> = {
  red: {
    bg: "bg-red-50 dark:bg-red-950/30",
    text: "text-red-700 dark:text-red-400",
  },
  blue: {
    bg: "bg-blue-50 dark:bg-blue-950/30",
    text: "text-blue-700 dark:text-blue-400",
  },
  green: {
    bg: "bg-green-50 dark:bg-green-950/30",
    text: "text-green-700 dark:text-green-400",
  },
  amber: {
    bg: "bg-amber-50 dark:bg-amber-950/30",
    text: "text-amber-700 dark:text-amber-400",
  },
  purple: {
    bg: "bg-purple-50 dark:bg-purple-950/30",
    text: "text-purple-700 dark:text-purple-400",
  },
};

interface MetricCardProps {
  label: string;
  value: string;
  subValue?: string;
  color: string;
}

export function MetricCard({ label, value, subValue, color }: MetricCardProps) {
  const colors = colorMap[color] ?? colorMap.blue;

  return (
    <div className={`p-3 ${colors.bg} rounded-lg`}>
      <span className="text-xs text-muted-foreground">{label}</span>
      <p className={`text-lg font-semibold ${colors.text}`}>{value}</p>
      {subValue && (
        <p className="text-xs text-muted-foreground mt-0.5">{subValue}</p>
      )}
    </div>
  );
}
