export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import ExcelJS from "exceljs";
import { prisma } from "@/lib/prisma";
import { getFiscalYearRange, getCurrentFiscalYear } from "@/lib/month";

const BORDER: Partial<ExcelJS.Borders> = {
  top: { style: "thin" }, bottom: { style: "thin" },
  left: { style: "thin" }, right: { style: "thin" },
};
const HEADER_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFE2E8F0" } };
const SUBTOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FFF8FAFC" } };
const TOTAL_FILL: ExcelJS.Fill = { type: "pattern", pattern: "solid", fgColor: { argb: "FF1E293B" } };

function rateStr(actual: number, target: number) {
  return target > 0 ? `${((actual / target) * 100).toFixed(1)}%` : "-";
}

function applyBorder(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    row.getCell(c).border = BORDER;
  }
}

function styleHeader(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.border = BORDER;
    cell.fill = HEADER_FILL;
    cell.font = { bold: true, size: 10 };
    cell.alignment = { horizontal: "center", vertical: "middle" };
  }
}

function styleSubtotal(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.border = BORDER;
    cell.fill = SUBTOTAL_FILL;
    cell.font = { bold: true, size: 10 };
  }
}

function styleTotal(row: ExcelJS.Row, colCount: number) {
  for (let c = 1; c <= colCount; c++) {
    const cell = row.getCell(c);
    cell.border = BORDER;
    cell.fill = TOTAL_FILL;
    cell.font = { bold: true, size: 10, color: { argb: "FFFFFFFF" } };
  }
}

