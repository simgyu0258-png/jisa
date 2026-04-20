import Link from "next/link";
import { notFound } from "next/navigation";
import { getCurrentYearMonth } from "@/lib/month";
import { prisma } from "@/lib/prisma";
import {
  copyPreviousMonthAction,
  resetSalesAction,
  saveSalesAction,
  updateBranchInfoAction,
  updatePermissionsAction,
} from "./actions";

export default async function BranchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ ym?: string }>;
}) {
  const { id } = await params;
  const { ym } = await searchParams;
  const branchId = Number.parseInt(id, 10);
  const selectedYearMonth = ym ?? getCurrentYearMonth();

  const [branch, programs] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        permissions: { include: { program: true }, orderBy: { programId: "asc" } },
      },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!branch) {
    notFound();
  }

  const [monthSales, salesHistory] = await Promise.all([
    prisma.sale.findMany({
      where: { branchId, yearMonth: selectedYearMonth },
      orderBy: { programId: "asc" },
    }),
    prisma.sale.findMany({
      where: { branchId },
      include: { program: true },
      orderBy: [{ yearMonth: "desc" }, { programId: "asc" }],
    }),
  ]);

  const salesByProgramId = new Map(monthSales.map((sale) => [sale.programId, sale.quantity]));
  const permissionSet = new Set(
    branch.permissions.filter((permission) => permission.isEnabled).map((permission) => permission.programId),
  );

  const groupedHistory = salesHistory.reduce<Record<string, Record<number, number>>>((acc, sale) => {
    if (!acc[sale.yearMonth]) acc[sale.yearMonth] = {};
    acc[sale.yearMonth][sale.programId] = sale.quantity;
    return acc;
  }, {});

  return (
    <div className="space-y-5">
      {/* 헤더 */}
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link className="hover:underline" href="/branches">지사 관리</Link>
            {" / "}
            <span>{branch.branchCode}</span>
          </p>
          <h1 className="mt-0.5 text-2xl font-bold">{branch.name}</h1>
        </div>
        <Link
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          href="/branches"
        >
          목록으로
        </Link>
      </div>

      {/* 기본 정보 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">기본 정보</h2>
        </div>
        <form action={updateBranchInfoAction.bind(null, branchId)} className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0"></span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지사코드</span>
            <input className="min-w-0 flex-1 bg-slate-50 text-slate-400" disabled value={branch.branchCode} />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지사명</span>
            <input className="min-w-0 flex-1" defaultValue={branch.name} name="name" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지역</span>
            <input className="min-w-0 flex-1" defaultValue={branch.region} name="region" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">상태</span>
            <select className="min-w-0 flex-1" defaultValue={branch.status} name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">담당자</span>
            <input className="min-w-0 flex-1" defaultValue={branch.managerName} name="managerName" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">연락처</span>
            <input className="min-w-0 flex-1" defaultValue={branch.phone} name="phone" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0"></span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">주소</span>
            <input className="min-w-0 flex-1" defaultValue={branch.address ?? ""} name="address" />
          </div>
          <div className="flex items-start gap-3">
            <span className="w-3 shrink-0 pt-2"></span>
            <span className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-600">메모</span>
            <textarea className="min-w-0 flex-1" defaultValue={branch.memo ?? ""} name="memo" rows={3} />
          </div>
          <div>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">저장</button>
          </div>
        </form>
      </section>

      {/* 판매권한 관리 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">판매권한 관리</h2>
        </div>
        <form action={updatePermissionsAction.bind(null, branchId)} className="p-5 space-y-4">
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {programs.map((program) => (
              <label className="inline-flex items-center gap-2 text-sm" key={program.id}>
                <input
                  defaultChecked={permissionSet.has(program.id)}
                  name="programId"
                  type="checkbox"
                  value={program.id}
                />
                {program.name}
              </label>
            ))}
          </div>
          <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">저장</button>
            <button className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700" name="mode" value="enable_all">전체 선택</button>
            <button className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700" name="mode" value="disable_all">전체 해제</button>
          </div>
        </form>
      </section>

      {/* 판매부수 입력 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">판매부수 입력</h2>
        </div>
        <div className="p-5 space-y-4">
          <form key={selectedYearMonth} action={saveSalesAction.bind(null, branchId)} className="space-y-3">
            <div className="flex items-center gap-3">
              <span className="w-3 shrink-0"></span>
              <span className="w-20 shrink-0 text-sm font-medium text-slate-600">연월</span>
              <input className="w-36 min-w-0" defaultValue={selectedYearMonth} name="yearMonth" required />
            </div>
            {programs.filter((program) => permissionSet.has(program.id)).map((program) => (
              <div className="flex items-center gap-3" key={program.id}>
                <span className="w-3 shrink-0"></span>
                <span className="w-20 shrink-0 text-sm font-medium text-slate-600">{program.name}</span>
                <input
                  className="w-36 min-w-0"
                  defaultValue={salesByProgramId.get(program.id) ?? 0}
                  min={0}
                  name={`quantity_${program.id}`}
                  type="number"
                />
                <input name="programId" type="hidden" value={program.id} />
              </div>
            ))}
            {permissionSet.size === 0 && (
              <p className="text-sm text-slate-400">판매권한이 부여된 프로그램이 없습니다.</p>
            )}
            <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 pt-4">
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" disabled={permissionSet.size === 0}>저장</button>
            </div>
          </form>
          <div className="flex flex-wrap items-center gap-2">
            <form action={copyPreviousMonthAction.bind(null, branchId)}>
              <input name="yearMonth" type="hidden" value={selectedYearMonth} />
              <button className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700">이전 달 불러오기</button>
            </form>
            <form action={resetSalesAction.bind(null, branchId)}>
              <input name="yearMonth" type="hidden" value={selectedYearMonth} />
              <button className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700">초기화</button>
            </form>
          </div>
        </div>
      </section>

      {/* 판매부수 이력 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">판매부수 이력</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">연월</th>
                {programs.map((program) => (
                  <th className="px-4 py-2.5 text-right font-medium" key={program.id}>
                    {program.name}
                  </th>
                ))}
                <th className="px-4 py-2.5 text-right font-medium">합계</th>
                <th className="px-4 py-2.5 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedHistory).map((yearMonth) => {
                const values = programs.map((program) => groupedHistory[yearMonth][program.id] ?? 0);
                const sum = values.reduce((acc, value) => acc + value, 0);
                return (
                  <tr className="border-t border-slate-100 hover:bg-slate-50" key={yearMonth}>
                    <td className="px-4 py-2.5 font-medium text-slate-700">{yearMonth}</td>
                    {values.map((value, index) => (
                      <td className="px-4 py-2.5 text-right text-slate-600" key={programs[index].id}>
                        {value.toLocaleString()}
                      </td>
                    ))}
                    <td className="px-4 py-2.5 text-right font-semibold">{sum.toLocaleString()}</td>
                    <td className="px-4 py-2.5 text-center">
                      <Link
                        className="text-xs text-slate-400 hover:text-slate-900 hover:underline"
                        href={`/branches/${branchId}?ym=${yearMonth}`}
                      >
                        수정
                      </Link>
                    </td>
                  </tr>
                );
              })}
              {Object.keys(groupedHistory).length === 0 && (
                <tr>
                  <td className="px-4 py-8 text-center text-slate-400" colSpan={programs.length + 3}>
                    저장된 이력이 없습니다.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
