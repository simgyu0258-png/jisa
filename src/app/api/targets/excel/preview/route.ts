export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { prepareExcelBuffer } from "@/lib/excel-reader";

export type TargetPreviewRow = {
  branchId: number;
  branchName: string;
  programTargets: { programId: number; programName: string; quantity: number; skipped: boolean }[];
  onlyOne: number;
};

export type TargetPreviewResponse = {
  payload: TargetPreviewRow[];
  errors: { row: number; message: string }[];
  summary: { totalRows: number; validRows: number; errorRows: number };
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

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

  const [programs, branches, permissions] = await Promise.all([
    prisma.program.findMany({ where: { isOnlyOne: false }, orderBy: { id: "asc" } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.branchProgramPermission.findMany({ where: { isEnabled: true }, select: { branchId: true, programId: true } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.name.trim(), b.id]));
  const permSet = new Set(permissions.map((p) => `${p.branchId}-${p.programId}`));

  const errors: { row: number; message: string }[] = [];
  const payload: TargetPreviewRow[] = [];

  rows.forEach((row, index) => {
    const excelRow = index + 2;
    const branchName = String(row["지사명"] ?? "").trim();
    if (!branchName) return;

    const branchId = branchMap.get(branchName);
    if (!branchId) {
      errors.push({ row: excelRow, message: `등록되지 않은 지사: ${branchName}` });
      return;
    }

    const programTargets = programs.map((p) => {
      const rawVal = row[p.name];
      const quantity = rawVal !== "" ? Math.max(0, Math.round(Number(rawVal) || 0)) : 0;
      const skipped = !permSet.has(`${branchId}-${p.id}`);
      return { programId: p.id, programName: p.name, quantity, skipped };
    });

    const onlyOneRaw = row["온리원"];
    const onlyOne = onlyOneRaw !== "" ? Math.max(0, Math.round(Number(onlyOneRaw) || 0)) : 0;

    payload.push({ branchId, branchName, programTargets, onlyOne });
  });

  return NextResponse.json({
    payload,
    errors,
    summary: { totalRows: rows.filter((r) => String(r["지사명"] ?? "").trim()).length, validRows: payload.length, errorRows: errors.length },
  } satisfies TargetPreviewResponse);
}
