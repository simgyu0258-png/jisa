export const dynamic = "force-dynamic";

import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { auth } from "@/auth";
import type { TargetPreviewRow } from "../preview/route";

export async function POST(request: Request) {
  const session = await auth();
  if (!session) return NextResponse.json({ error: "인증 필요" }, { status: 401 });

  const { year, payload }: { year: number; payload: TargetPreviewRow[] } = await request.json();
  if (!year || !Array.isArray(payload)) {
    return NextResponse.json({ error: "잘못된 요청" }, { status: 400 });
  }

  const permissions = await prisma.branchProgramPermission.findMany({
    where: { isEnabled: true },
    select: { branchId: true, programId: true },
  });
  const permSet = new Set(permissions.map((p) => `${p.branchId}-${p.programId}`));

  const programOps = payload.flatMap((row) =>
    row.programTargets
      .filter((t) => permSet.has(`${row.branchId}-${t.programId}`))
      .map((t) =>
        prisma.salesTarget.upsert({
          where: { branchId_programId_year: { branchId: row.branchId, programId: t.programId, year } },
          create: { branchId: row.branchId, programId: t.programId, year, quantity: t.quantity },
          update: { quantity: t.quantity },
        }),
      ),
  );

  const ooOps = payload.map((row) =>
    prisma.onlyOneTarget.upsert({
      where: { branchId_year: { branchId: row.branchId, year } },
      create: { branchId: row.branchId, year, classCount: row.onlyOne },
      update: { classCount: row.onlyOne },
    }),
  );

  await prisma.$transaction([...programOps, ...ooOps]);

  return NextResponse.json({ count: payload.length });
}
