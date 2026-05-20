export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { SaleOrderPreviewRow, SaleOrderPreviewResponse } from "@/app/api/sales/excel/preview/route";

function isSkipped(name: string) {
  if (name.includes("워크북")) return true;
  if (name.includes("꼬모아르떼") && name.includes("바인더")) return true;
  return false;
}

function matchProgram(name: string, programs: { id: number; name: string }[]) {
  const sorted = [...programs].sort((a, b) => b.name.length - a.name.length);
  return sorted.find((p) => name.includes(p.name)) ?? null;
}

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

  const buffer = Buffer.from(await file.arrayBuffer());
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

  const [programs, branches, aliases, institutions] = await Promise.all([
    prisma.program.findMany({ select: { id: true, name: true } }),
    prisma.branch.findMany({ select: { id: true, name: true } }),
    prisma.branchAlias.findMany({ select: { name: true, branchId: true } }),
    prisma.institution.findMany({ select: { id: true, name: true, branchId: true } }),
  ]);

  const branchMap = new Map(branches.map((b) => [b.name, b.id]));
  for (const alias of aliases) branchMap.set(alias.name, alias.branchId);

  const instMap = new Map(institutions.map((i) => [`${i.branchId}::${i.name}`, i.id]));
  const newInstTemp = new Map<string, number>();
  let tempId = -1;

  // (institutionId|programId|issueNumber|orderDate) → 집계
  const aggMap = new Map<string, SaleOrderPreviewRow>();

  const errors: { row: number; message: string }[] = [];
  let skipped = 0;
  const dataRows = rows.slice(headerRowIdx + 1);

  for (let i = 0; i < dataRows.length; i++) {
    const row = dataRows[i] as unknown[];
    const productName = String(row[col("품목명")] ?? "").trim();
    if (!productName) continue;

    if (isSkipped(productName)) { skipped++; continue; }

    const program = matchProgram(productName, programs);
    if (!program) { skipped++; continue; }

    const issue = extractIssue(productName);
    if (!issue) {
      errors.push({ row: headerRowIdx + i + 2, message: `호를 찾을 수 없음: ${productName}` });
      continue;
    }

    const branchName = String(row[col("거래처명")] ?? "").trim();
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

    const aggKey = `${institutionId}|${program.id}|${issue}|${orderDate}`;
    const existing = aggMap.get(aggKey);
    if (existing) {
      existing.quantity += qty;
    } else {
      aggMap.set(aggKey, {
        institutionId,
        institutionName: instName,
        branchName,
        branchId,
        programId: program.id,
        programName: program.name,
        issueNumber: issue,
        orderDate,
        quantity: qty,
        isNewInstitution: isNew,
      });
    }
  }

  const payload = [...aggMap.values()];

  return NextResponse.json({
    summary: {
      totalRows: dataRows.filter((r) => String((r as unknown[])[col("품목명")] ?? "").trim()).length,
      validRows: payload.length,
      errorRows: errors.length,
      skippedRows: skipped,
    },
    errors,
    payload,
  } satisfies SaleOrderPreviewResponse & { summary: { skippedRows: number } });
}
