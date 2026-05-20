"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTargetsAction, saveOnlyOneTargetsAction } from "./actions";
import { SavedToast } from "@/components/saved-toast";

type Branch = { id: number; name: string };
type Program = { id: number; name: string };

export function TargetsClient({
  branches, programs, year, minYear,
  initialTargets, prevTargetMap, enabledKeys,
  initialOnlyOneTargets, prevOnlyOneTargetMap,
}: {
  branches: Branch[];
  programs: Program[];
  year: number;
  minYear: number;
  initialTargets: Record<string, number>;
  prevTargetMap: Record<string, number>;
  enabledKeys: string[];
  initialOnlyOneTargets: Record<number, number>;
  prevOnlyOneTargetMap: Record<number, number>;
}) {
  const router = useRouter();
  const [targets, setTargets] = useState<Record<string, number>>(initialTargets);
  const [onlyOneTargets, setOnlyOneTargets] = useState<Record<number, number>>(initialOnlyOneTargets);
  const enabledSet = new Set(enabledKeys);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [selectedYear, setSelectedYear] = useState(year);
  const [filterBranchId, setFilterBranchId] = useState<number | null>(null);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - minYear + 2 }, (_, i) => minYear + i);

  function update(branchId: number, programId: number, value: string) {
    const qty = Math.max(0, parseInt(value) || 0);
    setTargets((prev) => ({ ...prev, [`${branchId}-${programId}`]: qty }));
    setSaved(false);
  }

  function updateOnlyOne(branchId: number, value: string) {
    const qty = Math.max(0, parseInt(value) || 0);
    setOnlyOneTargets((prev) => ({ ...prev, [branchId]: qty }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const programData = branches.flatMap((b) =>
        programs
          .filter((p) => enabledSet.has(`${b.id}-${p.id}`))
          .map((p) => ({ branchId: b.id, programId: p.id, quantity: targets[`${b.id}-${p.id}`] ?? 0 })),
      );
      const onlyOneData = branches.map((b) => ({ branchId: b.id, classCount: onlyOneTargets[b.id] ?? 0 }));
      await Promise.all([
        saveTargetsAction(year, programData),
        saveOnlyOneTargetsAction(year, onlyOneData),
      ]);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  const visibleBranches = filterBranchId ? branches.filter((b) => b.id === filterBranchId) : branches;

  return (
    <div className="space-y-4">
      {saved && <SavedToast />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">목표 관리</h1>
        <div className="flex items-center gap-2">
          <select className="text-sm" value={filterBranchId ?? ""} onChange={(e) => setFilterBranchId(e.target.value ? Number(e.target.value) : null)}>
            <option value="">전체 지사</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <select className="text-sm" value={selectedYear} onChange={(e) => setSelectedYear(Number(e.target.value))}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button className="rounded-md border border-slate-200 px-4 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => router.push(`/targets?year=${selectedYear}`)}>
            조회
          </button>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={saving} onClick={handleSave}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">지사</th>
              {programs.map((p) => (
                <th className="px-2 py-2 text-center" key={p.id}>
                  {p.name.length > 5 ? <>{p.name.slice(0, 5)}<br />{p.name.slice(5)}</> : p.name}
                </th>
              ))}
              <th className="px-2 py-2 text-center border-l border-slate-200 bg-slate-200 whitespace-nowrap">온리원</th>
              <th className="px-2 py-2 text-center font-semibold whitespace-nowrap">합계</th>
            </tr>
          </thead>
          <tbody>
            {visibleBranches.map((branch) => {
              const programTotal = programs.reduce((s, p) => enabledSet.has(`${branch.id}-${p.id}`) ? s + (targets[`${branch.id}-${p.id}`] ?? 0) : s, 0);
              const ooTarget = onlyOneTargets[branch.id] ?? 0;
              const prevOo = prevOnlyOneTargetMap[branch.id];
              const ooDiff = prevOo !== undefined && prevOo > 0 ? ooTarget - prevOo : null;
              return (
                <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{branch.name}</td>
                  {programs.map((p) => {
                    const key = `${branch.id}-${p.id}`;
                    const enabled = enabledSet.has(key);
                    const current = targets[key] ?? 0;
                    const prev = prevTargetMap[key];
                    const diff = prev !== undefined && prev > 0 ? current - prev : null;
                    return (
                      <td className={`px-2 py-1 ${!enabled ? "bg-slate-50" : ""}`} key={p.id}>
                        {enabled ? (
                          <>
                            <input className="w-full text-center text-sm" min={0} type="number" value={current} onChange={(e) => update(branch.id, p.id, e.target.value)} />
                            {diff !== null && (
                              <div className={`mt-0.5 text-center text-xs ${diff > 0 ? "text-emerald-600" : diff < 0 ? "text-rose-500" : "text-slate-400"}`}>
                                {diff > 0 ? `▲ ${diff.toLocaleString()}` : diff < 0 ? `▼ ${Math.abs(diff).toLocaleString()}` : "—"}
                              </div>
                            )}
                          </>
                        ) : null}
                      </td>
                    );
                  })}
                  <td className="px-2 py-1 border-l border-slate-200 bg-slate-50">
                    <input className="w-full text-center text-sm" min={0} type="number" value={ooTarget} onChange={(e) => updateOnlyOne(branch.id, e.target.value)} />
                    {ooDiff !== null && (
                      <div className={`mt-0.5 text-center text-xs ${ooDiff > 0 ? "text-emerald-600" : ooDiff < 0 ? "text-rose-500" : "text-slate-400"}`}>
                        {ooDiff > 0 ? `▲ ${ooDiff.toLocaleString()}` : ooDiff < 0 ? `▼ ${Math.abs(ooDiff).toLocaleString()}` : "—"}
                      </div>
                    )}
                  </td>
                  <td className="px-2 py-2 text-center font-semibold">{(programTotal + ooTarget).toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-3 py-2">합계</td>
              {programs.map((p) => {
                const total = visibleBranches.reduce((s, b) => enabledSet.has(`${b.id}-${p.id}`) ? s + (targets[`${b.id}-${p.id}`] ?? 0) : s, 0);
                return <td className="px-2 py-2 text-center" key={p.id}>{total.toLocaleString()}</td>;
              })}
              <td className="px-2 py-2 text-center border-l border-slate-200">
                {visibleBranches.reduce((s, b) => s + (onlyOneTargets[b.id] ?? 0), 0).toLocaleString()}
              </td>
              <td className="px-2 py-2 text-center">
                {visibleBranches.reduce((s, b) => {
                  const prog = programs.reduce((ss, p) => enabledSet.has(`${b.id}-${p.id}`) ? ss + (targets[`${b.id}-${p.id}`] ?? 0) : ss, 0);
                  return s + prog + (onlyOneTargets[b.id] ?? 0);
                }, 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
