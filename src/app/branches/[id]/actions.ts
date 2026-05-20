"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function addBranchAliasAction(branchId: number, formData: FormData) {
  await requireAuth();
  const name = String(formData.get("aliasName") || "").trim();
  if (!name) return;
  await prisma.branchAlias.create({ data: { branchId, name } });
  revalidatePath(`/branches/${branchId}`);
}

export async function deleteBranchAliasAction(branchId: number, aliasId: number) {
  await requireAuth();
  await prisma.branchAlias.delete({ where: { id: aliasId } });
  revalidatePath(`/branches/${branchId}`);
}

async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
}

export async function updateBranchInfoAction(branchId: number, formData: FormData) {
  await requireAuth();
  await prisma.branch.update({
    where: { id: branchId },
    data: {
      name: String(formData.get("name") || "").trim(),
      region: String(formData.get("region") || "").trim(),
      status: String(formData.get("status")) === "inactive" ? "inactive" : "active",
      managerName: String(formData.get("managerName") || "").trim(),
      phone: String(formData.get("phone") || "").trim(),
      address: String(formData.get("address") || "").trim() || null,
      memo: String(formData.get("memo") || "").trim() || null,
    },
  });

  revalidatePath("/branches");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}?saved=1`);
}

export async function updatePermissionsAction(branchId: number, formData: FormData) {
  await requireAuth();
  const mode = String(formData.get("mode") || "");
  const selectedIds = new Set(
    formData.getAll("programId").map((v) => Number.parseInt(String(v), 10)).filter((v) => !Number.isNaN(v)),
  );

  if (mode === "enable_all" || mode === "disable_all") {
    const enabled = mode === "enable_all";
    const programs = await prisma.program.findMany({ select: { id: true } });
    await prisma.$transaction(
      programs.map((p) =>
        prisma.branchProgramPermission.upsert({
          where: { branchId_programId: { branchId, programId: p.id } },
          create: { branchId, programId: p.id, isEnabled: enabled },
          update: { isEnabled: enabled },
        }),
      ),
    );
  } else {
    const programs = await prisma.program.findMany({ select: { id: true } });
    await prisma.$transaction(
      programs.map((p) =>
        prisma.branchProgramPermission.upsert({
          where: { branchId_programId: { branchId, programId: p.id } },
          create: { branchId, programId: p.id, isEnabled: selectedIds.has(p.id) },
          update: { isEnabled: selectedIds.has(p.id) },
        }),
      ),
    );
  }

  revalidatePath("/permissions");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}?saved=1`);
}
