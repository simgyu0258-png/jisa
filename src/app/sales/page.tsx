import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import { SalesUploadClient } from "./upload-client";

type Params = { yearMonth?: string; q?: string; region?: string; status?: string };

export default async function SalesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const yearMonth = params.yearMonth ?? getCurrentYearMonth();
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
        sales: { where: { yearMonth }, orderBy: { programId: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매부수 관리</h1>

      <form className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input defaultValue={yearMonth} name="yearMonth" />
        <input defaultValue={q} name="q" placeholder="지사명 검색" />
        <input defaultValue={region} name="region" placeholder="지역 필터" />
        <select defaultValue={status} name="status">
          <option value="">전체 상태</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button className="rounded-md bg-slate-100 px-3 py-2 text-sm">조회</button>
      </form>

      <a
        className="inline-block rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
        href={`/api/sales/excel/download?yearMonth=${yearMonth}`}
      >
        엑셀 다운로드
      </a>

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
              const map = new Map(branch.sales.map((sale) => [sale.programId, sale.quantity]));
              const total = programs.reduce((sum, program) => sum + (map.get(program.id) ?? 0), 0);

              return (
                <tr className="border-t border-slate-200" key={branch.id}>
                  <td className="px-3 py-2">{branch.name}</td>
                  {programs.map((program) => (
                    <td className="px-3 py-2 text-right" key={program.id}>
                      {map.get(program.id) ?? 0}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{total}</td>
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
