"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
}

export async function addSkipRuleAction(formData: FormData) {
  await requireAuth();
  const keyword1 = String(formData.get("keyword1") || "").trim();
  const keyword2 = String(formData.get("keyword2") || "").trim() || null;
  if (!keyword1) return;
  await prisma.erpSkipRule.create({ data: { keyword1, keyword2 } });
  revalidatePath("/erp-rules");
}

export async function deleteSkipRuleAction(id: number) {
  await requireAuth();
  await prisma.erpSkipRule.delete({ where: { id } });
  revalidatePath("/erp-rules");
}

export async function updateMappingAction(id: number, programId: number, issueNumber: number) {
  await requireAuth();
  await prisma.erpProductMapping.update({
    where: { id },
    data: { programId, issueNumber },
  });
  revalidatePath("/erp-rules");
}

export async function deleteMappingAction(id: number) {
  await requireAuth();
  await prisma.erpProductMapping.delete({ where: { id } });
  revalidatePath("/erp-rules");
}
