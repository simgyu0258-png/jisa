"use client";

import { useState, useTransition } from "react";
import { addProgramAction, renameProgramAction, deleteProgramAction } from "./actions";

type Program = { id: number; name: string };

export function ProgramsClient({ programs: initial }: { programs: Program[] }) {
  const [programs, setPrograms] = useState(initial);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editingName, setEditingName] = useState("");
  const [isPending, startTransition] = useTransition();

  function startEdit(program: Program) {
    setEditingId(program.id);
    setEditingName(program.name);
  }

  function cancelEdit() {
    setEditingId(null);
    setEditingName("");
  }

  function saveEdit(id: number) {
    if (!editingName.trim()) return;
    startTransition(async () => {
      await renameProgramAction(id, editingName);
      setPrograms((prev) =>
        prev.map((p) => (p.id === id ? { ...p, name: editingName.trim() } : p)),
      );
      setEditingId(null);
    });
  }

  function handleDelete(program: Program) {
    if (!confirm(`"${program.name}"을(를) 삭제하면 관련 권한과 판매 데이터도 모두 삭제됩니다.\n계속하시겠습니까?`)) return;
    startTransition(async () => {
      await deleteProgramAction(program.id);
      setPrograms((prev) => prev.filter((p) => p.id !== program.id));
    });
  }

  return (
    <div className="space-y-4">
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100 text-slate-700">
            <tr>
              <th className="w-16 px-4 py-2 text-left">ID</th>
              <th className="px-4 py-2 text-left">프로그램명</th>
              <th className="w-36 px-4 py-2 text-right">관리</th>
            </tr>
          </thead>
          <tbody>
            {programs.map((program) => (
              <tr className="border-t border-slate-200" key={program.id}>
                <td className="px-4 py-2 text-slate-500">{program.id}</td>
                <td className="px-4 py-2">
                  {editingId === program.id ? (
                    <input
                      autoFocus
                      className="w-full max-w-xs"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") saveEdit(program.id);
                        if (e.key === "Escape") cancelEdit();
                      }}
                    />
                  ) : (
                    <span>{program.name}</span>
                  )}
                </td>
                <td className="px-4 py-2 text-right">
                  {editingId === program.id ? (
                    <span className="flex justify-end gap-2">
                      <button
                        className="rounded-md bg-slate-900 px-3 py-1 text-xs text-white disabled:opacity-50"
                        disabled={isPending || !editingName.trim()}
                        onClick={() => saveEdit(program.id)}
                      >
                        저장
                      </button>
                      <button
                        className="rounded-md bg-slate-100 px-3 py-1 text-xs"
                        onClick={cancelEdit}
                      >
                        취소
                      </button>
                    </span>
                  ) : (
                    <span className="flex justify-end gap-2">
                      <button
                        className="rounded-md bg-slate-100 px-3 py-1 text-xs disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => startEdit(program)}
                      >
                        이름 변경
                      </button>
                      <button
                        className="rounded-md bg-rose-50 px-3 py-1 text-xs text-rose-600 disabled:opacity-50"
                        disabled={isPending}
                        onClick={() => handleDelete(program)}
                      >
                        삭제
                      </button>
                    </span>
                  )}
                </td>
              </tr>
            ))}
            {programs.length === 0 && (
              <tr>
                <td className="px-4 py-8 text-center text-slate-500" colSpan={3}>
                  등록된 프로그램이 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <form
        className="flex items-center gap-2 rounded-lg border border-slate-200 bg-white p-4"
        action={async (formData) => {
          const name = String(formData.get("name") || "").trim();
          if (!name) return;
          await addProgramAction(formData);
          setPrograms((prev) => [
            ...prev,
            { id: Date.now(), name }, // optimistic — page revalidation replaces with real id
          ]);
        }}
      >
        <input
          className="w-full max-w-xs"
          name="name"
          placeholder="새 프로그램명 입력"
          required
        />
        <button
          className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
          type="submit"
        >
          추가
        </button>
      </form>
    </div>
  );
}
