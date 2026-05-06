"use client";

import { useState, useTransition } from "react";
import { saveSalesFromPageAction } from "./actions";

type Program = { id: number; name: string };
type Permission = { programId: number; isEnabled: boolean };
type Sale = { programId: number; quantity: number; yearMonth: string };
type Branch = { id: number; name: string; permissions: Permission[]; sales: Sale[] };

export function SalesTableClient({
  branches,
  programs,
  selectedMonths,
  canEdit,
}: {
  branches: Branch[];
  programs: Program[];
  selectedMonths: string[];
  canEdit: boolean;
}) {
  const [editingBranch, setEditingBranch] = useState<Branch | null>(null);
  const [modalYearMonth, setModalYearMonth] = useState("");
  const [quantities, setQuantities] = useState<Record<number, number>>({});
  const [isPending, startTransition] = useTransition();

  function buildQuantities(branch: Branch, ym: string) {
    const salesMap = new Map(
      branch.sales.filter((s) => s.yearMonth === ym).map((s) => [s.programId, s.quantity]),
    );
    const enabledIds = new Set(branch.permissions.filter((p) => p.isEnabled).map((p) => p.programId));
    return Object.fromEntries(
      programs.filter((p) => enabledIds.has(p.id)).map((p) => [p.id, salesMap.get(p.id) ?? 0]),
    );
  }

  function openModal(branch: Branch) {
    const ym = selectedMonths[0] ?? new Date().toISOString().slice(0, 7);
    setEditingBranch(branch);
    setModalYearMonth(ym);
    setQuantities(buildQuantities(branch, ym));
  }

  function handleYearMonthChange(ym: string) {
    setModalYearMonth(ym);
    if (editingBranch) setQuantities(buildQuantities(editingBranch, ym));
  }

  function closeModal() {
    setEditingBranch(null);
    setModalYearMonth("");
    setQuantities({});
  }

  function handleSave() {
    if (!editingBranch || !modalYearMonth) return;
    startTransition(async () => {
      await saveSalesFromPageAction(editingBranch.id, modalYearMonth, quantities);
      closeModal();
    });
  }

  const enabledProgramIds = editingBranch
    ? new Set(editingBranch.permissions.filter((p) => p.isEnabled).map((p) => p.programId))
    : new Set<number>();

  return (
    <>
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">지사</th>
              {programs.map((program) => (
                <th className="px-3 py-2 text-right" key={program.id}>{program.name}</th>
              ))}
              <th className="px-3 py-2 text-right">합계</th>
              {canEdit && <th className="px-3 py-2"></th>}
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const map = new Map<number, number>();
              for (const sale of branch.sales) {
                map.set(sale.programId, (map.get(sale.programId) ?? 0) + sale.quantity);
              }
              const total = programs.reduce((sum, p) => sum + (map.get(p.id) ?? 0), 0);
              return (
                <tr className="border-t border-slate-200" key={branch.id}>
                  <td className="px-3 py-2">{branch.name}</td>
                  {programs.map((program) => (
                    <td className="px-3 py-2 text-right" key={program.id}>
                      {(map.get(program.id) ?? 0).toLocaleString()}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{total.toLocaleString()}</td>
                  {canEdit && (
                    <td className="px-3 py-2 text-center">
                      <button
                        className="text-xs text-slate-400 hover:text-slate-900 hover:underline"
                        onClick={() => openModal(branch)}
                      >
                        수정
                      </button>
                    </td>
                  )}
                </tr>
              );
            })}
            {branches.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={programs.length + (canEdit ? 3 : 2)}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {editingBranch && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={closeModal}>
          <div className="w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="border-b border-slate-100 px-6 py-4">
              <h2 className="font-semibold text-slate-800">{editingBranch.name}</h2>
            </div>
            <div className="p-6 space-y-3">
              <div className="flex items-center gap-3">
                <span className="w-24 shrink-0 text-sm font-medium text-slate-600">연월</span>
                <input
                  className="flex-1"
                  onChange={(e) => handleYearMonthChange(e.target.value)}
                  placeholder="YYYY-MM"
                  value={modalYearMonth}
                />
              </div>
              {programs.filter((p) => enabledProgramIds.has(p.id)).map((program) => (
                <div className="flex items-center gap-3" key={program.id}>
                  <span className="w-24 shrink-0 text-sm font-medium text-slate-600">{program.name}</span>
                  <input
                    className="flex-1"
                    min={0}
                    onChange={(e) =>
                      setQuantities((prev) => ({ ...prev, [program.id]: Math.max(0, Number(e.target.value) || 0) }))
                    }
                    type="number"
                    value={quantities[program.id] ?? 0}
                  />
                </div>
              ))}
              {enabledProgramIds.size === 0 && (
                <p className="text-sm text-slate-400">판매권한이 부여된 프로그램이 없습니다.</p>
              )}
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-100 px-6 py-4">
              <button className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700" onClick={closeModal}>
                취소
              </button>
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={isPending || !modalYearMonth || enabledProgramIds.size === 0}
                onClick={handleSave}
              >
                {isPending ? "저장 중..." : "저장"}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
