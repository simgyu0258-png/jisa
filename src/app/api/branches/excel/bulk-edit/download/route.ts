import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const [branches, programs] = await Promise.all([
    prisma.branch.findMany({
      include: { permissions: true },
      orderBy: { branchCode: "asc" },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const rows = branches.map((branch) => {
    const permMap = new Map(branch.permissions.map((p) => [p.programId, p.isEnabled]));
    const permCols = Object.fromEntries(programs.map((p) => [p.name, permMap.get(p.id) ? 1 : 0]));
    return {
      지사코드: branch.branchCode,
      지사명: branch.name,
      지역: branch.region,
      상태: branch.status,
      담당자: branch.managerName,
      연락처: branch.phone,
      주소: branch.address ?? "",
      메모: branch.memo ?? "",
      ...permCols,
    };
  });

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "branches");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="branches_bulk_edit.xlsx"',
    },
  });
}
