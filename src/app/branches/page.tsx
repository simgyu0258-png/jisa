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
      permissions: { where: { isEnabled: true } },
      sales: { where: { yearMonth } },
    },
    orderBy,
  });

  const rows = branches
    .map((branch) => ({
      ...branch,
      enabledCount: branch.permissions.length,
      monthTotal: branch.sales.reduce((sum, sale) => sum + sale.quantity, 0),
    }))
    .sort((a, b) => (sort === "sales" ? b.monthTotal - a.monthTotal : 0));

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">지사 관리</h1>
        <Link className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white" href="/branches/new">
          지사 등록
        </Link>
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
              <th className="px-3 py-2 text-left">지사코드</th>
              <th className="px-3 py-2 text-left">지사명</th>
              <th className="px-3 py-2 text-left">지역</th>
              <th className="px-3 py-2 text-left">상태</th>
              <th className="px-3 py-2 text-right">활성화 프로그램</th>
              <th className="px-3 py-2 text-right">이번 달 판매부수</th>
              <th className="px-3 py-2 text-left">최근 수정일</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((branch) => (
              <tr className="border-t border-slate-200" key={branch.id}>
                <td className="px-3 py-2">{branch.branchCode}</td>
                <td className="px-3 py-2">
                  <Link className="font-medium text-slate-900 underline" href={`/branches/${branch.id}`}>
                    {branch.name}
                  </Link>
                </td>
                <td className="px-3 py-2">{branch.region}</td>
                <td className="px-3 py-2">{branch.status}</td>
                <td className="px-3 py-2 text-right">{branch.enabledCount}</td>
                <td className="px-3 py-2 text-right">{branch.monthTotal.toLocaleString()}</td>
                <td className="px-3 py-2">{branch.updatedAt.toISOString().slice(0, 10)}</td>
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
