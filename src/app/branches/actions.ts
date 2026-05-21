"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";

async function requireAuth() {
  const session = await auth();
  if (!session) redirect("/login");
}

async function generateBranchCode() {
  const lastBranch = await prisma.branch.findFirst({
    orderBy: { id: "desc" },
    select: { branchCode: true },
  });

  const nextNumber = lastBranch
    ? Number.parseInt(lastBranch.branchCode.replace(/^[A-Z]+/, ""), 10) + 1
    : 1;

  return `JS${String(nextNumber).padStart(3, "0")}`;
}

export async function createBranchAction(formData: FormData) {
  await requireAuth();
  const name = String(formData.get("name") || "").trim();
  const region = String(formData.get("region") || "").trim();
  const status = String(formData.get("status") || "active");
  const managerName = String(formData.get("managerName") || "").trim();
  const phone = String(formData.get("phone") || "").trim();
  const address = String(formData.get("address") || "").trim();
  const memo = String(formData.get("memo") || "").trim();

  if (!name || !region || !managerName || !phone) {
    redirect("/branches/new?error=required");
  }

  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });
  const branchCode = await generateBranchCode();

  const aliases = formData.getAll("alias")
    .map((v) => String(v).trim())
    .filter((v) => v.length > 0);

  const branch = await prisma.branch.create({
    data: {
      branchCode,
      name,
      region,
      status: status === "inactive" ? "inactive" : "active",
      managerName,
      phone,
      address: address || null,
      memo: memo || null,
      permissions: {
        create: programs.map((program) => ({
          programId: program.id,
          isEnabled: false,
        })),
      },
      aliases: aliases.length > 0
        ? { create: aliases.map((n) => ({ name: n })) }
        : undefined,
    },
  });

  revalidatePath("/branches");
  redirect(`/branches/${branch.id}`);
}
