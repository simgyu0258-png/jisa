import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { TargetsClient } from "./targets-client";

type Params = { year?: string };

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session || (session.user as { role?: string }).role !== "master") redirect("/");

  const currentYear = new Date().getFullYear();
  const year = params.year ? Number(params.year) : currentYear;

  const [branches, programs, targets, prevTargets, oldestOrder] = await Promise.all([
    prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.salesTarget.findMany({ where: { year } }),
    prisma.salesTarget.findMany({ where: { year: year - 1 } }),
    prisma.saleOrder.findFirst({ orderBy: { orderDate: "asc" }, select: { orderDate: true } }),
  ]);

  const minYear = oldestOrder
    ? Math.min(Number(oldestOrder.orderDate.slice(0, 4)), currentYear)
    : currentYear;

  const initialTargets: Record<string, number> = {};
  for (const t of targets) {
    initialTargets[`${t.branchId}-${t.programId}`] = t.quantity;
  }

  const prevTargetMap: Record<string, number> = {};
  for (const t of prevTargets) {
    prevTargetMap[`${t.branchId}-${t.programId}`] = t.quantity;
  }

  return (
    <TargetsClient
      key={year}
      branches={branches}
      programs={programs}
      year={year}
      minYear={minYear}
      initialTargets={initialTargets}
      prevTargetMap={prevTargetMap}
    />
  );
}
