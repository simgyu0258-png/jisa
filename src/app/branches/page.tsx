import Link from "next/link";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";

type Params = {
  q?: string;
  region?: string;
  status?: "active" | "inactive";
  sort?: "name" | "region" | "updatedAt" | "sales";
};

export default async function BranchesPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const region = params.region?.trim() ?? "";
  const status = params.status ?? "";
  const sort = params.sort ?? "updatedAt";
  const yearMonth = getCurrentYearMonth();

  const where = {
    ...(q ? { name: { contains: q } } : {}),
    ...(region ? { region: { contains: region } } : {}),
    ...(status === "active" || status === "inactive" ? { status } : {}),
  };

  const orderBy =
    sort === "name"
      ? { name: "asc" as const }
      : sort === "region"
        ? { region: "asc" as const }
        : { updatedAt: "desc" as const };

  const branches = await prisma.branch.findMany({
    where,
    include: {
      permissions: { where: { isEnabled: true }, include: { program: true } },
      sales: { where: { yearMonth } },
    },
    orderBy,
  });

  const rows = branches
    .map((branch) => ({
      ...branch,
      enabledPrograms: branch.permissions.map((p) => p.program.name),
      monthTotal: branch.sales.reduce((sum, sale) => sum + sale.quantity, 0),
    }))
    .sort((a, b) => (sort === "sales" ? b.monthTotal - a.monthTotal : 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">지사 관리</h1>
        <div className="flex gap-2">
          <Link
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            href="/branches/bulk-edit"
          >
            일괄 수정
          </Link>
          <Link
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            href="/branches/bulk"
          >
            일괄 등록
          </Link>
          <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" href="/branches/new">
            지사 등록
          </Link>
        </div>
      </div>

      <form className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-5">
        <input defaultValue={q} name="q" placeholder="지사명 검색" />
        <input defaultValue={region} name="region" placeholder="지역 필터" />
        <select defaultValue={status} name="status">
          <option value="">전체 상태</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <select defaultValue={sort} name="sort">
          <option value="updatedAt">최근 수정일</option>
          <option value="name">지사명</option>
          <option value="region">지역</option>
          <option value="sales">이번 달 판매부수</option>
        </select>
        <button className="rounded-md bg-slate-100 px-3 py-2 text-sm">조회</button>
      </form>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="px-3 py-2 text-center">지사코드</th>
              <th className="px-3 py-2 text-center">지역</th>
              <th className="px-3 py-2 text-center">지사명</th>
              <th className="px-3 py-2 text-center">프로그램</th>
              <th className="px-3 py-2 text-center">이번 달 판매부수</th>
              <th className="px-3 py-2 text-center">상태</th>
              <th className="px-3 py-2 text-center">최근 수정일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((branch) => (
              <tr className="border-t border-slate-200" key={branch.id}>
                <td className="px-3 py-2 text-center">{branch.branchCode}</td>
                <td className="px-3 py-2 text-center">{branch.region}</td>
                <td className="px-3 py-2 text-center">
                  <Link className="font-medium text-slate-900 underline" href={`/branches/${branch.id}`}>
                    {branch.name}
                  </Link>
                </td>
                <td className="px-3 py-2">
                  <div className="flex flex-wrap justify-center gap-1">
                    {branch.enabledPrograms.map((name) => (
                      <span
                        key={name}
                        className="rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-700"
                      >
                        {name}
                      </span>
                    ))}
                    {branch.enabledPrograms.length === 0 && (
                      <span className="text-xs text-slate-400">없음</span>
                    )}
                  </div>
                </td>
                <td className="px-3 py-2 text-center">{branch.monthTotal.toLocaleString()}</td>
                <td className="px-3 py-2 text-center">{branch.status}</td>
                <td className="px-3 py-2 text-center">{branch.updatedAt.toISOString().slice(0, 10)}</td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={7}>
                  조건에 맞는 지사가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
