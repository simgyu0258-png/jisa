"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireMaster() {
  const session = await auth();
  if (!session || session.user.role !== "master") redirect("/");
}

export async function saveSalesFromPageAction(
  branchId: number,
  yearMonth: string,
  quantities: Record<number, number>,
) {
  await requireMaster();

  const programIds = Object.keys(quantities).map(Number);
  if (!yearMonth || programIds.length === 0) return;

  await prisma.$transaction(async (tx) => {
    await tx.sale.deleteMany({ where: { branchId, yearMonth, programId: { in: programIds } } });
    await tx.sale.createMany({
      data: programIds.map((programId) => ({
        branchId,
        yearMonth,
        programId,
        quantity: Math.max(0, quantities[programId] ?? 0),
      })),
    });
  });

  revalidatePath("/sales");
  revalidatePath("/");
}
