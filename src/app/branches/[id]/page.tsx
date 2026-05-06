import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import {
  createInstitutionAction,
  deleteInstitutionAction,
  updateBranchInfoAction,
  updatePermissionsAction,
} from "./actions";

export default async function BranchDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const branchId = Number.parseInt(id, 10);

  const [branch, programs] = await Promise.all([
    prisma.branch.findUnique({
      where: { id: branchId },
      include: {
        permissions: { include: { program: true }, orderBy: { programId: "asc" } },
        institutions: { orderBy: { name: "asc" } },
      },
    }),
    prisma.program.findMany({ orderBy: { id: "asc" } }),
  ]);

  if (!branch) notFound();

  const permissionSet = new Set(
    branch.permissions.filter((p) => p.isEnabled).map((p) => p.programId),
  );

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link className="hover:underline" href="/branches">지사 관리</Link>
            {" / "}
            <span>{branch.branchCode}</span>
          </p>
          <h1 className="mt-0.5 text-2xl font-bold">{branch.name}</h1>
        </div>
        <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="/branches">
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
            <span className="w-3 shrink-0" />
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지사코드</span>
            <input className="min-w-0 flex-1 bg-slate-50 text-slate-400" disabled value={branch.branchCode} />
          </div>
          {([
            { label: "지사명", name: "name", value: branch.name, req: true },
            { label: "지역", name: "region", value: branch.region, req: true },
            { label: "담당자", name: "managerName", value: branch.managerName, req: true },
            { label: "연락처", name: "phone", value: branch.phone, req: true },
            { label: "주소", name: "address", value: branch.address ?? "", req: false },
          ] as const).map(({ label, name, value, req }) => (
            <div className="flex items-center gap-3" key={name}>
              <span className={`w-3 shrink-0 text-center font-medium ${req ? "text-rose-500" : ""}`}>{req ? "*" : ""}</span>
              <span className="w-20 shrink-0 text-sm font-medium text-slate-600">{label}</span>
              <input className="min-w-0 flex-1" defaultValue={value} name={name} required={req} />
            </div>
          ))}
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">상태</span>
            <select className="min-w-0 flex-1" defaultValue={branch.status} name="status">
              <option value="active">활성</option>
              <option value="inactive">비활성</option>
            </select>
          </div>
          <div className="flex items-start gap-3">
            <span className="w-3 shrink-0 pt-2" />
            <span className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-600">메모</span>
            <textarea className="min-w-0 flex-1" defaultValue={branch.memo ?? ""} name="memo" rows={3} />
          </div>
          <div><button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">저장</button></div>
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
                <input defaultChecked={permissionSet.has(program.id)} name="programId" type="checkbox" value={program.id} />
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

      {/* 기관 관리 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">기관 관리</h2>
        </div>
        <div className="p-5 space-y-4">
          {branch.institutions.length > 0 && (
            <div className="overflow-x-auto">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-50 text-slate-600">
                  <tr>
                    <th className="px-3 py-2 text-left font-medium">기관명</th>
                    <th className="px-3 py-2 text-left font-medium">연락처</th>
                    <th className="px-3 py-2 text-left font-medium">주소</th>
                    <th className="px-3 py-2 text-center font-medium">상태</th>
                    <th className="px-3 py-2" />
                  </tr>
                </thead>
                <tbody>
                  {branch.institutions.map((inst) => (
                    <tr className="border-t border-slate-100" key={inst.id}>
                      <td className="px-3 py-2 font-medium text-slate-700">{inst.name}</td>
                      <td className="px-3 py-2 text-slate-500">{inst.phone ?? "-"}</td>
                      <td className="px-3 py-2 text-slate-500">{inst.address ?? "-"}</td>
                      <td className="px-3 py-2 text-center">
                        <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                          inst.status === "active" ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500"
                        }`}>
                          {inst.status === "active" ? "활성" : "비활성"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-center">
                        <form action={deleteInstitutionAction.bind(null, inst.id, branchId)}>
                          <button className="text-xs text-rose-500 hover:underline">삭제</button>
                        </form>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
          {branch.institutions.length === 0 && (
            <p className="text-sm text-slate-400">등록된 기관이 없습니다.</p>
          )}

          <form action={createInstitutionAction.bind(null, branchId)} className="space-y-2 rounded-lg border border-slate-100 bg-slate-50 p-4">
            <p className="mb-2 text-xs font-medium text-slate-500">기관 추가</p>
            <div className="flex flex-wrap gap-2">
              <input className="min-w-40 flex-1" name="name" placeholder="기관명 *" required />
              <input className="min-w-32 flex-1" name="phone" placeholder="연락처" />
              <input className="min-w-48 flex-1" name="address" placeholder="주소" />
            </div>
            <div className="flex gap-2">
              <input className="flex-1" name="memo" placeholder="메모" />
              <button className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm text-white">추가</button>
            </div>
          </form>
        </div>
      </section>
    </div>
  );
}
