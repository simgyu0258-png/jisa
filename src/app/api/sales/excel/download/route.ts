export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const orders = await prisma.saleOrder.findMany({
    include: {
      institution: { include: { branch: { select: { name: true } } } },
      program: { select: { name: true } },
    },
    orderBy: [
      { institution: { branch: { name: "asc" } } },
      { institution: { name: "asc" } },
      { programId: "asc" },
      { issueNumber: "asc" },
    ],
  });

  const rows = orders.map((o) => ({
    "지사명": o.institution.branch.name,
    "기관명": o.institution.name,
    "프로그램": o.program.name,
    "호": o.issueNumber,
    "주문일": o.orderDate,
    "부수": o.quantity,
  }));

  const ws = XLSX.utils.json_to_sheet(rows.length > 0 ? rows : [
    { "지사명": "", "기관명": "", "프로그램": "", "호": "", "주문일": "", "부수": "" },
  ]);

  ws["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 6 }, { wch: 12 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sales");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sales_data.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
