export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export type InstitutionRow = { name: string; phone: string | null; address: string | null };

export type BranchPreviewRow = {
  name: string;
  region: string;
  status: "active" | "inactive";
  managerName: string;
  phone: string;
  address: string | null;
  memo: string | null;
  permissions: Record<number, boolean>;
  institutions: InstitutionRow[];
};

export type BranchPreviewResponse = {
  summary: { totalRows: number; validRows: number; errorRows: number };
  errors: Array<{ row: number; message: string }>;
  payload: BranchPreviewRow[];
  programNames: Record<number, string>;
};

function isTruthy(value: unknown) {
  const s = String(value ?? "").trim().toLowerCase();
  return s === "1" || s === "o" || s === "y" || s === "yes" || s === "true";
}

function col(row: Record<string, unknown>, ...keys: string[]) {
  for (const key of keys) {
    const v = String(row[key] ?? "").trim();
    if (v) return v;
  }
  return "";
}

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) {
    return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });
  }

  const [programs, existingBranches] = await Promise.all([
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.branch.findMany({ select: { name: true } }),
  ]);

  const existingNames = new Set(existingBranches.map((b) => b.name));
  const programByName = new Map(programs.map((p) => [p.name, p.id]));
  const programNames: Record<number, string> = Object.fromEntries(programs.map((p) => [p.id, p.name]));

  const buffer = Buffer.from(await file.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });

  const errors: Array<{ row: number; message: string }> = [];
  const payload: BranchPreviewRow[] = [];
  const seenNames = new Set<string>();

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const name = col(row, "지사명*", "지사명");
    const institutionName = col(row, "기관명");
    const institutionPhone = col(row, "기관 연락처") || null;
    const institutionAddress = col(row, "기관 주소") || null;

    if (!name) {
      // 지사명 없음 → 기관명이 있으면 직전 지사에 추가
      if (institutionName && payload.length > 0) {
        payload[payload.length - 1].institutions.push({
          name: institutionName,
          phone: institutionPhone,
          address: institutionAddress,
        });
      }
      return;
    }

    // 지사명 있음 → 새 지사
    const region = col(row, "지역*", "지역");
    const managerName = col(row, "지사 담당자*", "지사 담당자", "담당자*", "담당자");
    const phone = col(row, "지사 연락처*", "지사 연락처", "연락처*", "연락처");
    const address = col(row, "지사 주소", "주소") || null;
    const statusRaw = col(row, "상태") || "활성";
    const memo = col(row, "메모") || null;

    const rowErrors: string[] = [];
    if (!region) rowErrors.push("지역 필수");
    if (!managerName) rowErrors.push("지사 담당자 필수");
    if (!phone) rowErrors.push("지사 연락처 필수");
    if (existingNames.has(name)) rowErrors.push(`지사명 중복(DB): ${name}`);
    if (seenNames.has(name)) rowErrors.push(`지사명 중복(파일 내): ${name}`);

    if (rowErrors.length > 0) {
      errors.push({ row: excelRow, message: rowErrors.join(", ") });
      return;
    }

    const permissions: Record<number, boolean> = {};
    for (const program of programs) {
      permissions[program.id] = programByName.has(program.name) && isTruthy(row[program.name]);
    }

    seenNames.add(name);
    payload.push({
      name,
      region,
      status: (statusRaw === "inactive" || statusRaw === "비활성") ? "inactive" : "active",
      managerName,
      phone,
      address,
      memo,
      permissions,
      institutions: institutionName
        ? [{ name: institutionName, phone: institutionPhone, address: institutionAddress }]
        : [],
    });
  });

  return NextResponse.json({
    summary: { totalRows: rows.length, validRows: payload.length, errorRows: errors.length },
    errors,
    payload,
    programNames,
  } satisfies BranchPreviewResponse);
}
