"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getPreviousYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

function toInt(value: FormDataEntryValue | null) {
  return Number.parseInt(String(value ?? "0"), 10) || 0;
}

export async function updateBranchInfoAction(branchId: number, formData: FormData) {
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
  redirect(`/branches/${branchId}`);
}

export async function updatePermissionsAction(branchId: number, formData: FormData) {
  const mode = String(formData.get("mode") || "");
  const selectedIds = new Set(
    formData
      .getAll("programId")
      .map((value) => Number.parseInt(String(value), 10))
      .filter((value) => !Number.isNaN(value)),
  );

  const copyFromId = String(formData.get("copyFromId") || "");
  if (copyFromId) {
    const sourceId = Number.parseInt(copyFromId, 10);
    const sourcePermissions = await prisma.branchProgramPermission.findMany({
      where: { branchId: sourceId },
    });

    await prisma.$transaction(
      sourcePermissions.map((permission) =>
        prisma.branchProgramPermission.upsert({
          where: {
            branchId_programId: { branchId, programId: permission.programId },
          },
          create: {
            branchId,
            programId: permission.programId,
            isEnabled: permission.isEnabled,
          },
          update: { isEnabled: permission.isEnabled },
        }),
      ),
    );
  } else if (mode === "enable_all" || mode === "disable_all") {
    const enabled = mode === "enable_all";
    const programs = await prisma.program.findMany({ select: { id: true } });
    await prisma.$transaction(
      programs.map((program) =>
        prisma.branchProgramPermission.upsert({
          where: { branchId_programId: { branchId, programId: program.id } },
          create: { branchId, programId: program.id, isEnabled: enabled },
          update: { isEnabled: enabled },
        }),
      ),
    );
  } else {
    const programs = await prisma.program.findMany({ select: { id: true } });
    await prisma.$transaction(
      programs.map((program) =>
        prisma.branchProgramPermission.upsert({
          where: { branchId_programId: { branchId, programId: program.id } },
          create: {
            branchId,
            programId: program.id,
            isEnabled: selectedIds.has(program.id),
          },
          update: { isEnabled: selectedIds.has(program.id) },
        }),
      ),
    );
  }

  revalidatePath("/permissions");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}`);
}

export async function saveSalesAction(branchId: number, formData: FormData) {
  const yearMonth = String(formData.get("yearMonth"));
  const programIds = formData.getAll("programId");

  const programIdInts = programIds.map((id) => Number.parseInt(String(id), 10));

  await prisma.$transaction(async (tx) => {
    await tx.sale.deleteMany({ where: { branchId, yearMonth, programId: { in: programIdInts } } });

    await tx.sale.createMany({
      data: programIdInts.map((programId) => ({
        branchId,
        yearMonth,
        programId,
        quantity: Math.max(0, toInt(formData.get(`quantity_${programId}`))),
      })),
    });
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}?ym=${yearMonth}`);
}

export async function copyPreviousMonthAction(branchId: number, formData: FormData) {
  const yearMonth = String(formData.get("yearMonth"));
  const prevYearMonth = getPreviousYearMonth(yearMonth);

  const prevSales = await prisma.sale.findMany({
    where: { branchId, yearMonth: prevYearMonth },
  });

  await prisma.$transaction(async (tx) => {
    await tx.sale.deleteMany({ where: { branchId, yearMonth } });
    if (prevSales.length > 0) {
      await tx.sale.createMany({
        data: prevSales.map((sale) => ({
          branchId,
          yearMonth,
          programId: sale.programId,
          quantity: sale.quantity,
        })),
      });
    }
  });

  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}?ym=${yearMonth}`);
}

export async function resetSalesAction(branchId: number, formData: FormData) {
  const yearMonth = String(formData.get("yearMonth"));
  await prisma.sale.deleteMany({ where: { branchId, yearMonth } });
  revalidatePath("/");
  revalidatePath("/sales");
  revalidatePath(`/branches/${branchId}`);
  redirect(`/branches/${branchId}?ym=${yearMonth}`);
}
