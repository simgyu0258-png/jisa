import { auth } from "@/auth";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import { SalesViewClient } from "./sales-view-client";

type Params = {
  view?: string;
  branchId?: string;
  programId?: string;
  ym?: string;
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

  const [branches, programs, institutions] = await Promise.all([
    prisma.branch.findMany({ orderBy: { name: "asc" } }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.institution.findMany({
      where: branchId ? { branchId } : undefined,
      include: { branch: { select: { name: true } } },
      orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  // 월별 뷰: 선택 월의 주문 집계 (기관 × 프로그램)
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

  // 호별 뷰: 선택 프로그램의 호별 집계 (기관 × 호)
  const issueOrders = view === "issue"
    ? await prisma.saleOrder.findMany({
        where: {
          ...(programId ? { programId } : {}),
          ...(branchId ? { institution: { branchId } } : {}),
        },
        select: { institutionId: true, issueNumber: true, quantity: true, orderDate: true },
      })
    : [];

  const selectedProgram = programs.find((p) => p.id === programId);
  const maxIssues = selectedProgram?.totalIssues ?? Math.max(...programs.map((p) => p.totalIssues), 12);

  // 모달용: 전체 기관 목록 (branchId 필터 없이)
  const allInstitutions = branchId
    ? await prisma.institution.findMany({
        include: { branch: { select: { name: true } } },
        orderBy: [{ branch: { name: "asc" } }, { name: "asc" }],
      })
    : institutions;

  const instList = institutions.map((inst) => ({
    id: inst.id,
    name: inst.name,
    branchName: inst.branch.name,
    branchId: inst.branchId,
  }));

  const allInstList = allInstitutions.map((inst) => ({
    id: inst.id,
    name: inst.name,
    branchName: inst.branch.name,
    branchId: inst.branchId,
  }));

  return (
    <SalesViewClient
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
      maxIssues={maxIssues}
      canEdit={!!session}
    />
  );
}
