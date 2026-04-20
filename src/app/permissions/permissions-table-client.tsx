"use client";

import { useTransition } from "react";
import { useState } from "react";
import { updateBranchPermissionsAction } from "./actions";

type Program = { id: number; name: string };
type Branch = {
  id: number;
  name: string;
  permissions: Array<{ programId: number; isEnabled: boolean }>;
};

export function PermissionsTableClient({
  branches,
  programs,
}: {
  branches: Branch[];
  programs: Program[];
}) {
  const [selected, setSelected] = useState<Branch | null>(null);
  const [isPending, startTransition] = useTransition();

  function handleSave(formData: FormData) {
    if (!selected) return;
    startTransition(async () => {
      await updateBranchPermissionsAction(selected.id, formData);
      setSelected(null);
    });
  }

  const enabledSet = new Set(
    selected?.permissions.filter((p) => p.isEnabled).map((p) => p.programId) ?? [],
  );

  return (
    <>
      {/* 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="w-full table-fixed text-sm">
          <colgroup>
            <col className="w-40" />
            {programs.map((p) => <col className="w-20" key={p.id} />)}
          </colgroup>
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-center">지사</th>
              {programs.map((p) => (
                <th className="px-3 py-2 text-center" key={p.id}>{p.name}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => (
              <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                <td className="px-3 py-2 text-center">
                  <button
                    className="font-medium text-slate-900 underline hover:text-slate-600"
                    onClick={() => setSelected(branch)}
                    type="button"
                  >
                    {branch.name}
                  </button>
                </td>
                {programs.map((p) => {
                  const enabled = branch.permissions.find((perm) => perm.programId === p.id)?.isEnabled ?? false;
                  return (
                    <td className="px-3 py-2 text-center font-semibold" key={p.id}>
                      <span className={enabled ? "text-slate-900" : "text-slate-300"}>
                        {enabled ? "O" : "X"}
                      </span>
                    </td>
                  );
                })}
              </tr>
            ))}
            {branches.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={programs.length + 1}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 팝업 */}
      {selected && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40"
          onClick={(e) => { if (e.target === e.currentTarget) setSelected(null); }}
        >
          <div className="w-full max-w-md rounded-xl bg-white shadow-xl">
            <div className="border-b border-slate-100 px-5 py-4">
              <h2 className="font-semibold text-slate-800">판매권한 수정</h2>
              <p className="mt-0.5 text-sm text-slate-500">{selected.name}</p>
            </div>

            <form action={handleSave} className="p-5 space-y-4">
              <div className="flex flex-wrap gap-x-6 gap-y-3">
                {programs.map((p) => (
                  <label className="inline-flex items-center gap-2 text-sm" key={p.id}>
                    <input
                      defaultChecked={enabledSet.has(p.id)}
                      name="programId"
                      type="checkbox"
                      value={p.id}
                    />
                    {p.name}
                  </label>
                ))}
              </div>

              <div className="flex items-center gap-2 border-t border-slate-100 pt-4">
                <button
                  className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                  disabled={isPending}
                  type="submit"
                >
                  {isPending ? "저장 중..." : "저장"}
                </button>
                <button
                  className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700"
                  disabled={isPending}
                  onClick={() => setSelected(null)}
                  type="button"
                >
                  취소
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
