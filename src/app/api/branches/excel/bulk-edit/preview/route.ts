import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export type BulkEditRow = {
  branchId: number;
  branchCode: string;
  name: string;
  region: string;
  status: "active" | "inactive";
  managerName: string;
  phone: string;
  address: string | null;
  memo: string | null;
  permissions: Record<number, boolean>;
};

export type BulkEditPreviewResponse = {
  summary: { totalRows: number; validRows: number; errorRows: number };
  errors: Array<{ row: number; message: string }>;
  payload: BulkEditRow[];
  programNames: Record<number, string>;
};

function isTruthy(value: unknown) {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "o" || s === "y" || s === "yes" || s === "true";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const [branches, programs] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, branchCode: true } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.branchCode, b.id]));
  const programNames: Record<number, string> = Object.fromEntries(programs.map((p) => [p.id, p.name]));

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const errors: Array<{ row: number; message: string }> = [];
  const payload: BulkEditRow[] = [];

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchCode = String(row["지사코드"] ?? "").trim();
    const name = String(row["지사명"] ?? "").trim();
    const region = String(row["지역"] ?? "").trim();
    const managerName = String(row["담당자"] ?? "").trim();
    const phone = String(row["연락처"] ?? "").trim();
    const statusRaw = String(row["상태"] ?? "active").trim();
    const address = String(row["주소"] ?? "").trim() || null;
    const memo = String(row["메모"] ?? "").trim() || null;

    const rowErrors: string[] = [];
    if (!branchCode) rowErrors.push("지사코드 필수");
    if (!name) rowErrors.push("지사명 필수");
    if (!region) rowErrors.push("지역 필수");
    if (!managerName) rowErrors.push("담당자 필수");
    if (!phone) rowErrors.push("연락처 필수");

    const branchId = branchMap.get(branchCode);
    if (branchCode && !branchId) rowErrors.push(`지사코드(${branchCode}) 없음`);

    if (rowErrors.length > 0) {
      errors.push({ row: excelRow, message: rowErrors.join(", ") });
      return;
    }

    const permissions: Record<number, boolean> = {};
    for (const program of programs) {
      permissions[program.id] = isTruthy(row[program.name]);
    }

    payload.push({
      branchId: branchId!,
      branchCode,
      name,
      region,
      status: statusRaw === "inactive" ? "inactive" : "active",
      managerName,
      phone,
      address,
      memo,
      permissions,
    });
  });

  return NextResponse.json({
    summary: { totalRows: rows.length, validRows: payload.length, errorRows: errors.length },
    errors,
    payload,
    programNames,
  } satisfies BulkEditPreviewResponse);
}
