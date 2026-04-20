"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function updateBranchPermissionsAction(branchId: number, formData: FormData) {
  const selectedIds = new Set(
    formData.getAll("programId").map((v) => Number(v)),
  );

  const programs = await prisma.program.findMany({ select: { id: true } });

  await prisma.$transaction(
    programs.map((program) =>
      prisma.branchProgramPermission.upsert({
        where: { branchId_programId: { branchId, programId: program.id } },
        create: { branchId, programId: program.id, isEnabled: selectedIds.has(program.id) },
        update: { isEnabled: selectedIds.has(program.id) },
      }),
    ),
  );

  revalidatePath("/permissions");
  revalidatePath("/branches");
  revalidatePath(`/branches/${branchId}`);
}
