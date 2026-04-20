import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });
  const yearMonth = getCurrentYearMonth();

  const row: Record<string, string | number> = {
    지사명: "예시지사",
    연월: yearMonth,
  };
  for (const program of programs) {
    row[program.name] = 0;
  }

  const worksheet = XLSX.utils.json_to_sheet([row]);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "sales");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="sales_template.xlsx"',
    },
  });
}
