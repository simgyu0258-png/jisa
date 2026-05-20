"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
}

export async function saveTargetsAction(
  year: number,
  data: { branchId: number; programId: number; quantity: number }[],
) {
  await requireAuth();
  await prisma.$transaction(
    data.map((d) =>
      prisma.salesTarget.upsert({
        where: { branchId_programId_year: { branchId: d.branchId, programId: d.programId, year } },
        create: { branchId: d.branchId, programId: d.programId, year, quantity: d.quantity },
        update: { quantity: d.quantity },
      }),
    ),
  );
  revalidatePath("/targets");
}
