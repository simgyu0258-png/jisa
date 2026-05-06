import { auth } from "@/auth";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import { SalesFilterClient } from "./filter-client";
import { SalesTableClient } from "./sales-table-client";
import { SalesUploadClient } from "./upload-client";

type Params = { yearMonth?: string | string[]; q?: string; region?: string; status?: string };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const [params, session] = await Promise.all([searchParams, auth()]);

  const rawYearMonth = params.yearMonth;
  const yearMonths: string[] =
    rawYearMonth == null
      ? [getCurrentYearMonth()]
      : Array.isArray(rawYearMonth)
        ? rawYearMonth
        : [rawYearMonth];

  const q = params.q?.trim() ?? "";
  const region = params.region?.trim() ?? "";
  const status = params.status?.trim() ?? "";

  const [programs, branches] = await Promise.all([
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.branch.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(region ? { region: { contains: region } } : {}),
        ...(status === "active" || status === "inactive" ? { status } : {}),
      },
      include: {
        sales: { where: { yearMonth: { in: yearMonths } }, orderBy: { programId: "asc" } },
        permissions: { select: { programId: true, isEnabled: true } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  branches.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const downloadQuery = yearMonths.map((ym) => `yearMonth=${ym}`).join("&");
  const canEdit = !!session;

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매부수 조회 및 관리</h1>

      <SalesFilterClient q={q} region={region} selectedMonths={yearMonths} status={status} />

      <div className="flex items-center gap-2">
        <a
          className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          href={`/api/sales/excel/download?${downloadQuery}`}
        >
          엑셀 다운로드
          {yearMonths.length > 1 && ` (${yearMonths.length}개월)`}
        </a>
        <span className="text-xs text-slate-400">
          {yearMonths.length === 1
            ? yearMonths[0]
            : `${yearMonths[0]} ~ ${yearMonths[yearMonths.length - 1]}`}
          {" "}합산 기준
        </span>
      </div>

      <SalesTableClient
        branches={branches}
        canEdit={canEdit}
        programs={programs}
        selectedMonths={yearMonths}
      />

      <SalesUploadClient />
    </div>
  );
}
