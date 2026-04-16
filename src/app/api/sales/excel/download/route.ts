import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const yearMonth = url.searchParams.get("yearMonth") ?? getCurrentYearMonth();

  const [branches, programs] = await Promise.all([
    prisma.branch.findMany({
      include: {
        sales: { where: { yearMonth } },
      },
      orderBy: { name: "asc" },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const rows = branches.map((branch) => {
    const map = new Map(branch.sales.map((sale) => [sale.programId, sale.quantity]));
    const row: Record<string, string | number> = {
      branch_code: branch.branchCode,
      year_month: yearMonth,
    };
    programs.forEach((program, index) => {
      row[`program${index + 1}`] = map.get(program.id) ?? 0;
    });
    return row;
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "sales");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type":
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales_${yearMonth}.xlsx"`,
    },
  });
}
