import Link from "next/link";
import { createBranchAction } from "../actions";

export default async function NewBranchPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const params = await searchParams;

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">지사 등록</h1>
        <Link className="text-sm text-slate-600 underline" href="/branches">
          목록으로
        </Link>
      </div>

      {params.error === "required" && (
        <p className="rounded-md border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700">
          지사명, 지역, 담당자, 연락처는 필수입니다.
        </p>
      )}

      <form action={createBranchAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지사명</span>
            <input className="min-w-0 flex-1" name="name" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">지역</span>
            <input className="min-w-0 flex-1" name="region" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">상태</span>
            <select className="min-w-0 flex-1" defaultValue="active" name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">담당자</span>
            <input className="min-w-0 flex-1" name="managerName" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">연락처</span>
            <input className="min-w-0 flex-1" name="phone" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-3 shrink-0"></span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">주소</span>
            <input className="min-w-0 flex-1" name="address" />
          </div>
          <div className="flex items-start gap-3">
            <span className="w-3 shrink-0 pt-2"></span>
            <span className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-600">메모</span>
            <textarea className="min-w-0 flex-1" name="memo" rows={4} />
          </div>
        </div>
        <div className="flex justify-center pt-[100px]">
          <button className="rounded-md bg-slate-900 px-6 py-2 text-sm text-white">등록</button>
        </div>
      </form>
    </div>
  );
}
