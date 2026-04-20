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

  const [branches, programs] = await Promise.all([
    prisma.branch.findMany({ include: { sales: true } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const branchMap = new Map(branches.map((branch) => [branch.name, branch]));

  const errors: Array<{ row: number; message: string }> = [];
  const payload: Array<{ branchId: number; yearMonth: string; programQuantities: Record<number, number> }> = [];
  let updatedRows = 0;
  let unchangedRows = 0;

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchName = String(row["지사명"] ?? "").trim();
    const yearMonth = String(row["연월"] ?? "").trim();
    const branch = branchMap.get(branchName);

    if (!branch) {
      errors.push({ row: excelRow, message: `지사명(${branchName})을 찾을 수 없습니다.` });
      return;
    }
    if (!isValidYearMonth(yearMonth)) {
      errors.push({ row: excelRow, message: `연월(${yearMonth}) 형식이 올바르지 않습니다. (예: 2025-01)` });
      return;
    }

    const programQuantities: Record<number, number> = {};
    let changed = false;

    for (const program of programs) {
      const quantity = toNonNegativeInt(row[program.name]);
      programQuantities[program.id] = quantity;
      const current = branch.sales.find(
        (s) => s.yearMonth === yearMonth && s.programId === program.id,
      )?.quantity ?? 0;
      if (quantity !== current) changed = true;
    }

    if (changed) updatedRows += 1;
    else unchangedRows += 1;

    payload.push({ branchId: branch.id, yearMonth, programQuantities });
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
