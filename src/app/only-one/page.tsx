import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear, getFiscalYearRange, getFiscalYearFromDate } from "@/lib/month";
import { OnlyOneClient } from "./only-one-client";

type Params = { year?: string };

export default async function OnlyOnePage({ searchParams }: { searchParams: Promise<Params> }) {
  const [session, params] = await Promise.all([auth(), searchParams]);
  if (!session) redirect("/login");

  const currentYear = getCurrentFiscalYear();
  const year = params.year ? Number(params.year) : currentYear;
  const { gte, lt } = getFiscalYearRange(year);

  const [branches, targets, oldestContract] = await Promise.all([
    prisma.branch.findMany({ where: { status: "active" }, orderBy: { name: "asc" } }),
    prisma.onlyOneTarget.findMany({ where: { year } }),
    prisma.onlyOneContract.findFirst({ orderBy: { startDate: "asc" }, select: { startDate: true } }),
  ]);

  const minYear = oldestContract ? getFiscalYearFromDate(oldestContract.startDate) : currentYear;

  // 회계연도 내 활성 계약: startDate < lt AND (endDate IS NULL OR endDate >= gte)
  const activeContracts = await prisma.onlyOneContract.findMany({
    where: { startDate: { lt }, OR: [{ endDate: null }, { endDate: { gte } }] },
    select: { institutionId: true, classCount: true, institution: { select: { branchId: true } } },
  });

  const targetMap = new Map(targets.map((t) => [t.branchId, t.classCount]));
  const activeMap = new Map<number, number>();
  for (const c of activeContracts) {
    const bid = c.institution.branchId;
    activeMap.set(bid, (activeMap.get(bid) ?? 0) + c.classCount);
  }

  const summaries = branches.map((branch) => ({
    branch,
    target: targetMap.get(branch.id) ?? 0,
    activeClasses: activeMap.get(branch.id) ?? 0,
  }));

  return (
    <OnlyOneClient
      year={year}
      minYear={minYear}
      currentYear={currentYear}
      branches={branches}
      summaries={summaries}
    />
  );
}
