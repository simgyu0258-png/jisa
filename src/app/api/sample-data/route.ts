import { NextResponse } from "next/server";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const currentMonth = getCurrentYearMonth();

  const [branches, orders] = await Promise.all([
    prisma.branch.findMany({
      include: { permissions: true, institutions: true },
      orderBy: { branchCode: "asc" },
    }),
    prisma.saleOrder.findMany({
      where: { orderDate: { startsWith: currentMonth } },
      select: { institution: { select: { branchId: true } }, quantity: true },
    }),
  ]);

  const branchTotals = new Map<number, number>();
  for (const o of orders) {
    const bid = o.institution.branchId;
    branchTotals.set(bid, (branchTotals.get(bid) ?? 0) + o.quantity);
  }

  const rows = branches.map((b) => ({
    branchCode: b.branchCode,
    name: b.name,
    region: b.region,
    status: b.status,
    managerName: b.managerName,
    phone: b.phone,
    enabledPrograms: b.permissions.filter((p) => p.isEnabled).length,
    institutionCount: b.institutions.length,
    monthTotal: branchTotals.get(b.id) ?? 0,
  }));

  return NextResponse.json({
    yearMonth: currentMonth,
    totalBranches: rows.length,
    totalMonthQuantity: rows.reduce((sum, r) => sum + r.monthTotal, 0),
    rows,
  });
}
