export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import * as XLSX from "xlsx";
import { prisma } from "@/lib/prisma";
import { getFiscalYearRange, getCurrentFiscalYear } from "@/lib/month";

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const branchIdParam = searchParams.get("branchId");
  const year = yearParam ? Number(yearParam) : getCurrentFiscalYear();
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;
  const { gte, lt } = getFiscalYearRange(year);

  const [orders, targets, programs] = await Promise.all([
    prisma.saleOrder.findMany({
      where: {
        orderDate: { gte, lt },
        ...(branchId ? { institution: { branchId } } : {}),
      },
      include: {
        institution: { include: { branch: { select: { name: true } } } },
        program: { select: { name: true, totalIssues: true } },
      },
      orderBy: [
        { institution: { branch: { name: "asc" } } },
        { institution: { name: "asc" } },
        { programId: "asc" },
        { issueNumber: "asc" },
      ],
    }),
    prisma.salesTarget.findMany({ where: { year, ...(branchId ? { branchId } : {}) } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  const maxIssues = Math.max(...programs.map((p) => p.totalIssues), 1);

  // (branchId, institutionId, programId) → 집계
  type AggRow = {
    branchName: string;
    instName: string;
    programName: string;
    programId: number;
    branchId: number;
    totalIssues: number;
    issues: Map<number, number>;
  };
  const aggMap = new Map<string, AggRow>();

  for (const o of orders) {
    const key = `${o.institution.branchId}-${o.institutionId}-${o.programId}`;
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        branchName: o.institution.branch.name,
        instName: o.institution.name,
        programName: o.program.name,
        programId: o.programId,
        branchId: o.institution.branchId,
        totalIssues: o.program.totalIssues,
        issues: new Map(),
      });
    }
    const agg = aggMap.get(key)!;
    agg.issues.set(o.issueNumber, (agg.issues.get(o.issueNumber) ?? 0) + o.quantity);
  }

  const targetMap = new Map<string, number>();
  for (const t of targets) {
    targetMap.set(`${t.branchId}-${t.programId}`, t.quantity);
  }

  const issueHeaders = Array.from({ length: maxIssues }, (_, i) => `${i + 1}호`);

  // ── Sheet 1: 기관별 상세 ──
  const detailHeaders = ["지사명", "기관명", "프로그램명", ...issueHeaders, "합계"];
  const detailRows = [...aggMap.values()].map((agg) => {
    const issueQtys = Array.from({ length: maxIssues }, (_, i) => {
      const n = i + 1;
      if (n > agg.totalIssues) return "";
      return agg.issues.get(n) ?? 0;
    });
    const total = [...agg.issues.values()].reduce((s, v) => s + v, 0);
    return [agg.branchName, agg.instName, agg.programName, ...issueQtys, total];
  });

  const ws1 = XLSX.utils.aoa_to_sheet([detailHeaders, ...detailRows]);
  ws1["!cols"] = [
    { wch: 16 }, { wch: 20 }, { wch: 16 },
    ...Array(maxIssues).fill({ wch: 6 }),
    { wch: 8 },
  ];

  // ── Sheet 2: 요약 ──
  function rate(actual: number, target: number) {
    return target > 0 ? `${((actual / target) * 100).toFixed(1)}%` : "-";
  }

  // 지사×프로그램 집계
  const bpMap = new Map<string, { branchName: string; branchId: number; programName: string; programId: number; actual: number }>();
  for (const agg of aggMap.values()) {
    const key = `${agg.branchId}-${agg.programId}`;
    const qty = [...agg.issues.values()].reduce((s, v) => s + v, 0);
    const existing = bpMap.get(key);
    if (existing) { existing.actual += qty; }
    else { bpMap.set(key, { branchName: agg.branchName, branchId: agg.branchId, programName: agg.programName, programId: agg.programId, actual: qty }); }
  }

  // 프로그램별 전체 집계
  const programActual = new Map<number, number>();
  for (const bp of bpMap.values()) {
    programActual.set(bp.programId, (programActual.get(bp.programId) ?? 0) + bp.actual);
  }

  const summaryData: unknown[][] = [];
  const summaryHeaders = ["지사명", "프로그램명", "실적", "목표", "달성률"];
  summaryData.push(summaryHeaders);

  if (!branchId) {
    // Section 1: 지사×프로그램 (전체 지사 다운로드 시)
    const branches = [...new Set([...bpMap.values()].map((b) => b.branchName))].sort();
    for (const bn of branches) {
      const branchRows = [...bpMap.values()].filter((b) => b.branchName === bn);
      let branchTotal = 0;
      let branchTargetTotal = 0;
      for (const bp of branchRows) {
        const t = targetMap.get(`${bp.branchId}-${bp.programId}`) ?? 0;
        branchTotal += bp.actual;
        branchTargetTotal += t;
        summaryData.push([bn, bp.programName, bp.actual, t || "", rate(bp.actual, t)]);
      }
      summaryData.push([`${bn} 소계`, "", branchTotal, branchTargetTotal || "", rate(branchTotal, branchTargetTotal)]);
      summaryData.push([]);
    }
    summaryData.push([]);
  }

  // Section 2: 프로그램별 합계
  summaryData.push(["", "프로그램별 합계", "", "", ""]);
  for (const p of programs) {
    const actual = programActual.get(p.id) ?? 0;
    const target = [...targetMap.entries()].filter(([k]) => k.endsWith(`-${p.id}`)).reduce((s, [, v]) => s + v, 0);
    summaryData.push(["", p.name, actual, target || "", rate(actual, target)]);
  }

  summaryData.push([]);

  // Section 3: 전체 합계
  const totalActual = [...programActual.values()].reduce((s, v) => s + v, 0);
  const totalTarget = [...targetMap.values()].reduce((s, v) => s + v, 0);
  summaryData.push(["전체 합계", "", totalActual, totalTarget || "", rate(totalActual, totalTarget)]);

  const ws2 = XLSX.utils.aoa_to_sheet(summaryData);
  ws2["!cols"] = [{ wch: 20 }, { wch: 18 }, { wch: 10 }, { wch: 10 }, { wch: 10 }];

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws1, "상세");
  XLSX.utils.book_append_sheet(wb, ws2, "요약");
  const buffer = XLSX.write(wb, { type: "buffer", bookType: "xlsx" });

  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales_${year}${branchId ? `_branch${branchId}` : ""}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
