import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear, getFiscalYearRange, getFiscalYearFromDate, getIssueAwareDateWhere } from "@/lib/month";
import { SalesViewClient } from "./sales-view-client";

type Params = {
  view?: string;
  branchId?: string;
  year?: string;
};

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, session] = await Promise.all([searchParams, auth()]);

  const view = params.view === "issue" ? "issue"
    : params.view === "target" ? "target"
    : params.view === "institution" ? "institution"
    : "monthly";
  const branchId = params.branchId ? Number(params.branchId) : undefined;
  const year = params.year ?? String(getCurrentFiscalYear());

  const [branches, programs, allInstitutions, oldestOrder] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true, totalIssues: true, isOnlyOne: true } }),
    prisma.institution.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    }),
    prisma.saleOrder.findFirst({ orderBy: { orderDate: "asc" }, select: { orderDate: true } }),
  ]);

  const fiscalYear = getCurrentFiscalYear();
  const minYear = oldestOrder ? getFiscalYearFromDate(oldestOrder.orderDate) : fiscalYear;
  const { gte, lt } = getFiscalYearRange(Number(year));

  const monthlyOrders = view === "monthly"
    ? await prisma.saleOrder.findMany({
        where: { orderDate: { gte, lt } },
        select: { institutionId: true, programId: true, orderDate: true, quantity: true },
      })
    : [];

  const issueOrders = view === "issue"
    ? await prisma.saleOrder.findMany({
        where: getIssueAwareDateWhere(Number(year)),
        select: { institutionId: true, programId: true, issueNumber: true, quantity: true },
      })
    : [];

  // 월별/호별/기관 탭용 온리원 계약 (회계연도 내 겹치는 계약 전체)
  const viewOnlyOneContracts = (view === "monthly" || view === "issue" || view === "institution")
    ? await prisma.onlyOneContract.findMany({
        where: { startDate: { lt }, OR: [{ endDate: null }, { endDate: { gte } }] },
        select: { id: true, institutionId: true, classCount: true, startDate: true, endDate: true, institution: { select: { branchId: true } } },
      })
    : [];

  const salesTargets = view === "target"
    ? await prisma.salesTarget.findMany({ where: { year: Number(year) } })
    : [];

  const targetActualOrders = view === "target"
    ? await prisma.saleOrder.findMany({
        where: { orderDate: { gte, lt } },
        select: { institutionId: true, programId: true, quantity: true },
      })
    : [];

  const targetPermissions = view === "target"
    ? await prisma.branchProgramPermission.findMany({
        where: { isEnabled: true },
        select: { branchId: true, programId: true },
      })
    : [];

  const onlyOneTargets = view === "target"
    ? await prisma.onlyOneTarget.findMany({ where: { year: Number(year) } })
    : [];

  const today = new Date().toISOString().slice(0, 10);
  const onlyOneContracts = view === "target"
    ? await prisma.onlyOneContract.findMany({
        where: { startDate: { lte: today }, OR: [{ endDate: null }, { endDate: { gte: today } }] },
        select: { classCount: true, institution: { select: { branchId: true } } },
      })
    : [];

  const institutionOrders = view === "institution"
    ? await prisma.saleOrder.findMany({
        where: {
          ...getIssueAwareDateWhere(Number(year)),
          ...(branchId ? { institution: { branchId } } : {}),
        },
        select: { institutionId: true, programId: true, issueNumber: true, quantity: true },
      })
    : [];

  const maxIssues = Math.max(...programs.map((p) => p.totalIssues), 12);

  const allInstList = allInstitutions.map((inst) => ({
    id: inst.id, name: inst.name, branchName: inst.branch.name, branchId: inst.branchId,
  }));

  return (
    <div className="space-y-4">
      <SalesViewClient
        branches={branches}
        programs={programs}
        allInstitutions={allInstList}
        monthlyOrders={monthlyOrders}
        issueOrders={issueOrders}
        viewOnlyOneContracts={viewOnlyOneContracts.map(c => ({ institutionId: c.institutionId, classCount: c.classCount, startDate: c.startDate, endDate: c.endDate, branchId: c.institution.branchId }))}
        salesTargets={salesTargets}
        targetActualOrders={targetActualOrders}
        targetPermissions={targetPermissions}
        onlyOneTargets={onlyOneTargets}
        onlyOneContracts={onlyOneContracts.map((c) => ({ classCount: c.classCount, branchId: c.institution.branchId }))}
        institutionOrders={institutionOrders}
        view={view}
        selectedBranchId={branchId}
        selectedYear={year}
        minYear={minYear}
        fiscalYear={fiscalYear}
        maxIssues={maxIssues}
        canEdit={!!session}
      />
    </div>
  );
}
