"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";

export async function addProgramAction(formData: FormData) {
  const name = String(formData.get("name") || "").trim();
  if (!name) return;

  await prisma.program.create({ data: { name } });
  revalidatePath("/programs");
}

export async function renameProgramAction(id: number, name: string) {
  const trimmed = name.trim();
  if (!trimmed) return;

  await prisma.program.update({ where: { id }, data: { name: trimmed } });
  revalidatePath("/programs");
}

export async function deleteProgramAction(id: number) {
  await prisma.program.delete({ where: { id } });
  revalidatePath("/programs");
}
