import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
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

  const view = params.view === "issue" ? "issue" : "monthly";
  const branchId = params.branchId ? Number(params.branchId) : undefined;
  const year = params.year ?? new Date().getFullYear().toString();

  const [branches, programs, allInstitutions] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.institution.findMany({
      include: { branch: { select: { name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const monthlyOrders = view === "monthly"
    ? await prisma.saleOrder.findMany({
        where: { orderDate: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
        select: { institutionId: true, programId: true, orderDate: true, quantity: true },
      })
    : [];

  const issueOrders = view === "issue"
    ? await prisma.saleOrder.findMany({
        where: { orderDate: { gte: `${year}-01-01`, lte: `${year}-12-31` } },
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
        view={view}
        selectedBranchId={branchId}
        selectedYear={year}
        maxIssues={maxIssues}
        canEdit={!!session}
      />
    </div>
  );
}
