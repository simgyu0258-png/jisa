export const dynamic = "force-dynamic";

import { DashboardCharts } from "@/components/dashboard-charts";
import { getCurrentYearMonth, getPreviousYearMonth, getSameMonthLastYear, getRecentMonths, getCurrentFiscalYear, getFiscalYearRange, getCurrentFiscalIssue, getIssueAwareDateWhere } from "@/lib/month";
import { DashboardSummaryCards } from "@/components/dashboard-summary-cards";
import { prisma } from "@/lib/prisma";

function percentChange(current: number, previous: number) {
  if (previous === 0) return current === 0 ? 0 : 100;
  return ((current - previous) / previous) * 100;
}

type OoContract = { classCount: number; startDate: string; endDate: string | null };

function ooActiveClasses(contracts: OoContract[], yearMonth: string): number {
  const first = `${yearMonth}-01`;
  const last = `${yearMonth}-31`;
  return contracts
    .filter(c => c.startDate <= last && (c.endDate === null || c.endDate >= first))
    .reduce((s, c) => s + c.classCount, 0);
}

function issueToYM(issue: number, fiscalYear: number): string {
  const month = issue + 2;
  if (month <= 12) return `${fiscalYear}-${String(month).padStart(2, "0")}`;
  return `${fiscalYear + 1}-${String(month - 12).padStart(2, "0")}`;
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

  const today = new Date().toISOString().slice(0, 10);

  const [programs, currentByProgram, currentTotal, previousTotal, lastYearTotal, allRecent, byIssue,
    yearTargets, yearOrders, branches, activePermissions,
    ooTargets, allOoContracts,
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
        where: getIssueAwareDateWhere(currentYear),
        _sum: { quantity: true },
        orderBy: { issueNumber: "asc" },
      }),
      prisma.salesTarget.findMany({ where: { year: currentYear } }),
      prisma.saleOrder.findMany({
        where: { orderDate: { gte: fyGte, lt: fyLt }, program: { isOnlyOne: false } },
        select: { quantity: true, institution: { select: { branchId: true } } },
      }),
      prisma.branch.findMany({ select: { id: true, name: true } }),
      prisma.branchProgramPermission.findMany({ where: { isEnabled: true }, select: { branchId: true, programId: true } }),
      prisma.onlyOneTarget.findMany({ where: { year: currentYear } }),
      prisma.onlyOneContract.findMany({
        select: { classCount: true, startDate: true, endDate: true },
      }),
      prisma.saleOrder.aggregate({ where: { issueNumber: currentIssue, orderDate: { gte: fyGte, lt: fyLt } }, _sum: { quantity: true } }),
      prevIssue > 0 ? prisma.saleOrder.aggregate({ where: { issueNumber: prevIssue, orderDate: { gte: fyGte, lt: fyLt } }, _sum: { quantity: true } }) : Promise.resolve({ _sum: { quantity: 0 } }),
      prisma.saleOrder.aggregate({ where: { issueNumber: currentIssue, orderDate: { gte: prevFyGte, lt: prevFyLt } }, _sum: { quantity: true } }),
    ]);

  // 월별 카드 (온리원 포함)
  const totalCurrent = (currentTotal._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, currentMonth);
  const totalPrevious = (previousTotal._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, previousMonth);
  const totalLastYear = (lastYearTotal._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, sameMonthLastYear);

  // 프로그램별 막대 (온리원 포함)
  const ooCurrentClasses = ooActiveClasses(allOoContracts, currentMonth);
  const onlyOneProgram = programs.find(p => p.isOnlyOne);
  const programBars = [
    ...programs.filter(p => !p.isOnlyOne).map((p) => ({
      name: p.name,
      quantity: currentByProgram.find((x) => x.programId === p.id)?._sum.quantity ?? 0,
    })),
    ...(onlyOneProgram ? [{ name: onlyOneProgram.name, quantity: ooCurrentClasses }] : []),
  ];

  // 호별 막대 (기존 SaleOrder 기반 유지, 온리원은 호 개념 없음)
  const issueBars = byIssue.map((x) => ({
    issue: `${x.issueNumber}호`,
    quantity: x._sum?.quantity ?? 0,
  }));

  // 월별 추이 차트 (온리원 포함)
  const monthlyMap = new Map<string, number>();
  for (const o of allRecent) {
    const ym = o.orderDate.slice(0, 7);
    monthlyMap.set(ym, (monthlyMap.get(ym) ?? 0) + o.quantity);
  }
  const monthlyLine = recentMonths.map((month) => ({
    yearMonth: month,
    quantity: (monthlyMap.get(month) ?? 0) + ooActiveClasses(allOoContracts, month),
  }));

  // 호 현황 카드 (온리원 포함 — 호 = 월이므로 해당 월의 활성 클래스 수 합산)
  const currentIssueYM = issueToYM(currentIssue, currentYear);
  const prevIssueYM = prevIssue > 0 ? issueToYM(prevIssue, currentYear) : null;
  const prevFyCurrentIssueYM = issueToYM(currentIssue, currentYear - 1);

  const currentIssueCombined = (currentIssueTotal._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, currentIssueYM);
  const prevIssueCombined = prevIssueYM
    ? (prevIssueTotal._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, prevIssueYM)
    : 0;
  const sameIssueLastYearCombined = (sameIssueLastYear._sum.quantity ?? 0) + ooActiveClasses(allOoContracts, prevFyCurrentIssueYM);

  // 목표 달성 현황 (일반 프로그램 + 온리원)
  const permSet = new Set(activePermissions.map((p) => `${p.branchId}-${p.programId}`));
  const validTargets = yearTargets.filter((t) => permSet.has(`${t.branchId}-${t.programId}`));

  // 현재 활성 온리원 계약 (목표 달성 실적용)
  const currentActiveOo = await prisma.onlyOneContract.findMany({
    where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
    select: { classCount: true, institution: { select: { branchId: true } } },
  });
  const ooActualMap = new Map<number, number>();
  for (const c of currentActiveOo) {
    const bid = c.institution.branchId;
    ooActualMap.set(bid, (ooActualMap.get(bid) ?? 0) + c.classCount);
  }

  const branchesWithTarget = new Set([
    ...validTargets.filter((t) => t.quantity > 0).map((t) => t.branchId),
    ...ooTargets.filter((t) => t.classCount > 0).map((t) => t.branchId),
  ]);
  const totalTarget = validTargets.reduce((s, t) => s + t.quantity, 0)
    + ooTargets.reduce((s, t) => s + t.classCount, 0);
  const totalYearActual = yearOrders
    .filter((o) => branchesWithTarget.has(o.institution.branchId))
    .reduce((s, o) => s + o.quantity, 0)
    + [...ooActualMap.entries()]
      .filter(([bid]) => branchesWithTarget.has(bid))
      .reduce((s, [, v]) => s + v, 0);
  const totalAchievement = totalTarget > 0 ? (totalYearActual / totalTarget) * 100 : null;

  const targetByBranch = new Map<number, number>();
  for (const t of validTargets) targetByBranch.set(t.branchId, (targetByBranch.get(t.branchId) ?? 0) + t.quantity);
  for (const t of ooTargets) targetByBranch.set(t.branchId, (targetByBranch.get(t.branchId) ?? 0) + t.classCount);

  const actualByBranch = new Map<number, number>();
  for (const o of yearOrders) {
    const bid = o.institution.branchId;
    if (!branchesWithTarget.has(bid)) continue;
    actualByBranch.set(bid, (actualByBranch.get(bid) ?? 0) + o.quantity);
  }
  for (const [bid, classes] of ooActualMap) {
    if (!branchesWithTarget.has(bid)) continue;
    actualByBranch.set(bid, (actualByBranch.get(bid) ?? 0) + classes);
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
          current: currentIssueCombined,
          prevChange: prevIssue > 0 ? percentChange(currentIssueCombined, prevIssueCombined) : null,
          yoyChange: percentChange(currentIssueCombined, sameIssueLastYearCombined),
        }}
      />
      <DashboardCharts monthlyLine={monthlyLine} programBars={programBars} issueBars={issueBars} currentMonth={currentMonth} />
    </div>
  );
}
