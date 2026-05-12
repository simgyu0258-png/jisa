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

  const currentYear = new Date().getFullYear();

  const [programs, currentByProgram, currentTotal, previousTotal, lastYearTotal, allRecent, byIssue,
    yearTargets, yearOrders, branches] =
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
      prisma.salesTarget.findMany({ where: { year: currentYear } }),
      prisma.saleOrder.findMany({
        where: { orderDate: { gte: `${currentYear}-01-01`, lte: `${currentYear}-12-31` } },
        select: { quantity: true, institution: { select: { branchId: true } } },
      }),
      prisma.branch.findMany({ select: { id: true, name: true } }),
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

  // 목표 달성 현황
  const totalTarget = yearTargets.reduce((s, t) => s + t.quantity, 0);
  const totalYearActual = yearOrders.reduce((s, o) => s + o.quantity, 0);
  const totalAchievement = totalTarget > 0 ? (totalYearActual / totalTarget) * 100 : null;

  // 지사별 달성률 (목표가 있는 지사만)
  const targetByBranch = new Map<number, number>();
  for (const t of yearTargets) {
    targetByBranch.set(t.branchId, (targetByBranch.get(t.branchId) ?? 0) + t.quantity);
  }
  const actualByBranch = new Map<number, number>();
  for (const o of yearOrders) {
    const bid = o.institution.branchId;
    actualByBranch.set(bid, (actualByBranch.get(bid) ?? 0) + o.quantity);
  }
  const branchRanking = branches
    .map((b) => {
      const target = targetByBranch.get(b.id) ?? 0;
      const actual = actualByBranch.get(b.id) ?? 0;
      return { name: b.name, target, actual, rate: target > 0 ? (actual / target) * 100 : null };
    })
    .filter((b) => b.target > 0)
    .sort((a, b) => (b.rate ?? 0) - (a.rate ?? 0));

  const top3 = branchRanking.slice(0, 3);
  const bottom3 = branchRanking.length > 3 ? branchRanking.slice(-3).reverse() : [];

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

      {totalTarget > 0 && (
        <>
          <h2 className="text-lg font-semibold">{currentYear}년 목표 달성 현황</h2>
          <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">올해 목표 합계</div>
              <div className="mt-3 text-4xl font-bold">{totalTarget.toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-400">부</div>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">현재 실적 (연간 누계)</div>
              <div className="mt-3 text-4xl font-bold">{totalYearActual.toLocaleString()}</div>
              <div className="mt-1 text-xs text-slate-400">부</div>
            </article>
            <article className="rounded-lg border border-slate-200 bg-white p-6">
              <div className="text-sm text-slate-500">달성률</div>
              <div className={`mt-3 text-4xl font-bold ${(totalAchievement ?? 0) >= 100 ? "text-emerald-600" : (totalAchievement ?? 0) >= 50 ? "text-amber-500" : "text-rose-600"}`}>
                {totalAchievement?.toFixed(1) ?? "-"}%
              </div>
              <div className="mt-2 h-2 rounded-full bg-slate-100">
                <div
                  className={`h-2 rounded-full ${(totalAchievement ?? 0) >= 100 ? "bg-emerald-500" : (totalAchievement ?? 0) >= 50 ? "bg-amber-400" : "bg-rose-500"}`}
                  style={{ width: `${Math.min(totalAchievement ?? 0, 100)}%` }}
                />
              </div>
            </article>
          </section>

          {(top3.length > 0 || bottom3.length > 0) && (
            <section className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {top3.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">달성률 상위 지사</h3>
                  <ul className="space-y-2">
                    {top3.map((b, i) => (
                      <li key={b.name} className="flex items-center gap-3 text-sm">
                        <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                        <span className="flex-1 font-medium">{b.name}</span>
                        <span className="text-slate-500">{b.actual.toLocaleString()} / {b.target.toLocaleString()}</span>
                        <span className="w-16 text-right font-semibold text-emerald-600">{b.rate?.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
              {bottom3.length > 0 && (
                <div className="rounded-lg border border-slate-200 bg-white p-5">
                  <h3 className="mb-3 text-sm font-semibold text-slate-700">달성률 하위 지사</h3>
                  <ul className="space-y-2">
                    {bottom3.map((b, i) => (
                      <li key={b.name} className="flex items-center gap-3 text-sm">
                        <span className="w-5 text-center font-bold text-slate-400">{i + 1}</span>
                        <span className="flex-1 font-medium">{b.name}</span>
                        <span className="text-slate-500">{b.actual.toLocaleString()} / {b.target.toLocaleString()}</span>
                        <span className="w-16 text-right font-semibold text-rose-600">{b.rate?.toFixed(1)}%</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          )}
        </>
      )}
    </div>
  );
}
