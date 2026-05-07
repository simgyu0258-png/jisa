export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";

export type SaleOrderPreviewRow = {
  institutionId: number;
  institutionName: string;
  branchName: string;
  branchId: number;
  programId: number;
  programName: string;
  issueNumber: number;
  orderDate: string;
  quantity: number;
  isNewInstitution: boolean;
};

export type SaleOrderPreviewResponse = {
  summary: { totalRows: number; validRows: number; errorRows: number };
  errors: Array<{ row: number; message: string }>;
  payload: SaleOrderPreviewRow[];
};

function str(v: unknown) { return String(v ?? "").trim(); }

export async function POST(request: Request) {
  const formData = await request.formData();
  const file = formData.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

  const [branches, programs, institutions] = await Promise.all([
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.institution.findMany({ select: { id: true, name: true, branchId: true } }),
  ]);

  const branchByName = new Map(branches.map((b) => [b.name, b]));
  const programByName = new Map(programs.map((p) => [p.name, p]));
  const instKey = (bId: number, n: string) => `${bId}::${n}`;
  const instMap = new Map(institutions.map((i) => [instKey(i.branchId, i.name), i.id]));

  const buffer = Buffer.from(await file.arrayBuffer());
  const wb = XLSX.read(buffer, { type: "buffer" });
  const ws = wb.Sheets[wb.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });

  const errors: Array<{ row: number; message: string }> = [];
  const payload: SaleOrderPreviewRow[] = [];
  const newInstTemp = new Map<string, number>();
  let tempId = -1;
  let lastBranch = "";
  let lastInst = "";

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    const excelRow = i + 2;
    const branchName = str(row["지사명"]) || lastBranch;
    const instName = str(row["기관명"]) || lastInst;
    const programName = str(row["프로그램"]);
    const issueNumber = Number(row["호"]);
    const orderDate = str(row["주문일"]);
    const quantity = Number(row["부수"]);

    const errs: string[] = [];
    if (!branchName) errs.push("지사명 필수");
    if (!instName) errs.push("기관명 필수");
    if (!programName) errs.push("프로그램 필수");
    if (!issueNumber || issueNumber < 1) errs.push("호 필수 (1 이상)");
    if (!orderDate || !/^\d{4}-\d{2}-\d{2}$/.test(orderDate)) errs.push("주문일 형식 오류 (YYYY-MM-DD)");
    if (isNaN(quantity) || quantity < 0) errs.push("부수 오류 (0 이상)");

    if (errs.length > 0) { errors.push({ row: excelRow, message: errs.join(", ") }); continue; }

    const branch = branchByName.get(branchName);
    const program = programByName.get(programName);
    if (!branch) { errors.push({ row: excelRow, message: `지사명 없음: ${branchName}` }); continue; }
    if (!program) { errors.push({ row: excelRow, message: `프로그램 없음: ${programName}` }); continue; }
    if (issueNumber > program.totalIssues) { errors.push({ row: excelRow, message: `${programName}은 최대 ${program.totalIssues}호` }); continue; }

    const key = instKey(branch.id, instName);
    let resolvedInstId = instMap.get(key);
    let isNew = false;
    if (!resolvedInstId) {
      if (!newInstTemp.has(key)) newInstTemp.set(key, tempId--);
      resolvedInstId = newInstTemp.get(key)!;
      isNew = true;
    }

    lastBranch = branchName;
    lastInst = instName;

    payload.push({ institutionId: resolvedInstId, institutionName: instName, branchName, branchId: branch.id, programId: program.id, programName, issueNumber, orderDate, quantity, isNewInstitution: isNew });
  }

  return NextResponse.json({ summary: { totalRows: rows.length, validRows: payload.length, errorRows: errors.length }, errors, payload } satisfies SaleOrderPreviewResponse);
}
