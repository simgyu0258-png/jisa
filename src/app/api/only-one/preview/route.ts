export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { prepareExcelBuffer } from "@/lib/excel-reader";
import { auth } from "@/auth";

export type OnlyOnePreviewRow = {
  branchName: string;
  branchId: number;
  institutionName: string;
  institutionId: number;
  classCount: number;
  startDate: string;
  endDate: string | null;
  isNewInstitution: boolean;
};

export type OnlyOnePreviewResponse = {
  payload: OnlyOnePreviewRow[];
  errors: { row: number; message: string }[];
  summary: { totalRows: number; validRows: number; errorRows: number };
};

function col(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = String(row[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

function parseDate(val: string): string | null {
  const m = val.match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const [branches, aliases, institutions] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.branchAlias.findMany({ select: { name: true, branchId: true } }),
    prisma.institution.findMany({ select: { id: true, name: true, branchId: true } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.name, b.id]));
  for (const alias of aliases) branchMap.set(alias.name, alias.branchId);
  const instMap = new Map(institutions.map((i) => [`${i.branchId}::${i.name}`, i.id]));

  const passwordRaw = formData.get("password");
  const password = typeof passwordRaw === "string" && passwordRaw.trim() ? passwordRaw.trim() : undefined;
  const rawBuffer = Buffer.from(await file.arrayBuffer());
  let buffer: Buffer;
  try {
    buffer = await prepareExcelBuffer(rawBuffer, password);
  } catch (err) {
    return NextResponse.json({ error: err instanceof Error ? err.message : "복호화 실패" }, { status: 400 });
  }
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const errors: { row: number; message: string }[] = [];
  const payload: OnlyOnePreviewRow[] = [];
  const newInstTemp = new Map<string, number>();
  let tempId = -1;

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchName = col(row, "지사명*", "지사명");
    const instName = col(row, "기관명*", "기관명");
    const classCountRaw = Number(row["클래스 수*"] ?? row["클래스 수"] ?? 0);
    const startDateRaw = col(row, "시작일*", "시작일");
    const endDateRaw = col(row, "종료일");

    const errs: string[] = [];
    if (!branchName) errs.push("지사명 필수");
    if (!instName) errs.push("기관명 필수");
    if (!classCountRaw || classCountRaw < 1) errs.push("클래스 수 필수 (1 이상)");
    if (!startDateRaw) errs.push("시작일 필수");

    const startDate = startDateRaw ? parseDate(startDateRaw) : null;
    const endDate = endDateRaw ? parseDate(endDateRaw) : null;

    if (startDateRaw && !startDate) errs.push("시작일 형식 오류 (YYYY-MM-DD)");
    if (endDateRaw && !endDate) errs.push("종료일 형식 오류 (YYYY-MM-DD)");

    if (errs.length > 0) { errors.push({ row: excelRow, message: errs.join(", ") }); return; }

    const branchId = branchMap.get(branchName);
    if (!branchId) { errors.push({ row: excelRow, message: `등록되지 않은 지사: ${branchName}` }); return; }

    const instKey = `${branchId}::${instName}`;
    let institutionId = instMap.get(instKey);
    let isNew = false;
    if (!institutionId) {
      if (!newInstTemp.has(instKey)) newInstTemp.set(instKey, tempId--);
      institutionId = newInstTemp.get(instKey)!;
      isNew = true;
    }

    payload.push({ branchName, branchId, institutionName: instName, institutionId, classCount: classCountRaw, startDate: startDate!, endDate, isNewInstitution: isNew });
  });

  return NextResponse.json({
    payload, errors,
    summary: { totalRows: rows.length, validRows: payload.length, errorRows: errors.length },
  } satisfies OnlyOnePreviewResponse);
}
