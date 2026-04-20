import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });

  const permissionCols = Object.fromEntries(programs.map((p) => [p.name, 0]));

  const rows = [
    {
      지사명: "예시지사",
      지역: "서울",
      상태: "active",
      담당자: "홍길동",
      연락처: "010-0000-0000",
      주소: "서울시 강남구",
      메모: "",
      ...permissionCols,
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "branches");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="branches_template.xlsx"',
    },
  });
}
