import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export type BranchPreviewRow = {
  name: string;
  region: string;
  status: "active" | "inactive";
  managerName: string;
  phone: string;
  address: string | null;
  memo: string | null;
  permissions: Record<number, boolean>;
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
    const name = String(row["지사명"] ?? "").trim();
    const region = String(row["지역"] ?? "").trim();
    const managerName = String(row["담당자"] ?? "").trim();
    const phone = String(row["연락처"] ?? "").trim();
    const statusRaw = String(row["상태"] ?? "active").trim();
    const address = String(row["주소"] ?? "").trim() || null;
    const memo = String(row["메모"] ?? "").trim() || null;

    const rowErrors: string[] = [];
    if (!name) rowErrors.push("지사명 필수");
    if (!region) rowErrors.push("지역 필수");
    if (!managerName) rowErrors.push("담당자 필수");
    if (!phone) rowErrors.push("연락처 필수");
    if (name && existingNames.has(name)) rowErrors.push(`지사명 중복(DB): ${name}`);
    if (name && seenNames.has(name)) rowErrors.push(`지사명 중복(파일 내): ${name}`);

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
  } satisfies BranchPreviewResponse);
}
