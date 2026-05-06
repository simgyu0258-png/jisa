export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export async function GET() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });

  const permissionCols = Object.fromEntries(programs.map((p) => [p.name, "X"]));

  const rows = [
    {
      "지사명*": "예시지사A",
      "지역*": "서울",
      "지사 담당자*": "홍길동",
      "지사 연락처*": "010-0000-0000",
      "지사 주소": "서울시 강남구",
      "기관명": "한빛초등학교",
      "기관 연락처": "02-111-1111",
      "기관 주소": "서울시 강남구 테헤란로 1",
      ...permissionCols,
      "메모": "",
    },
    {
      "지사명*": "",
      "지역*": "",
      "지사 담당자*": "",
      "지사 연락처*": "",
      "지사 주소": "",
      "기관명": "푸른초등학교",
      "기관 연락처": "",
      "기관 주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, ""])),
      "메모": "",
    },
    {
      "지사명*": "",
      "지역*": "",
      "지사 담당자*": "",
      "지사 연락처*": "",
      "지사 주소": "",
      "기관명": "별빛초등학교",
      "기관 연락처": "",
      "기관 주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, ""])),
      "메모": "",
    },
    {
      "지사명*": "예시지사B",
      "지역*": "부산",
      "지사 담당자*": "김영희",
      "지사 연락처*": "010-1111-2222",
      "지사 주소": "",
      "기관명": "해운대초등학교",
      "기관 연락처": "",
      "기관 주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, "X"])),
      "메모": "",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 프로그램 컬럼 드롭다운 O/X (인덱스 8부터: A~H가 고정 8컬럼)
  const programValidations = programs.map((_, idx) => ({
    sqref: `${XLSX.utils.encode_col(8 + idx)}2:${XLSX.utils.encode_col(8 + idx)}1000`,
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
