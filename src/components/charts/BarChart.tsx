"use client";

import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface BarChartProps<T> {
  data: T[];
  getKey: (d: T) => string;
  getValue: (d: T) => number | null;
  formatValue: (v: number) => string;
  formatLabel: (d: T) => string;
  barColor: string;
  label: string;
}

function ChartTooltip({ active, payload, label }: any) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border bg-background px-3 py-2 text-sm shadow-md">
      <p className="font-medium">{label}</p>
      <p className="text-muted-foreground">{payload[0].payload.formatted}</p>
    </div>
  );
}

export function BarChart<T>({
  data,
  getKey,
  getValue,
  formatValue,
  formatLabel,
  barColor,
  label,
}: BarChartProps<T>) {
  const chartData = data.map((d) => {
    const val = getValue(d) ?? 0;
    return {
      key: getKey(d),
      name: formatLabel(d),
      value: val,
      formatted: val ? formatValue(val) : "\u2014",
    };
  });

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="text-muted-foreground">
        <ResponsiveContainer width="100%" height={160}>
          <RechartsBarChart
            data={chartData}
            margin={{ top: 5, right: 5, bottom: 0, left: -10 }}
          >
            <XAxis
              dataKey="name"
              tick={{ fontSize: 11, fill: "currentColor" }}
              tickLine={false}
              axisLine={false}
              interval="preserveStartEnd"
            />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ fill: "currentColor", opacity: 0.08 }}
            />
            <Bar dataKey="value" fill={barColor} radius={[3, 3, 0, 0]} />
          </RechartsBarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
