import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import { SalesFilterClient } from "./filter-client";
import { SalesUploadClient } from "./upload-client";

type Params = { yearMonth?: string | string[]; q?: string; region?: string; status?: string };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;

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
      },
      orderBy: { name: "asc" },
    }),
  ]);

  branches.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  const downloadQuery = yearMonths.map((ym) => `yearMonth=${ym}`).join("&");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매부수 조회 및 관리</h1>

      <SalesFilterClient
        q={q}
        region={region}
        selectedMonths={yearMonths}
        status={status}
      />

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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">지사</th>
              {programs.map((program) => (
                <th className="px-3 py-2 text-right" key={program.id}>
                  {program.name}
                </th>
              ))}
              <th className="px-3 py-2 text-right">합계</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const map = new Map<number, number>();
              for (const sale of branch.sales) {
                map.set(sale.programId, (map.get(sale.programId) ?? 0) + sale.quantity);
              }
              const total = programs.reduce((sum, p) => sum + (map.get(p.id) ?? 0), 0);

              return (
                <tr className="border-t border-slate-200" key={branch.id}>
                  <td className="px-3 py-2">{branch.name}</td>
                  {programs.map((program) => (
                    <td className="px-3 py-2 text-right" key={program.id}>
                      {(map.get(program.id) ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{total.toLocaleString()}</td>
                </tr>
              );
            })}
            {branches.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={programs.length + 2}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <SalesUploadClient />
    </div>
  );
}
