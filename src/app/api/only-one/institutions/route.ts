export const dynamic = "force-dynamic";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import { getFiscalYearRange } from "@/lib/month";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const branchId = Number(req.nextUrl.searchParams.get("branchId"));
  const year = Number(req.nextUrl.searchParams.get("year"));
  if (!branchId || !year) return NextResponse.json([], { status: 200 });

  const { gte, lt } = getFiscalYearRange(year);

  const institutions = await prisma.institution.findMany({
    where: { branchId },
    select: {
      id: true,
      name: true,
      onlyOneContracts: {
        where: { startDate: { lt }, OR: [{ endDate: null }, { endDate: { gte } }] },
        orderBy: { startDate: "asc" },
        select: { id: true, classCount: true, startDate: true, endDate: true },
      },
    },
    orderBy: { name: "asc" },
  });

  const result = institutions
    .filter((i) => i.onlyOneContracts.length > 0)
    .map((i) => ({ id: i.id, name: i.name, contracts: i.onlyOneContracts }));

  return NextResponse.json(result);
}
