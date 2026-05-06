export const dynamic = "force-dynamic";

import { DashboardCharts } from "@/components/dashboard-charts";
import { getCurrentYearMonth, getPreviousYearMonth, getSameMonthLastYear, getRecentMonths } from "@/lib/month";
import { prisma } from "@/lib/prisma";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

export default async function HomePage() {
  const currentMonth = getCurrentYearMonth();
  const previousMonth = getPreviousYearMonth(currentMonth);
  const sameMonthLastYear = getSameMonthLastYear(currentMonth);
  const recentMonths = getRecentMonths(12);

  const [programs, currentByProgram, currentTotal, previousTotal, lastYearTotal, allRecent, byIssue] =
    await Promise.all([
      prisma.program.findMany({ orderBy: { id: "asc" } }),
      prisma.saleOrder.groupBy({
        by: ["programId"],
        where: { orderDate: { startsWith: currentMonth } },
        _sum: { quantity: true },
      }),
      prisma.saleOrder.aggregate({
        where: { orderDate: { startsWith: currentMonth } },
        _sum: { quantity: true },
      }),
      prisma.saleOrder.aggregate({
        where: { orderDate: { startsWith: previousMonth } },
        _sum: { quantity: true },
      }),
      prisma.saleOrder.aggregate({
        where: { orderDate: { startsWith: sameMonthLastYear } },
        _sum: { quantity: true },
      }),
      prisma.saleOrder.findMany({
        where: { orderDate: { gte: `${recentMonths[0]}-01` } },
        select: { orderDate: true, quantity: true },
      }),
      prisma.saleOrder.groupBy({
        by: ["issueNumber"],
        _sum: { quantity: true },
        orderBy: { issueNumber: "asc" },
      }),
    ]);

  const totalCurrent = currentTotal._sum.quantity ?? 0;
  const totalPrevious = previousTotal._sum.quantity ?? 0;
  const totalLastYear = lastYearTotal._sum.quantity ?? 0;
  const change = percentChange(totalCurrent, totalPrevious);
  const yoyChange = percentChange(totalCurrent, totalLastYear);

  const programBars = programs.map((p) => ({
    name: p.name,
    quantity: currentByProgram.find((x) => x.programId === p.id)?._sum.quantity ?? 0,
  }));

  const issueBars = byIssue.map((x) => ({
    issue: `${x.issueNumber}호`,
    quantity: x._sum.quantity ?? 0,
  }));

  // 월별 집계: orderDate에서 YYYY-MM 추출
  const monthlyMap = new Map<string, number>();
  for (const o of allRecent) {
    const ym = o.orderDate.slice(0, 7);
    monthlyMap.set(ym, (monthlyMap.get(ym) ?? 0) + o.quantity);
  }

  const monthlyLine = recentMonths.map((month) => ({
    yearMonth: month,
    quantity: monthlyMap.get(month) ?? 0,
  }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">대시보드</h1>
      <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <article className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-500">이번 달 총 판매 부수 ({currentMonth})</div>
          <div className="mt-3 text-4xl font-bold">{totalCurrent.toLocaleString()}</div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-500">전월 대비 증감률 ({previousMonth} 대비)</div>
          <div className={`mt-3 text-4xl font-bold ${change >= 0 ? "text-rose-600" : "text-blue-600"}`}>
            {change >= 0 ? "+" : ""}{change.toFixed(1)}%
          </div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-6">
          <div className="text-sm text-slate-500">전년 동월 대비 증감률 ({sameMonthLastYear} 대비)</div>
          <div className={`mt-3 text-4xl font-bold ${yoyChange >= 0 ? "text-rose-600" : "text-blue-600"}`}>
            {yoyChange >= 0 ? "+" : ""}{yoyChange.toFixed(1)}%
          </div>
        </article>
      </section>
      <DashboardCharts monthlyLine={monthlyLine} programBars={programBars} issueBars={issueBars} />
    </div>
  );
}
