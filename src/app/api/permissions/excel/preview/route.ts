import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

function toBool(value: unknown) {
  const normalized = String(value ?? "")
    .trim()
    .toUpperCase();
  return ["Y", "YES", "1", "TRUE", "O"].includes(normalized);
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
    include: { permissions: true },
  });
  const branchMap = new Map(branches.map((branch) => [branch.branchCode, branch]));

  const errors: Array<{ row: number; message: string }> = [];
  const payload: Array<{ branchId: number; permissions: boolean[] }> = [];
  let updatedRows = 0;
  let unchangedRows = 0;

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchCode = String(row.branch_code ?? "").trim();
    const branch = branchMap.get(branchCode);

    if (!branch) {
      errors.push({ row: excelRow, message: `지사코드(${branchCode})를 찾을 수 없습니다.` });
      return;
    }

    const permissions = Array.from({ length: 8 }, (_, i) => toBool(row[`program${i + 1}`]));
    const current = Array.from({ length: 8 }, (_, i) => {
      const permission = branch.permissions.find((item) => item.programId === i + 1);
      return permission?.isEnabled ?? false;
    });

    const changed = permissions.some((value, i) => value !== current[i]);
    if (changed) updatedRows += 1;
    else unchangedRows += 1;

    payload.push({ branchId: branch.id, permissions });
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
