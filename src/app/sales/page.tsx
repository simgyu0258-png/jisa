import Link from "next/link";
import { auth } from "@/auth";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import { SalesViewClient } from "./sales-view-client";

type Params = {
  view?: string;
  branchId?: string;
  programId?: string;
  ym?: string;
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
  const programId = params.programId ? Number(params.programId) : undefined;
  const ym = params.ym ?? getCurrentYearMonth();
  const year = params.year ?? new Date().getFullYear().toString();

  const [branches, programs, institutions] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.institution.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  const monthlyOrders = view === "monthly"
    ? await prisma.saleOrder.findMany({
        where: {
          orderDate: { startsWith: ym },
          ...(branchId ? { institution: { branchId } } : {}),
          ...(programId ? { programId } : {}),
        },
        select: { institutionId: true, programId: true, quantity: true },
      })
    : [];

  // 호별: 해당 연도 전체 데이터 — 클라이언트에서 셀 클릭 시 모달에 활용
  const issueOrders = view === "issue"
    ? await prisma.saleOrder.findMany({
        where: {
          orderDate: { gte: `${year}-01-01`, lte: `${year}-12-31` },
        },
        select: { institutionId: true, programId: true, issueNumber: true, quantity: true },
      })
    : [];

  const maxIssues = Math.max(...programs.map((p) => p.totalIssues), 12);

  const allInstitutions = await prisma.institution.findMany({
    include: { branch: { select: { name: true } } },
    orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
  });

  const instList = institutions.map((inst) => ({
    id: inst.id, name: inst.name, branchName: inst.branch.name, branchId: inst.branchId,
  }));

  const allInstList = allInstitutions.map((inst) => ({
    id: inst.id, name: inst.name, branchName: inst.branch.name, branchId: inst.branchId,
  }));

  return (
    <div className="space-y-4">
      <SalesViewClient
        canBulkEdit={!!session}
        branches={branches}
        programs={programs}
        institutions={instList}
        allInstitutions={allInstList}
        monthlyOrders={monthlyOrders}
        issueOrders={issueOrders}
        view={view}
        selectedBranchId={branchId}
        selectedProgramId={programId}
        selectedYm={ym}
        selectedYear={year}
        maxIssues={maxIssues}
        canEdit={!!session}
      />
    </div>
  );
}
