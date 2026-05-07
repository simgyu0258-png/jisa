export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });
  const programNames = programs.map((p) => p.name).join(",");
  const today = new Date().toISOString().slice(0, 10);

  const rows = [
    { "지사명": "서울중앙지사", "기관명": "한빛초등학교", "프로그램": programs[0]?.name ?? "", "호": 1, "주문일": today, "부수": 30 },
    { "지사명": "",             "기관명": "",              "프로그램": programs[0]?.name ?? "", "호": 2, "주문일": today, "부수": 25 },
    { "지사명": "",             "기관명": "푸른초등학교",   "프로그램": programs[0]?.name ?? "", "호": 1, "주문일": today, "부수": 20 },
    { "지사명": "부산지사",     "기관명": "해운대초등학교", "프로그램": programs[1]?.name ?? "", "호": 1, "주문일": today, "부수": 15 },
  ];

  const ws = XLSX.utils.json_to_sheet(rows);

  (ws as Record<string, unknown>)["!datavalidation"] = [
    { sqref: "C2:C10000", type: "list", formula1: `"${programNames}"` },
  ];

  ws["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 16 }, { wch: 6 }, { wch: 12 }, { wch: 8 },
  ];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "sales");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sales_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
