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
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          <label className="space-y-1 text-sm">
            <span>지사명 *</span>
            <input name="name" required />
          </label>
          <label className="space-y-1 text-sm">
            <span>지역 *</span>
            <input name="region" required />
          </label>
          <label className="space-y-1 text-sm">
            <span>상태</span>
            <select defaultValue="active" name="status">
              <option value="active">active</option>
              <option value="inactive">inactive</option>
            </select>
          </label>
          <label className="space-y-1 text-sm">
            <span>담당자 *</span>
            <input name="managerName" required />
          </label>
          <label className="space-y-1 text-sm">
            <span>연락처 *</span>
            <input name="phone" required />
          </label>
        </div>
        <label className="space-y-1 text-sm">
          <span>메모</span>
          <textarea name="memo" rows={4} />
        </label>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">등록</button>
      </form>
    </div>
  );
}
