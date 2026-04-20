import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearMonths = url.searchParams.getAll("yearMonth");
  const selectedMonths = yearMonths.length > 0 ? yearMonths : [getCurrentYearMonth()];

  const [branches, programs] = await Promise.all([
    prisma.branch.findMany({
      include: {
        sales: { where: { yearMonth: { in: selectedMonths } } },
      },
      orderBy: { branchCode: "asc" },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const rows: Record<string, string | number>[] = [];
  for (const branch of branches) {
    for (const yearMonth of selectedMonths) {
      const row: Record<string, string | number> = {
        지사명: branch.name,
        연월: yearMonth,
      };
      for (const program of programs) {
        const sale = branch.sales.find((s) => s.yearMonth === yearMonth && s.programId === program.id);
        row[program.name] = sale?.quantity ?? 0;
      }
      rows.push(row);
    }
  }

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "sales");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  const fileLabel = selectedMonths.length === 1 ? selectedMonths[0] : `${selectedMonths[0]}_${selectedMonths[selectedMonths.length - 1]}`;

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales_${fileLabel}.xlsx"`,
    },
  });
}
