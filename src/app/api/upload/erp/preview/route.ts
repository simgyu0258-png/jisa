export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { prepareExcelBuffer } from "@/lib/excel-reader";
import { auth } from "@/auth";
import type { SaleOrderPreviewRow } from "@/app/api/sales/excel/preview/route";

export type ErpUnresolvedRow = {
  productName: string;
  branchName: string;
  branchId: number;
  institutionName: string;
  orderDate: string;
  quantity: number;
  isNewInstitution: boolean;
  institutionId: number;
};

export type ErpPreviewResponse = {
  payload: SaleOrderPreviewRow[];
  unresolved: ErpUnresolvedRow[];
  errors: { row: number; message: string }[];
  summary: { totalRows: number; validRows: number; unresolvedRows: number; errorRows: number; skippedRows: number };
};

function extractIssue(name: string): number | null {
  const m = name.match(/(\d+)호/);
  return m ? Number(m[1]) : null;
}

function parseDate(val: unknown): string | null {
  const m = String(val ?? "").match(/(\d{4})[\/\-](\d{2})[\/\-](\d{2})/);
  return m ? `${m[1]}-${m[2]}-${m[3]}` : null;
}

export async function POST(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const formData = await req.formData();
  const file = formData.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "파일이 없습니다." }, { status: 400 });

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
  const rows = XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];

  // 헤더 행 탐색
  let headerRowIdx = -1;
  const headerMap: Record<string, number> = {};
  for (let i = 0; i < Math.min(rows.length, 6); i++) {
    const row = rows[i] as string[];
    const idx = row.findIndex((c) => String(c).includes("거래처명"));
    if (idx >= 0) {
      headerRowIdx = i;
      row.forEach((cell, j) => { headerMap[String(cell).trim()] = j; });
      break;
    }
  }
  if (headerRowIdx < 0) return NextResponse.json({ error: "ERP 형식 헤더를 찾을 수 없습니다." }, { status: 400 });

  const col = (name: string) => headerMap[name] ?? -1;

  const [programs, branches, aliases, institutions, skipRules, productMappings] = await Promise.all([
    prisma.program.findMany({ where: { isOnlyOne: false }, select: { id: true, name: true, totalIssues: true, matchKeyword: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.branchAlias.findMany({ select: { name: true, branchId: true } }),
    prisma.institution.findMany({ select: { id: true, name: true, branchId: true } }),
    prisma.erpSkipRule.findMany(),
    prisma.erpProductMapping.findMany({ select: { productName: true, programId: true, issueNumber: true } }),
  ]);

  function normalizeName(name: string) {
    return name.replace(/㈜/g, "(주)").replace(/㈔/g, "(사)").trim();
  }

  const branchMap = new Map(branches.map((b) => [normalizeName(b.name), b.id]));
  for (const alias of aliases) branchMap.set(normalizeName(alias.name), alias.branchId);

  const instMap = new Map(institutions.map((i) => [`${i.branchId}::${i.name}`, i.id]));
  const mappingMap = new Map(productMappings.map((m) => [m.productName, { programId: m.programId, issueNumber: m.issueNumber }]));
  const programMap = new Map(programs.map((p) => [p.id, p]));

  const newInstTemp = new Map<string, number>();
  let tempId = -1;

  function isSkipped(name: string): boolean {
    return skipRules.some((rule) => {
      if (!name.includes(rule.keyword1)) return false;
      if (rule.keyword2 && !name.includes(rule.keyword2)) return false;
      return true;
    });
  }

  function matchProgram(name: string) {
    const sorted = [...programs].sort((a, b) => (b.matchKeyword ?? b.name).length - (a.matchKeyword ?? a.name).length);
    return sorted.find((p) => name.includes(p.matchKeyword ?? p.name)) ?? null;
  }

  // 집계 맵
  const aggMap = new Map<string, SaleOrderPreviewRow>();
  const unresolvedAgg = new Map<string, ErpUnresolvedRow>();

  const errors: { row: number; message: string }[] = [];
  let skipped = 0;
  const dataRows = rows.slice(headerRowIdx + 1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    const productName = String(row[col("품목명")] ?? "").trim();
    if (!productName) continue;

    if (isSkipped(productName)) { skipped++; continue; }

    const branchName = normalizeName(String(row[col("거래처명")] ?? ""));
    const instName = String(row[col("배송처명")] ?? "").trim();
    const qty = Number(String(row[col("수량")] ?? "0").replace(/,/g, "")) || 0;
    const orderDate = parseDate(row[col("주문일자")]);

    if (!branchName || !instName) {
      errors.push({ row: headerRowIdx + i + 2, message: "거래처명 또는 배송처명 누락" });
      continue;
    }
    if (!orderDate) {
      errors.push({ row: headerRowIdx + i + 2, message: `주문일자 형식 오류: ${row[col("주문일자")]}` });
      continue;
    }

    const branchId = branchMap.get(branchName);
    if (!branchId) {
      errors.push({ row: headerRowIdx + i + 2, message: `등록되지 않은 지사: ${branchName}` });
      continue;
    }

    const instKey = `${branchId}::${instName}`;
    let institutionId = instMap.get(instKey);
    let isNew = false;
    if (!institutionId) {
      if (!newInstTemp.has(instKey)) newInstTemp.set(instKey, tempId--);
      institutionId = newInstTemp.get(instKey)!;
      isNew = true;
    }

    // 프로그램·호 파싱 시도
    const savedMapping = mappingMap.get(productName);
    const autoProgram = matchProgram(productName);
    const autoIssue = extractIssue(productName);

    const programId = savedMapping?.programId ?? (autoProgram?.id ?? null);
    const issueNumber = savedMapping?.issueNumber ?? autoIssue;

    if (!programId || !issueNumber) {
      // 미매핑 → unresolved 집계
      const unresolvedKey = `${institutionId}|${productName}|${orderDate}`;
      const existing = unresolvedAgg.get(unresolvedKey);
      if (existing) {
        existing.quantity += qty;
      } else {
        unresolvedAgg.set(unresolvedKey, {
          productName, branchName, branchId,
          institutionName: instName, orderDate, quantity: qty,
          isNewInstitution: isNew, institutionId,
        });
      }
      continue;
    }

    const aggKey = `${institutionId}|${programId}|${issueNumber}|${orderDate}`;
    const existing = aggMap.get(aggKey);
    if (existing) {
      existing.quantity += qty;
    } else {
      aggMap.set(aggKey, {
        institutionId, institutionName: instName, branchName, branchId,
        programId, programName: programMap.get(programId)?.name ?? "",
        issueNumber, orderDate, quantity: qty, isNewInstitution: isNew,
      });
    }
  }

  const payload = [...aggMap.values()];
  const unresolved = [...unresolvedAgg.values()];

  return NextResponse.json({
    payload,
    unresolved,
    errors,
    summary: {
      totalRows: dataRows.filter((r) => String((r as unknown[])[col("품목명")] ?? "").trim()).length,
      validRows: payload.length,
      unresolvedRows: unresolved.length,
      errorRows: errors.length,
      skippedRows: skipped,
    },
  } satisfies ErpPreviewResponse);
}
