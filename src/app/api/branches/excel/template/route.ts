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
      "상태": "활성",
      "담당자*": "홍길동",
      "연락처*": "010-0000-0000",
      "주소": "서울시 강남구",
      ...permissionCols,
      "메모": "",
      "기관명": "한빛초등학교",
    },
    {
      "지사명*": "",
      "지역*": "",
      "상태": "",
      "담당자*": "",
      "연락처*": "",
      "주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, ""])),
      "메모": "",
      "기관명": "푸른초등학교",
    },
    {
      "지사명*": "",
      "지역*": "",
      "상태": "",
      "담당자*": "",
      "연락처*": "",
      "주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, ""])),
      "메모": "",
      "기관명": "별빛초등학교",
    },
    {
      "지사명*": "예시지사B",
      "지역*": "부산",
      "상태": "활성",
      "담당자*": "김영희",
      "연락처*": "010-1111-2222",
      "주소": "",
      ...Object.fromEntries(programs.map((p) => [p.name, "X"])),
      "메모": "",
      "기관명": "해운대초등학교",
    },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);

  // 상태 컬럼(C) 드롭다운: 활성/비활성
  const statusColLetter = XLSX.utils.encode_col(2); // C
  // 프로그램 컬럼 드롭다운: O/X (인덱스 6부터)
  const programValidations = programs.map((_, idx) => ({
    sqref: `${XLSX.utils.encode_col(6 + idx)}2:${XLSX.utils.encode_col(6 + idx)}1000`,
    type: "list" as const,
    formula1: '"O,X"',
  }));

  (worksheet as Record<string, unknown>)["!datavalidation"] = [
    {
      sqref: `${statusColLetter}2:${statusColLetter}1000`,
      type: "list",
      formula1: '"활성,비활성"',
    },
    ...programValidations,
  ];

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
