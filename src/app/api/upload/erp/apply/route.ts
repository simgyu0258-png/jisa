export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getIssueCanonicalDate, getFiscalYearForIssue } from "@/lib/month";
import type { SaleOrderPreviewRow } from "@/app/api/sales/excel/preview/route";

type NewMapping = {
  productName: string;
  programId: number;
  issueNumber: number;
  branchId: number;
  institutionName: string;
  institutionId: number;
  orderDate: string;
  quantity: number;
  isNewInstitution: boolean;
};

type ReturnApplyRow = {
  institutionId: number;
  institutionName: string;
  branchId: number;
  isNewInstitution: boolean;
  programId: number;
  issueNumber: number;
  quantity: number;
  fiscalYear: number;
  originalOrderDate: string;
};

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = (await request.json()) as {
    payload?: SaleOrderPreviewRow[];
    newMappings?: NewMapping[];
    returns?: ReturnApplyRow[];
  };

  const payload = body.payload ?? [];
  const newMappings = body.newMappings ?? [];
  const returnRows = body.returns ?? [];

  if (payload.length === 0 && newMappings.length === 0 && returnRows.length === 0) {
    return NextResponse.json({ error: "잘못된 payload" }, { status: 400 });
  }

  // 신규 기관 먼저 생성
  const newInstMap = new Map<string, number>();

  const allRows = [
    ...payload,
    ...newMappings.map((m) => ({
      institutionId: m.institutionId,
      institutionName: m.institutionName,
      branchId: m.branchId,
      isNewInstitution: m.isNewInstitution,
    })),
    ...returnRows.map((r) => ({
      institutionId: r.institutionId,
      institutionName: r.institutionName,
      branchId: r.branchId,
      isNewInstitution: r.isNewInstitution,
    })),
  ];

  for (const row of allRows) {
    if (!row.isNewInstitution) continue;
    const key = `${row.branchId}::${row.institutionName}`;
    if (newInstMap.has(key)) continue;
    const existing = await prisma.institution.findFirst({
      where: { branchId: row.branchId, name: row.institutionName },
    });
    newInstMap.set(key, existing?.id ?? (await prisma.institution.create({
      data: { branchId: row.branchId, name: row.institutionName },
    })).id);
  }

  // 신규 매핑 저장
  for (const m of newMappings) {
    await prisma.erpProductMapping.upsert({
      where: { productName: m.productName },
      create: { productName: m.productName, programId: m.programId, issueNumber: m.issueNumber },
      update: { programId: m.programId, issueNumber: m.issueNumber },
    });
  }

  // SaleOrder upsert (수량 교체)
  let upsertedCount = 0;

  const resolvedRows: { institutionId: number; branchId: number; institutionName: string; programId: number; issueNumber: number; orderDate: string; quantity: number; isNewInstitution: boolean }[] = [
    ...payload,
    ...newMappings.map((m) => ({
      institutionId: m.institutionId,
      branchId: m.branchId,
      institutionName: m.institutionName,
      programId: m.programId,
      issueNumber: m.issueNumber,
      orderDate: m.orderDate,
      quantity: m.quantity,
      isNewInstitution: m.isNewInstitution,
    })),
  ];

  for (const row of resolvedRows) {
    const institutionId = row.isNewInstitution
      ? newInstMap.get(`${row.branchId}::${row.institutionName}`)!
      : row.institutionId;

    await prisma.saleOrder.upsert({
      where: {
        institutionId_programId_issueNumber_orderDate: {
          institutionId, programId: row.programId,
          issueNumber: row.issueNumber, orderDate: row.orderDate,
        },
      },
      create: { institutionId, programId: row.programId, issueNumber: row.issueNumber, orderDate: row.orderDate, quantity: row.quantity },
      update: { quantity: row.quantity },
    });
    upsertedCount++;
  }

  // 반품 처리 — 같은 회계연도면 실제 주문일자로, 연도 경계를 넘는 반품이면 발행월 말일로 저장.
  // 실제 주문일자를 쓰면 월별 현황이 정확하고 서로 다른 반품이 합산되며, 음수 행으로 보존돼
  // 나중에 구입이 추가되면 집계 합산으로 자동 net 처리됨.
  for (const r of returnRows) {
    const institutionId = r.isNewInstitution
      ? newInstMap.get(`${r.branchId}::${r.institutionName}`)!
      : r.institutionId;
    const orderDate = getFiscalYearForIssue(r.issueNumber, r.originalOrderDate) === r.fiscalYear
      ? r.originalOrderDate
      : getIssueCanonicalDate(r.issueNumber, r.fiscalYear);
    await prisma.saleOrder.upsert({
      where: {
        institutionId_programId_issueNumber_orderDate: {
          institutionId, programId: r.programId, issueNumber: r.issueNumber, orderDate,
        },
      },
      create: { institutionId, programId: r.programId, issueNumber: r.issueNumber, orderDate, quantity: r.quantity },
      update: { quantity: r.quantity },
    });
    upsertedCount++;
  }

  return NextResponse.json({ upsertedCount, savedMappings: newMappings.length });
}
