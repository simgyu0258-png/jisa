import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type Payload = Array<{ branchId: number; yearMonth: string; quantities: number[] }>;

export async function POST(request: Request) {
  const body = (await request.json()) as { payload?: Payload };
  const payload = body.payload;

  if (!Array.isArray(payload)) {
    return NextResponse.json({ error: "잘못된 payload 입니다." }, { status: 400 });
  }

  await prisma.$transaction(async (tx) => {
    for (const item of payload) {
      await tx.sale.deleteMany({ where: { branchId: item.branchId, yearMonth: item.yearMonth } });
      await tx.sale.createMany({
        data: Array.from({ length: 8 }, (_, i) => ({
          branchId: item.branchId,
          yearMonth: item.yearMonth,
          programId: i + 1,
          quantity: Math.max(0, Number(item.quantities[i] ?? 0)),
        })),
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath("/branches");

  return NextResponse.json({ updatedRows: payload.length });
}
