"use client";

import {
  Bar,
  BarChart,
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";

type ProgramBar = { name: string; quantity: number };
type MonthlyLine = { yearMonth: string; quantity: number };

export function DashboardCharts({
  programBars,
  monthlyLine,
}: {
  programBars: ProgramBar[];
  monthlyLine: MonthlyLine[];
}) {
  const maxQuantity = Math.max(...monthlyLine.map((d) => d.quantity), 0);
  const maxTick = Math.ceil(maxQuantity / 500) * 500 || 500;
  const yTicks = Array.from({ length: maxTick / 500 + 1 }, (_, i) => i * 500);

  return (
    <div className="grid grid-cols-1 gap-4">
      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">프로그램별 판매 부수</h3>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={288}>
            <BarChart data={programBars} barCategoryGap="33%">
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="quantity" fill="#0f172a" radius={[6, 6, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-4">
        <h3 className="mb-3 text-sm font-semibold text-slate-800">월별 판매 부수 추이</h3>
        <div className="w-full">
          <ResponsiveContainer width="100%" height={288}>
            <LineChart data={monthlyLine}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="yearMonth" />
              <YAxis domain={[0, maxTick]} ticks={yTicks} />
              <Tooltip />
              <Line
                dataKey="quantity"
                type="monotone"
                stroke="#0f172a"
                strokeWidth={2}
                dot={{ r: 3 }}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </section>
    </div>
  );
}
