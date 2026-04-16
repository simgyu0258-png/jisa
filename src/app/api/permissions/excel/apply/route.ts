import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Payload = Array<{ branchId: number; permissions: boolean[] }>;

export async function POST(request: Request) {
  const body = (await request.json()) as { payload?: Payload };
  const payload = body.payload;

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "잘못된 payload 입니다." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of payload) {
      await tx.branchProgramPermission.deleteMany({ where: { branchId: item.branchId } });
      await tx.branchProgramPermission.createMany({
        data: Array.from({ length: 8 }, (_, i) => ({
          branchId: item.branchId,
          programId: i + 1,
          isEnabled: Boolean(item.permissions[i]),
        })),
      });
    }
  });

  revalidatePath("/permissions");
  revalidatePath("/branches");

  return NextResponse.json({ updatedRows: payload.length });
}
