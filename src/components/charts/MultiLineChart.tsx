"use client";

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

export function MultiLineChart<T>({
  data,
  metrics,
  getLabel,
  title,
}: MultiLineChartProps<T>) {
  if (data.length < 2) return null;

  const width = 500;
  const height = 120;
  const padding = { top: 10, right: 10, bottom: 20, left: 10 };
  const chartW = width - padding.left - padding.right;
  const chartH = height - padding.top - padding.bottom;

  const xStep = data.length > 1 ? chartW / (data.length - 1) : 0;

  function normalizeSeries(values: (number | null)[]): (number | null)[] {
    const nums = values.filter((v): v is number => v !== null);
    if (nums.length === 0) return values;
    const min = Math.min(...nums);
    const max = Math.max(...nums);
    const range = max - min || 1;
    return values.map((v) => (v !== null ? (v - min) / range : null));
  }

  return (
    <div>
      <p className="text-sm font-medium mb-2">{title}</p>
      <div className="flex gap-3 mb-2">
        {metrics.map((m) => (
          <div key={m.key} className="flex items-center gap-1">
            <div className={`w-2 h-2 rounded-full ${m.dotColor}`} />
            <span className="text-[11px] text-muted-foreground">
              {m.label}
            </span>
          </div>
        ))}
      </div>
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full"
        preserveAspectRatio="xMidYMid meet"
      >
        {/* X-axis labels */}
        {data.map((d, i) => {
          const step = Math.max(1, Math.floor(data.length / 6));
          if (i % step !== 0 && i !== data.length - 1) return null;
          return (
            <text
              key={getLabel(d)}
              x={padding.left + i * xStep}
              y={height - 2}
              textAnchor="middle"
              className="fill-muted-foreground"
              fontSize="9"
            >
              {getLabel(d)}
            </text>
          );
        })}

        {/* Lines */}
        {metrics.map((m) => {
          const rawValues = data.map((d) => m.getValue(d));
          const normalized = normalizeSeries(rawValues);

          const points: { x: number; y: number; raw: number; idx: number }[] =
            [];
          normalized.forEach((v, i) => {
            if (v !== null) {
              points.push({
                x: padding.left + i * xStep,
                y: padding.top + chartH - v * chartH,
                raw: rawValues[i]!,
                idx: i,
              });
            }
          });

          if (points.length < 2) return null;

          const pathD = points
            .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x} ${p.y}`)
            .join(" ");

          return (
            <g key={m.key}>
              <path
                d={pathD}
                fill="none"
                stroke={m.strokeColor}
                strokeWidth="2"
                strokeLinejoin="round"
              />
              {points.map((p, i) => (
                <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={m.strokeColor}>
                  <title>
                    {getLabel(data[p.idx])}: {m.format(p.raw)}
                  </title>
                </circle>
              ))}
            </g>
          );
        })}
      </svg>
    </div>
  );
}
