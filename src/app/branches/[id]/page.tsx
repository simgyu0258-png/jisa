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

  const [branch, programs, branches] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        permissions: { include: { program: true }, orderBy: { programId: "asc" } },
      },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.branch.findMany({
      where: { id: { not: branchId } },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
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
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">지사 상세 - {branch.name}</h1>
        <Link className="text-sm text-slate-600 underline" href="/branches">
          목록으로
        </Link>
      </div>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">기본 정보</h2>
        <form action={updateBranchInfoAction.bind(null, branchId)} className="space-y-3">
          <div className="grid grid-cols-1 gap-3 md:grid-cols-3">
            <label className="space-y-1 text-sm">
              <span>지사코드</span>
              <input disabled value={branch.branchCode} />
            </label>
            <label className="space-y-1 text-sm">
              <span>지사명</span>
              <input defaultValue={branch.name} name="name" required />
            </label>
            <label className="space-y-1 text-sm">
              <span>지역</span>
              <input defaultValue={branch.region} name="region" required />
            </label>
            <label className="space-y-1 text-sm">
              <span>상태</span>
              <select defaultValue={branch.status} name="status">
                <option value="active">active</option>
                <option value="inactive">inactive</option>
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span>담당자</span>
              <input defaultValue={branch.managerName} name="managerName" required />
            </label>
            <label className="space-y-1 text-sm">
              <span>연락처</span>
              <input defaultValue={branch.phone} name="phone" required />
            </label>
          </div>
          <label className="space-y-1 text-sm">
            <span>메모</span>
            <textarea defaultValue={branch.memo ?? ""} name="memo" rows={3} />
          </label>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">기본 정보 저장</button>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">판매권한 관리</h2>
        <form action={updatePermissionsAction.bind(null, branchId)} className="space-y-3">
          <div className="flex flex-wrap gap-4">
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
          <div className="flex flex-wrap items-center gap-2">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">체크 상태 저장</button>
            <button
              className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white"
              name="mode"
              value="enable_all"
            >
              전체 선택
            </button>
            <button
              className="rounded-md bg-slate-200 px-4 py-2 text-sm text-slate-800"
              name="mode"
              value="disable_all"
            >
              전체 해제
            </button>
            <span className="mx-2 text-sm text-slate-400">또는</span>
            <select className="w-56" name="copyFromId">
              <option value="">다른 지사 권한 복사 선택</option>
              {branches.map((item) => (
                <option key={item.id} value={item.id}>
                  {item.name}
                </option>
              ))}
            </select>
            <button className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white">권한 복사 적용</button>
          </div>
        </form>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">판매부수 개별 입력</h2>
        <form action={saveSalesAction.bind(null, branchId)} className="space-y-3">
          <div className="flex items-center gap-2">
            <label className="text-sm">연월</label>
            <input defaultValue={selectedYearMonth} name="yearMonth" required />
          </div>
          <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
            {programs.map((program) => (
              <label className="space-y-1 text-sm" key={program.id}>
                <span>{program.name}</span>
                <input
                  defaultValue={salesByProgramId.get(program.id) ?? 0}
                  min={0}
                  name={`quantity_${program.id}`}
                  type="number"
                />
                <input name="programId" type="hidden" value={program.id} />
              </label>
            ))}
          </div>
          <div className="flex flex-wrap gap-2">
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">저장</button>
          </div>
        </form>

        <div className="mt-3 flex flex-wrap gap-2">
          <form action={copyPreviousMonthAction.bind(null, branchId)}>
            <input name="yearMonth" type="hidden" value={selectedYearMonth} />
            <button className="rounded-md bg-slate-700 px-4 py-2 text-sm text-white">
              이전 달 데이터 불러오기
            </button>
          </form>
          <form action={resetSalesAction.bind(null, branchId)}>
            <input name="yearMonth" type="hidden" value={selectedYearMonth} />
            <button className="rounded-md bg-slate-200 px-4 py-2 text-sm text-slate-800">초기화</button>
          </form>
        </div>
      </section>

      <section className="rounded-lg border border-slate-200 bg-white p-5">
        <h2 className="mb-3 text-lg font-semibold">판매부수 이력</h2>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">연월</th>
                {programs.map((program) => (
                  <th className="px-3 py-2 text-right" key={program.id}>
                    {program.name}
                  </th>
                ))}
                <th className="px-3 py-2 text-right">합계</th>
              </tr>
            </thead>
            <tbody>
              {Object.keys(groupedHistory).map((yearMonth) => {
                const values = programs.map((program) => groupedHistory[yearMonth][program.id] ?? 0);
                const sum = values.reduce((acc, value) => acc + value, 0);
                return (
                  <tr className="border-t border-slate-200" key={yearMonth}>
                    <td className="px-3 py-2">{yearMonth}</td>
                    {values.map((value, index) => (
                      <td className="px-3 py-2 text-right" key={programs[index].id}>
                        {value}
                      </td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold">{sum}</td>
                  </tr>
                );
              })}
              {Object.keys(groupedHistory).length === 0 && (
                <tr>
                  <td className="px-3 py-6 text-center text-slate-500" colSpan={programs.length + 2}>
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
