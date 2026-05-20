import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear, getFiscalYearFromDate } from "@/lib/month";
import { TargetsClient } from "./targets-client";

type Params = { year?: string };

export default async function TargetsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session) redirect("/login");

  const currentYear = getCurrentFiscalYear();
  const year = params.year ? Number(params.year) : currentYear;

  const [branches, programs, targets, prevTargets, oldestOrder, permissions, onlyOneTargets, prevOnlyOneTargets] = await Promise.all([
    prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.salesTarget.findMany({ where: { year } }),
    prisma.salesTarget.findMany({ where: { year: year - 1 } }),
    prisma.saleOrder.findFirst({ orderBy: { orderDate: "asc" }, select: { orderDate: true } }),
    prisma.branchProgramPermission.findMany({ where: { isEnabled: true }, select: { branchId: true, programId: true } }),
    prisma.onlyOneTarget.findMany({ where: { year } }),
    prisma.onlyOneTarget.findMany({ where: { year: year - 1 } }),
  ]);

  const minYear = oldestOrder
    ? Math.min(getFiscalYearFromDate(oldestOrder.orderDate), currentYear)
    : currentYear;

  const initialTargets: Record<string, number> = {};
  for (const t of targets) {
    initialTargets[`${t.branchId}-${t.programId}`] = t.quantity;
  }

  const prevTargetMap: Record<string, number> = {};
  for (const t of prevTargets) {
    prevTargetMap[`${t.branchId}-${t.programId}`] = t.quantity;
  }

  const enabledKeys = permissions.map((p) => `${p.branchId}-${p.programId}`);

  const initialOnlyOneTargets: Record<number, number> = {};
  for (const t of onlyOneTargets) initialOnlyOneTargets[t.branchId] = t.classCount;

  const prevOnlyOneTargetMap: Record<number, number> = {};
  for (const t of prevOnlyOneTargets) prevOnlyOneTargetMap[t.branchId] = t.classCount;

  return (
    <TargetsClient
      key={year}
      branches={branches}
      programs={programs}
      year={year}
      minYear={minYear}
      initialTargets={initialTargets}
      prevTargetMap={prevTargetMap}
      enabledKeys={enabledKeys}
      initialOnlyOneTargets={initialOnlyOneTargets}
      prevOnlyOneTargetMap={prevOnlyOneTargetMap}
    />
  );
}
