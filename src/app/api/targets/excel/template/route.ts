export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({
    where: { isOnlyOne: false },
    orderBy: { id: "asc" },
  });

  const headers: Record<string, unknown> = { "지사명": "예시지사A" };
  for (const p of programs) headers[p.name] = 100;
  headers["온리원"] = 30;

  const ws = XLSX.utils.json_to_sheet([headers]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "targets");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="targets_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
