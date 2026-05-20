export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });

  const permissionCols = Object.fromEntries(programs.map((p) => [p.name, "X"]));
  const emptyPermissionCols = Object.fromEntries(programs.map((p) => [p.name, ""]));

  const rows = [
    {
      "지사명*": "예시지사A",
      "별칭": "",
      "지역*": "서울",
      "지사 담당자*": "홍길동",
      "지사 연락처*": "010-0000-0000",
      "지사 주소": "서울시 강남구",
      ...permissionCols,
      "메모": "",
    },
    {
      "지사명*": "예시지사A",
      "별칭": "서울교육주식회사",
      "지역*": "",
      "지사 담당자*": "",
      "지사 연락처*": "",
      "지사 주소": "",
      ...emptyPermissionCols,
      "메모": "",
    },
    {
      "지사명*": "예시지사A",
      "별칭": "서울학습센터",
      "지역*": "",
      "지사 담당자*": "",
      "지사 연락처*": "",
      "지사 주소": "",
      ...emptyPermissionCols,
      "메모": "",
    },
    {
      "지사명*": "예시지사B",
      "별칭": "",
      "지역*": "부산",
      "지사 담당자*": "김영희",
      "지사 연락처*": "010-1111-2222",
      "지사 주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, "X"])),
      "메모": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 프로그램 컬럼 드롭다운 (지사명*,별칭,지역*,지사담당자*,지사연락처*,지사주소 = 6컬럼 → 프로그램은 인덱스 6부터)
  const programValidations = programs.map((_, idx) => ({
    sqref: `${XLSX.utils.encode_col(6 + idx)}2:${XLSX.utils.encode_col(6 + idx)}1000`,
    type: "list" as const,
    formula1: '"O,X"',
  }));

  (worksheet as Record<string, unknown>)["!datavalidation"] = programValidations;

  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "branches");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="branches_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
