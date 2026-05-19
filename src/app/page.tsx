export const dynamic = "force-dynamic";

import { DashboardCharts } from "@/components/dashboard-charts";
import { getCurrentYearMonth, getPreviousYearMonth, getSameMonthLastYear, getRecentMonths, getCurrentFiscalYear, getFiscalYearRange, getCurrentFiscalIssue } from "@/lib/month";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
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

  const currentYear = getCurrentFiscalYear();
  const { gte: fyGte, lt: fyLt } = getFiscalYearRange(currentYear);
  const { gte: prevFyGte, lt: prevFyLt } = getFiscalYearRange(currentYear - 1);
  const currentIssue = getCurrentFiscalIssue();
  const prevIssue = currentIssue - 1;

  const [programs, currentByProgram, currentTotal, previousTotal, lastYearTotal, allRecent, byIssue,
    yearTargets, yearOrders, branches, activePermissions,
    currentIssueTotal, prevIssueTotal, sameIssueLastYear] =
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
        where: { orderDate: { gte: fyGte, lt: fyLt } },
        select: { quantity: true, institution: { select: { branchId: true } } },
      }),
      prisma.branch.findMany({ select: { id: true, name: true } }),
      prisma.branchProgramPermission.findMany({ where: { isEnabled: true }, select: { branchId: true, programId: true } }),
      prisma.saleOrder.aggregate({ where: { issueNumber: currentIssue, orderDate: { gte: fyGte, lt: fyLt } }, _sum: { quantity: true } }),
      prevIssue > 0 ? prisma.saleOrder.aggregate({ where: { issueNumber: prevIssue, orderDate: { gte: fyGte, lt: fyLt } }, _sum: { quantity: true } }) : Promise.resolve({ _sum: { quantity: 0 } }),
      prisma.saleOrder.aggregate({ where: { issueNumber: currentIssue, orderDate: { gte: prevFyGte, lt: prevFyLt } }, _sum: { quantity: true } }),
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

  // 현재 권한 기준 필터링
  const permSet = new Set(activePermissions.map((p) => `${p.branchId}-${p.programId}`));
  const validTargets = yearTargets.filter((t) => permSet.has(`${t.branchId}-${t.programId}`));

  // 목표 달성 현황 (권한 있고 목표가 있는 지사만)
  const branchesWithTarget = new Set(
    validTargets.filter((t) => t.quantity > 0).map((t) => t.branchId)
  );
  const totalTarget = validTargets.reduce((s, t) => s + t.quantity, 0);
  const totalYearActual = yearOrders
    .filter((o) => branchesWithTarget.has(o.institution.branchId))
    .reduce((s, o) => s + o.quantity, 0);
  const totalAchievement = totalTarget > 0 ? (totalYearActual / totalTarget) * 100 : null;

  // 지사별 달성률 (목표가 있는 지사만)
  const targetByBranch = new Map<number, number>();
  for (const t of validTargets) {
    targetByBranch.set(t.branchId, (targetByBranch.get(t.branchId) ?? 0) + t.quantity);
  }
  const actualByBranch = new Map<number, number>();
  for (const o of yearOrders) {
    const bid = o.institution.branchId;
    if (!branchesWithTarget.has(bid)) continue;
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

      <DashboardSummaryCards
        monthly={{
          current: totalCurrent,
          change: percentChange(totalCurrent, totalPrevious),
          yoyChange: percentChange(totalCurrent, totalLastYear),
          currentMonth,
          previousMonth,
          sameMonthLastYear,
        }}
        issue={{
          currentIssue,
          current: currentIssueTotal._sum.quantity ?? 0,
          prevChange: prevIssue > 0 ? percentChange(currentIssueTotal._sum.quantity ?? 0, prevIssueTotal._sum.quantity ?? 0) : null,
          yoyChange: percentChange(currentIssueTotal._sum.quantity ?? 0, sameIssueLastYear._sum.quantity ?? 0),
        }}
      />
      <DashboardCharts monthlyLine={monthlyLine} programBars={programBars} issueBars={issueBars} currentMonth={currentMonth} />
    </div>
  );
}
