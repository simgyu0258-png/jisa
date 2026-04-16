import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { isValidYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

function toNonNegativeInt(value: unknown) {
  const num = Number.parseInt(String(value ?? "0"), 10);
  return Number.isNaN(num) ? 0 : Math.max(0, num);
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const branches = await prisma.branch.findMany({
    include: { sales: true },
  });
  const branchMap = new Map(branches.map((branch) => [branch.branchCode, branch]));

  const errors: Array<{ row: number; message: string }> = [];
  const payload: Array<{ branchId: number; yearMonth: string; quantities: number[] }> = [];
  let updatedRows = 0;
  let unchangedRows = 0;

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchCode = String(row.branch_code ?? "").trim();
    const yearMonth = String(row.year_month ?? "").trim();
    const branch = branchMap.get(branchCode);

    if (!branch) {
      errors.push({ row: excelRow, message: `지사코드(${branchCode})를 찾을 수 없습니다.` });
      return;
    }
    if (!isValidYearMonth(yearMonth)) {
      errors.push({ row: excelRow, message: `year_month(${yearMonth}) 형식이 올바르지 않습니다.` });
      return;
    }

    const quantities = Array.from({ length: 8 }, (_, i) => toNonNegativeInt(row[`program${i + 1}`]));
    const current = Array.from({ length: 8 }, (_, i) => {
      const sale = branch.sales.find((item) => item.yearMonth === yearMonth && item.programId === i + 1);
      return sale?.quantity ?? 0;
    });
    const changed = quantities.some((value, i) => value !== current[i]);
    if (changed) updatedRows += 1;
    else unchangedRows += 1;

    payload.push({ branchId: branch.id, yearMonth, quantities });
  });

  return NextResponse.json({
    summary: {
      totalRows: rows.length,
      updatedRows,
      unchangedRows,
      errorRows: errors.length,
    },
    errors,
    payload,
  });
}
