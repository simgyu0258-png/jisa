"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

export async function createInstitutionAction(branchId: number, name: string): Promise<number> {
  const session = await auth();
  if (!session) redirect("/login");

  const institution = await prisma.institution.create({ data: { branchId, name } });
  revalidatePath("/sales");
  return institution.id;
}

async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
}

export async function upsertSaleOrderAction(
  institutionId: number,
  programId: number,
  issueNumber: number,
  orderDate: string,
  quantity: number,
) {
  await requireAuth();

  await prisma.saleOrder.upsert({
    where: { institutionId_programId_issueNumber: { institutionId, programId, issueNumber } },
    create: { institutionId, programId, issueNumber, orderDate, quantity: Math.max(0, quantity) },
    update: { orderDate, quantity: Math.max(0, quantity) },
  });

  revalidatePath("/sales");
  revalidatePath("/");
}

export async function deleteSaleOrderAction(institutionId: number, programId: number, issueNumber: number) {
  await requireAuth();

  await prisma.saleOrder.deleteMany({
    where: { institutionId, programId, issueNumber },
  });

  revalidatePath("/sales");
  revalidatePath("/");
}
