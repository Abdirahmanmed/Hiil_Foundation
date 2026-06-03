import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  PieChart,
  Pie,
  Cell,
} from "recharts";

import { chartHasData } from "./chartUtils";

const COLORS = ["#059669", "#10b981", "#34d399", "#f59e0b", "#ef4444", "#6366f1"];

function cleanData(data) {
  return (data || [])
    .map((item) => ({
      ...item,
      name: item?.name ?? item?.status ?? "-",
      value: Number(item?.value ?? item?.count ?? item?.amount ?? 0),
    }))
    .filter((item) => item.value > 0);
}

export function EmptyChartState({ message = "Aucune donnée disponible" }) {
  return (
    <div className="flex h-full min-h-48 items-center justify-center rounded-2xl border border-dashed border-emerald-200 bg-white/70 px-4 py-8 text-center text-sm font-semibold text-slate-500">
      {message}
    </div>
  );
}

function ChartCard({ title, children }) {
  return (
    <div className="rounded-2xl border border-emerald-100 bg-emerald-50/40 p-4">
      <div className="text-xs font-black text-slate-600">{title}</div>
      <div className="mt-3 h-64 min-w-0">{children}</div>
    </div>
  );
}

export function SimpleBarChart({ title, data, emptyMessage }) {
  const safeData = cleanData(data);
  const hasData = chartHasData(safeData);

  return (
    <ChartCard title={title}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={safeData} margin={{ top: 8, right: 8, left: -16, bottom: 8 }}>
            <XAxis dataKey="name" tick={{ fill: "rgba(15,23,42,0.65)", fontSize: 11 }} />
            <YAxis allowDecimals={false} tick={{ fill: "rgba(15,23,42,0.65)", fontSize: 11 }} />
            <Tooltip />
            <Bar dataKey="value" fill="#059669" radius={[8, 8, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState message={emptyMessage} />
      )}
    </ChartCard>
  );
}

export function SimplePieChart({ title, data, emptyMessage }) {
  const safeData = cleanData(data);
  const hasData = chartHasData(safeData);

  return (
    <ChartCard title={title}>
      {hasData ? (
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie data={safeData} dataKey="value" nameKey="name" outerRadius="80%" label>
              {safeData.map((entry, index) => (
                <Cell key={entry.name} fill={COLORS[index % COLORS.length]} />
              ))}
            </Pie>
            <Tooltip />
          </PieChart>
        </ResponsiveContainer>
      ) : (
        <EmptyChartState message={emptyMessage} />
      )}
    </ChartCard>
  );
}
