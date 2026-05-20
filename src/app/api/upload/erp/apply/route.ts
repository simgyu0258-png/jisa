export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
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

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = (await request.json()) as {
    payload?: SaleOrderPreviewRow[];
    newMappings?: NewMapping[];
  };

  const payload = body.payload ?? [];
  const newMappings = body.newMappings ?? [];

  if (payload.length === 0 && newMappings.length === 0) {
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

  return NextResponse.json({ upsertedCount, savedMappings: newMappings.length });
}
