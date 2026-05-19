import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getCurrentFiscalYear, getFiscalYearRange, getFiscalYearFromDate } from "@/lib/month";
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
    prisma.program.findMany({ orderBy: { id: "asc" } }),
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
        where: { orderDate: { gte, lt } },
        select: { institutionId: true, programId: true, issueNumber: true, quantity: true },
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

  const institutionOrders = view === "institution"
    ? await prisma.saleOrder.findMany({
        where: {
          orderDate: { gte, lt },
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
        canBulkEdit={!!session}
        branches={branches}
        programs={programs}
        allInstitutions={allInstList}
        monthlyOrders={monthlyOrders}
        issueOrders={issueOrders}
        salesTargets={salesTargets}
        targetActualOrders={targetActualOrders}
        targetPermissions={targetPermissions}
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
