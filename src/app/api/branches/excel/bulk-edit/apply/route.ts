import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BulkEditRow } from "../preview/route";

export async function POST(request: Request) {
  const body = (await request.json()) as { payload?: BulkEditRow[] };
  const payload = body.payload;

  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: "잘못된 payload 입니다." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of payload) {
      await tx.branch.update({
        where: { id: item.branchId },
        data: {
          name: item.name,
          region: item.region,
          status: item.status,
          managerName: item.managerName,
          phone: item.phone,
          address: item.address,
          memo: item.memo,
        },
      });

      for (const [programIdStr, isEnabled] of Object.entries(item.permissions)) {
        const programId = Number(programIdStr);
        await tx.branchProgramPermission.upsert({
          where: { branchId_programId: { branchId: item.branchId, programId } },
          create: { branchId: item.branchId, programId, isEnabled },
          update: { isEnabled },
        });
      }
    }
  });

  revalidatePath("/branches");
  revalidatePath("/permissions");

  return NextResponse.json({ updatedRows: payload.length });
}
