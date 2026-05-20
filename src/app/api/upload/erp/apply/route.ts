export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { SaleOrderPreviewRow } from "@/app/api/sales/excel/preview/route";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = (await request.json()) as { payload?: SaleOrderPreviewRow[] };
  const payload = body.payload;
  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: "잘못된 payload" }, { status: 400 });
  }

  // 신규 기관 먼저 생성
  const newInstMap = new Map<string, number>(); // "branchId::name" → 실제 id

  for (const row of payload) {
    if (!row.isNewInstitution) continue;
    const key = `${row.branchId}::${row.institutionName}`;
    if (newInstMap.has(key)) continue;
    const existing = await prisma.institution.findFirst({
      where: { branchId: row.branchId, name: row.institutionName },
    });
    if (existing) {
      newInstMap.set(key, existing.id);
    } else {
      const created = await prisma.institution.create({
        data: { branchId: row.branchId, name: row.institutionName },
      });
      newInstMap.set(key, created.id);
    }
  }

  // SaleOrder upsert (수량 교체)
  let upsertedCount = 0;
  for (const row of payload) {
    const institutionId = row.isNewInstitution
      ? newInstMap.get(`${row.branchId}::${row.institutionName}`)!
      : row.institutionId;

    await prisma.saleOrder.upsert({
      where: {
        institutionId_programId_issueNumber_orderDate: {
          institutionId,
          programId: row.programId,
          issueNumber: row.issueNumber,
          orderDate: row.orderDate,
        },
      },
      create: { institutionId, programId: row.programId, issueNumber: row.issueNumber, orderDate: row.orderDate, quantity: row.quantity },
      update: { quantity: row.quantity },
    });
    upsertedCount++;
  }

  return NextResponse.json({ upsertedCount });
}
