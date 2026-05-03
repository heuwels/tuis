"use client";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

export interface MetricConfig<T> {
  key: string;
  getValue: (d: T) => number | null;
  label: string;
  color: string;
  dotColor: string;
  strokeColor: string;
  format: (v: number) => string;
}

interface MultiLineChartProps<T> {
  data: T[];
  metrics: MetricConfig<T>[];
  getLabel: (d: T) => string;
  title: string;
}

function ChartTooltip({
  active,
  payload,
  label,
  metrics,
}: {
  active?: boolean;
  payload?: { dataKey: string; payload: Record<string, number | null> }[];
  label?: string;
  metrics: MetricConfig<never>[];
}) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium mb-1">{label}</p>
      {metrics.map((m) => {
        const entry = payload.find((p) => p.dataKey === m.key);
        const raw = entry?.payload[`${m.key}_raw`];
        if (raw == null) return null;
        return (
          <div key={m.key} className="flex items-center gap-2">
            <span
              className={`w-2 h-2 rounded-full shrink-0 ${m.dotColor}`}
            />
            <span className="text-muted-foreground">
              {m.label}: {m.format(raw)}
            </span>
          </div>
        );
      })}
    </div>
  );
}

export function MultiLineChart<T>({
  data,
  metrics,
  getLabel,
  title,
}: MultiLineChartProps<T>) {
  if (data.length < 2) return null;

  // Normalize each series independently to [0, 1] for overlay comparison
  const seriesStats: Record<
    string,
    { min: number; max: number; range: number }
  > = {};
  metrics.forEach((m) => {
    const nums = data
      .map((d) => m.getValue(d))
      .filter((v): v is number => v !== null);
    if (nums.length === 0) {
      seriesStats[m.key] = { min: 0, max: 1, range: 1 };
    } else {
      const min = Math.min(...nums);
      const max = Math.max(...nums);
      seriesStats[m.key] = { min, max, range: max - min || 1 };
    }
  });

  const chartData = data.map((d) => {
    const point: Record<string, string | number | null> = { label: getLabel(d) };
    metrics.forEach((m) => {
      const raw = m.getValue(d);
      point[`${m.key}_raw`] = raw;
      const { min, range } = seriesStats[m.key];
      point[m.key] = raw !== null ? (raw - min) / range : null;
    });
    return point;
  });

  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="flex flex-wrap gap-x-3 gap-y-1 mb-2">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${m.dotColor}`} />
            <span className="text-[11px] text-muted-foreground">{m.label}</span>
          </div>
        ))}
      </div>
      <div className="text-muted-foreground">
        <ResponsiveContainer width="100%" height={180}>
          <LineChart
            data={chartData}
            margin={{ top: 5, right: 10, bottom: 0, left: 10 }}
          >
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <YAxis hide domain={[0, 1]} />
            <Tooltip content={<ChartTooltip metrics={metrics} />} />
            {metrics.map((m) => (
              <Line
                key={m.key}
                type="monotone"
                dataKey={m.key}
                stroke={m.strokeColor}
                strokeWidth={2}
                dot={{ r: 3, fill: m.strokeColor }}
                activeDot={{ r: 5 }}
                connectNulls
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
