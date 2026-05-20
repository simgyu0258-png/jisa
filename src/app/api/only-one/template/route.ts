export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";

export async function GET() {
  const rows = [
    { "지사명*": "서울지사", "기관명*": "OO초등학교", "클래스 수*": 3, "시작일*": "2025-03-01", "종료일": "" },
    { "지사명*": "서울지사", "기관명*": "OO초등학교", "클래스 수*": 2, "시작일*": "2025-09-01", "종료일": "" },
    { "지사명*": "서울지사", "기관명*": "XX학원", "클래스 수*": 5, "시작일*": "2025-03-01", "종료일": "2025-08-31" },
  ];

  const worksheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "온리원");
  const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": 'attachment; filename="only_one_template.xlsx"',
      "Cache-Control": "no-store",
    },
  });
}
