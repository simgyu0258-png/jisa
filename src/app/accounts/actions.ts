"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireMaster() {
  const session = await auth();
  if (!session || session.user.role !== "master") redirect("/");
}

export async function createAccountAction(formData: FormData) {
  await requireMaster();

  const email = String(formData.get("email") || "").trim();
  const name = String(formData.get("name") || "").trim();
  const password = String(formData.get("password") || "");
  const role = String(formData.get("role") || "user");

  if (!email || !name || !password) redirect("/accounts?error=required");

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.create({ data: { email, name, password: hashed, role } });

  revalidatePath("/accounts");
  redirect("/accounts");
}

export async function deleteAccountAction(userId: number) {
  await requireMaster();
  const session = await auth();
  if (String(userId) === session!.user.id) redirect("/accounts?error=self");

  await prisma.user.delete({ where: { id: userId } });
  revalidatePath("/accounts");
}

export async function resetPasswordAction(userId: number, formData: FormData) {
  await requireMaster();

  const password = String(formData.get("password") || "");
  if (!password) redirect("/accounts?error=required");

  const hashed = await bcrypt.hash(password, 12);
  await prisma.user.update({ where: { id: userId }, data: { password: hashed } });
  revalidatePath("/accounts");
  redirect("/accounts");
}