function rateColor(rateValue: string): string | undefined {
  if (rateValue === "-") return undefined;
  const n = parseFloat(rateValue);
  if (n >= 100) return "FF16A34A";
  if (n >= 50) return "FFD97706";
  return "FFDC2626";
}

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url);
  const yearParam = searchParams.get("year");
  const branchIdParam = searchParams.get("branchId");
  const year = yearParam ? Number(yearParam) : getCurrentFiscalYear();
  const branchId = branchIdParam ? Number(branchIdParam) : undefined;
  const { gte, lt } = getFiscalYearRange(year);

  const [orders, targets, programs] = await Promise.all([
    prisma.saleOrder.findMany({
      where: { orderDate: { gte, lt }, ...(branchId ? { institution: { branchId } } : {}) },
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

  type AggRow = {
    branchName: string; instName: string; programName: string;
    programId: number; branchId: number; totalIssues: number;
    issues: Map<number, number>;
  };
  const aggMap = new Map<string, AggRow>();
  for (const o of orders) {
    const key = `${o.institution.branchId}-${o.institutionId}-${o.programId}`;
    if (!aggMap.has(key)) {
      aggMap.set(key, {
        branchName: o.institution.branch.name, instName: o.institution.name,
        programName: o.program.name, programId: o.programId,
        branchId: o.institution.branchId, totalIssues: o.program.totalIssues,
        issues: new Map(),
      });
    }
    const agg = aggMap.get(key)!;
    agg.issues.set(o.issueNumber, (agg.issues.get(o.issueNumber) ?? 0) + o.quantity);
  }

  const targetMap = new Map<string, number>();
  for (const t of targets) targetMap.set(`${t.branchId}-${t.programId}`, t.quantity);

  const wb = new ExcelJS.Workbook();
  wb.creator = "지사 관리 시스템";

  // ── Sheet 1: 상세 ──
  const ws1 = wb.addWorksheet("상세");
  const issueHeaders = Array.from({ length: maxIssues }, (_, i) => `${i + 1}호`);
  const detailCols = ["지사명", "기관명", "프로그램명", ...issueHeaders, "합계"];
  ws1.columns = [
    { width: 16 }, { width: 20 }, { width: 16 },
    ...Array(maxIssues).fill({ width: 7 }),
    { width: 9 },
  ];

  const hRow1 = ws1.addRow(detailCols);
  styleHeader(hRow1, detailCols.length);
  hRow1.height = 18;

  for (const agg of aggMap.values()) {
    const issueQtys = Array.from({ length: maxIssues }, (_, i) => {
      const n = i + 1;
      return n > agg.totalIssues ? "" : (agg.issues.get(n) ?? 0);
    });
    const total = [...agg.issues.values()].reduce((s, v) => s + v, 0);
    const row = ws1.addRow([agg.branchName, agg.instName, agg.programName, ...issueQtys, total]);
    applyBorder(row, detailCols.length);
    row.getCell(detailCols.length).font = { bold: true };
    row.getCell(detailCols.length).alignment = { horizontal: "right" };
    for (let c = 4; c <= detailCols.length; c++) {
      row.getCell(c).alignment = { horizontal: "right" };
      row.getCell(c).numFmt = "#,##0";
    }
  }

  // ── Sheet 2: 요약 ──
  const ws2 = wb.addWorksheet("요약");
  ws2.columns = [{ width: 20 }, { width: 18 }, { width: 12 }, { width: 12 }, { width: 10 }];
  const sumCols = ["지사명", "프로그램명", "실적", "목표", "달성률"];

  const hRow2 = ws2.addRow(sumCols);
  styleHeader(hRow2, sumCols.length);
  hRow2.height = 18;

  // 지사×프로그램 집계
  const bpMap = new Map<string, { branchName: string; branchId: number; programName: string; programId: number; actual: number }>();
  for (const agg of aggMap.values()) {
    const key = `${agg.branchId}-${agg.programId}`;
    const qty = [...agg.issues.values()].reduce((s, v) => s + v, 0);
    const ex = bpMap.get(key);
    if (ex) { ex.actual += qty; }
    else { bpMap.set(key, { branchName: agg.branchName, branchId: agg.branchId, programName: agg.programName, programId: agg.programId, actual: qty }); }
  }

  const programActual = new Map<number, number>();
  for (const bp of bpMap.values()) {
    programActual.set(bp.programId, (programActual.get(bp.programId) ?? 0) + bp.actual);
  }

  function addSummaryRow(ws: ExcelJS.Worksheet, cols: (string | number)[], style?: "subtotal" | "total" | "section") {
    const row = ws.addRow(cols);
    if (style === "subtotal") styleSubtotal(row, sumCols.length);
    else if (style === "total") styleTotal(row, sumCols.length);
    else applyBorder(row, sumCols.length);
    // 숫자 포맷 + 달성률 색상
    row.getCell(3).numFmt = "#,##0";
    row.getCell(4).numFmt = "#,##0";
    const rateCell = row.getCell(5);
    rateCell.alignment = { horizontal: "center" };
    const rc = rateColor(String(cols[4]));
    if (rc) rateCell.font = { bold: style === "subtotal" || style === "total", color: { argb: rc } };
    return row;
  }

  if (!branchId) {
    // Section 1: 지사×프로그램
    const branchNames = [...new Set([...bpMap.values()].map((b) => b.branchName))].sort();
    for (const bn of branchNames) {
      const rows = [...bpMap.values()].filter((b) => b.branchName === bn);
      let bTotal = 0, bTarget = 0;
      for (const bp of rows) {
        const t = targetMap.get(`${bp.branchId}-${bp.programId}`) ?? 0;
        bTotal += bp.actual; bTarget += t;
        addSummaryRow(ws2, [bn, bp.programName, bp.actual, t || "", rateStr(bp.actual, t)]);
      }
      const sr = addSummaryRow(ws2, [`${bn} 소계`, "", bTotal, bTarget || "", rateStr(bTotal, bTarget)], "subtotal");
      sr.getCell(1).alignment = { horizontal: "left" };
    }
    ws2.addRow([]);
  }

  // Section 2: 프로그램별 합계
  const secRow = ws2.addRow(["", "프로그램별 합계", "", "", ""]);
  secRow.font = { bold: true };
  for (const p of programs) {
    const actual = programActual.get(p.id) ?? 0;
    const target = [...targetMap.entries()].filter(([k]) => k.endsWith(`-${p.id}`)).reduce((s, [, v]) => s + v, 0);
    addSummaryRow(ws2, ["", p.name, actual, target || "", rateStr(actual, target)]);
  }
  ws2.addRow([]);

  // Section 3: 전체 합계
  const totalActual = [...programActual.values()].reduce((s, v) => s + v, 0);
  const totalTarget = [...targetMap.values()].reduce((s, v) => s + v, 0);
  addSummaryRow(ws2, ["전체 합계", "", totalActual, totalTarget || "", rateStr(totalActual, totalTarget)], "total");

  const buffer = Buffer.from(await wb.xlsx.writeBuffer());
  return new NextResponse(buffer, {
    headers: {
      "Content-Type": "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "Content-Disposition": `attachment; filename="sales_${year}${branchId ? `_branch${branchId}` : ""}.xlsx"`,
      "Cache-Control": "no-store",
    },
  });
}
