"use client";

import { useState, useTransition } from "react";
import { addProgramAction, updateProgramAction, deleteProgramAction } from "./actions";

type Program = { id: number; name: string; totalIssues: number };

export function ProgramsClient({ programs: initial }: { programs: Program[] }) {
  const [programs, setPrograms] = useState(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editName, setEditName] = useState("");
  const [editIssues, setEditIssues] = useState(12);
  const [isPending, startTransition] = useTransition();

  function startEdit(p: Program) {
    setEditingId(p.id);
    setEditName(p.name);
    setEditIssues(p.totalIssues);
  }

  function cancelEdit() { setEditingId(null); }

  function saveEdit(id: number) {
    if (!editName.trim()) return;
    startTransition(async () => {
      const fd = new FormData();
      fd.set("name", editName);
      fd.set("totalIssues", String(editIssues));
      await updateProgramAction(id, fd);
      setPrograms((prev) => prev.map((p) => p.id === id ? { ...p, name: editName.trim(), totalIssues: editIssues } : p));
      setEditingId(null);
    });
  }

  function handleDelete(p: Program) {
    if (!confirm(`"${p.name}"을(를) 삭제하면 관련 권한과 주문 데이터도 모두 삭제됩니다.\n계속하시겠습니까?`)) return;
    startTransition(async () => {
      await deleteProgramAction(p.id);
      setPrograms((prev) => prev.filter((x) => x.id !== p.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-12 px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">프로그램명</th>
              <th className="w-24 px-4 py-2 text-center">총 호수</th>
              <th className="w-40 px-4 py-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((p) => (
              <tr className="border-t border-slate-200" key={p.id}>
                <td className="px-4 py-2 text-slate-500">{p.id}</td>
                <td className="px-4 py-2">
                  {editingId === p.id ? (
                    <input autoFocus className="w-full max-w-xs" value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => { if (e.key === "Enter") saveEdit(p.id); if (e.key === "Escape") cancelEdit(); }}
                    />
                  ) : <span>{p.name}</span>}
                </td>
                <td className="px-4 py-2 text-center">
                  {editingId === p.id ? (
                    <input className="w-16 text-center" type="number" min={1} max={99} value={editIssues}
                      onChange={(e) => setEditIssues(Number(e.target.value))} />
                  ) : <span>{p.totalIssues}호</span>}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingId === p.id ? (
                    <span className="flex justify-end gap-2">
                      <button className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                        disabled={isPending || !editName.trim()} onClick={() => saveEdit(p.id)}>저장</button>
                      <button className="rounded-md bg-slate-100 px-3 py-1 text-xs" onClick={cancelEdit}>취소</button>
                    </span>
                  ) : (
                    <span className="flex justify-end gap-2">
                      <button className="rounded-md bg-slate-100 px-3 py-1 text-xs disabled:opacity-50"
                        disabled={isPending} onClick={() => startEdit(p)}>수정</button>
                      <button className="rounded-md bg-rose-50 px-3 py-1 text-xs text-rose-600 disabled:opacity-50"
                        disabled={isPending} onClick={() => handleDelete(p)}>삭제</button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-slate-500" colSpan={4}>등록된 프로그램이 없습니다.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <form className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4"
        onSubmit={async (e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          const name = String(fd.get("name") || "").trim();
          const totalIssues = Number(fd.get("totalIssues")) || 12;
          if (!name) return;
          await addProgramAction(fd);
          setPrograms((prev) => [...prev, { id: Date.now(), name, totalIssues }]);
          (e.target as HTMLFormElement).reset();
        }}>
        <input className="w-48" name="name" placeholder="프로그램명" required />
        <div className="flex items-center gap-1">
          <label className="text-sm text-slate-500">총 호수</label>
          <input className="w-16 text-center" name="totalIssues" type="number" min={1} max={99} defaultValue={12} />
        </div>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" type="submit">추가</button>
      </form>
    </div>
  );
}
