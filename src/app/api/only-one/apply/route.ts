export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { OnlyOnePreviewRow } from "../preview/route";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const body = (await request.json()) as { payload?: OnlyOnePreviewRow[] };
  const payload = body.payload ?? [];
  if (payload.length === 0) return NextResponse.json({ error: "잘못된 payload" }, { status: 400 });

  // 신규 기관 생성
  const newInstMap = new Map<string, number>();
  for (const row of payload) {
    if (!row.isNewInstitution) continue;
    const key = `${row.branchId}::${row.institutionName}`;
    if (newInstMap.has(key)) continue;
    const existing = await prisma.institution.findFirst({ where: { branchId: row.branchId, name: row.institutionName } });
    newInstMap.set(key, existing?.id ?? (await prisma.institution.create({ data: { branchId: row.branchId, name: row.institutionName } })).id);
  }

  let count = 0;
  for (const row of payload) {
    const institutionId = row.isNewInstitution ? newInstMap.get(`${row.branchId}::${row.institutionName}`)! : row.institutionId;
    await prisma.onlyOneContract.create({
      data: { institutionId, classCount: row.classCount, startDate: row.startDate, endDate: row.endDate },
    });
    count++;
  }

  return NextResponse.json({ count });
}
