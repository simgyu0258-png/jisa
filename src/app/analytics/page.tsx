import { prisma } from "@/lib/prisma";
import { AnalyticsClient } from "./analytics-client";

export default async function AnalyticsPage() {
  const [branches, programs, saleOrders, institutions, oldestOrder] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.saleOrder.findMany({
      select: { institutionId: true, programId: true, issueNumber: true, orderDate: true, quantity: true },
    }),
    prisma.institution.findMany({ select: { id: true, branchId: true } }),
    prisma.saleOrder.findFirst({ orderBy: { orderDate: "asc" }, select: { orderDate: true } }),
  ]);

  const currentYear = new Date().getFullYear();
  const minYear = oldestOrder ? Number(oldestOrder.orderDate.slice(0, 4)) : currentYear;

  const instBranchMap = new Map(institutions.map((i) => [i.id, i.branchId]));

  // 월별 집계: branchId | programId | YYYY-MM → qty
  const mMap = new Map<string, number>();
  for (const o of saleOrders) {
    const bid = instBranchMap.get(o.institutionId);
    if (!bid) continue;
    const k = `${bid}|${o.programId}|${o.orderDate.slice(0, 7)}`;
    mMap.set(k, (mMap.get(k) ?? 0) + o.quantity);
  }
  const monthlyAgg = [...mMap.entries()].map(([k, qty]) => {
    const [b, p, ym] = k.split("|");
    return { branchId: +b, programId: +p, ym, qty };
  });

  // 호별 집계: branchId | programId | issueNumber | year → qty
  const iMap = new Map<string, number>();
  for (const o of saleOrders) {
    const bid = instBranchMap.get(o.institutionId);
    if (!bid) continue;
    const k = `${bid}|${o.programId}|${o.issueNumber}|${o.orderDate.slice(0, 4)}`;
    iMap.set(k, (iMap.get(k) ?? 0) + o.quantity);
  }
  const issueAgg = [...iMap.entries()].map(([k, qty]) => {
    const [b, p, n, y] = k.split("|");
    return { branchId: +b, programId: +p, issueNumber: +n, year: y, qty };
  });

  return (
    <AnalyticsClient
      branches={branches}
      programs={programs}
      monthlyAgg={monthlyAgg}
      issueAgg={issueAgg}
      minYear={minYear}
    />
  );
}
