import { NextResponse } from "next/server";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const yearMonth = getCurrentYearMonth();

  const branches = await prisma.branch.findMany({
    include: {
      permissions: true,
      sales: {
        where: { yearMonth },
      },
    },
    orderBy: { branchCode: "asc" },
  });

  const rows = branches.map((branch) => ({
    branchCode: branch.branchCode,
    name: branch.name,
    region: branch.region,
    status: branch.status,
    managerName: branch.managerName,
    phone: branch.phone,
    enabledPrograms: branch.permissions.filter((permission) => permission.isEnabled).length,
    monthTotal: branch.sales.reduce((sum, sale) => sum + sale.quantity, 0),
  }));

  return NextResponse.json({
    yearMonth,
    totalBranches: rows.length,
    totalMonthQuantity: rows.reduce((sum, row) => sum + row.monthTotal, 0),
    rows,
  });
}
