"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addProgramAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const totalIssues = Math.max(1, Number(formData.get("totalIssues")) || 12);
  if (!name) return;

  await prisma.program.create({ data: { name, totalIssues } });
  revalidatePath("/programs");
}

export async function updateProgramAction(id: number, formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  const totalIssues = Math.max(1, Number(formData.get("totalIssues")) || 12);
  if (!name) return;

  await prisma.program.update({ where: { id }, data: { name, totalIssues } });
  revalidatePath("/programs");
}

export async function deleteProgramAction(id: number) {
  await prisma.program.delete({ where: { id } });
  revalidatePath("/programs");
}
