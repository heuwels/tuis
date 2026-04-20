"use client";

interface BarChartProps<T> {
  data: T[];
  getKey: (d: T) => string;
  getValue: (d: T) => number | null;
  formatValue: (v: number) => string;
  formatLabel: (d: T) => string;
  barColor: string;
  label: string;
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
  const values = data.map((d) => getValue(d) ?? 0);
  const maxVal = Math.max(...values, 0.01);

  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <div className="flex items-end gap-1 h-28">
        {data.map((d) => {
          const val = getValue(d);
          const height = val ? (val / maxVal) * 100 : 0;
          return (
            <div
              key={getKey(d)}
              className="flex-1 flex flex-col items-center gap-1 min-w-0"
            >
              <div className="w-full flex flex-col items-center justify-end h-24">
                {val ? (
                  <div
                    className={`w-full ${barColor} rounded-t min-h-[4px]`}
                    style={{ height: `${Math.max(height, 4)}%` }}
                    title={`${formatLabel(d)}: ${formatValue(val)}`}
                  />
                ) : (
                  <div className="w-full bg-gray-200 dark:bg-zinc-700 rounded-t h-[4px]" />
                )}
              </div>
              <span className="text-[10px] text-muted-foreground truncate w-full text-center">
                {formatLabel(d)}
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
