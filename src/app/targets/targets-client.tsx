"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTargetsAction } from "./actions";
import { SavedToast } from "@/components/saved-toast";

type Branch = { id: number; name: string };
type Program = { id: number; name: string };

export function TargetsClient({
  branches, programs, year, minYear,
  initialTargets,
}: {
  branches: Branch[];
  programs: Program[];
  year: number;
  minYear: number;
  initialTargets: Record<string, number>; // `${branchId}-${programId}` → quantity
}) {
  const router = useRouter();
  const [targets, setTargets] = useState<Record<string, number>>(initialTargets);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: currentYear - minYear + 2 }, (_, i) => minYear + i);

  function update(branchId: number, programId: number, value: string) {
    const qty = Math.max(0, parseInt(value) || 0);
    setTargets((prev) => ({ ...prev, [`${branchId}-${programId}`]: qty }));
    setSaved(false);
  }

  async function handleSave() {
    setSaving(true);
    try {
      const data = branches.flatMap((b) =>
        programs.map((p) => ({
          branchId: b.id,
          programId: p.id,
          quantity: targets[`${b.id}-${p.id}`] ?? 0,
        })),
      );
      await saveTargetsAction(year, data);
      setSaved(true);
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-4">
      {saved && <SavedToast />}

      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">목표 관리</h1>
        <div className="flex items-center gap-2">
          <select
            className="text-sm"
            value={year}
            onChange={(e) => router.push(`/targets?year=${e.target.value}`)}
          >
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
          <button
            className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
            disabled={saving}
            onClick={handleSave}
          >
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
                <th className="px-2 py-2 text-center whitespace-nowrap" key={p.id}>{p.name}</th>
              ))}
              <th className="px-2 py-2 text-center font-semibold">합계</th>
            </tr>
          </thead>
          <tbody>
            {branches.map((branch) => {
              const values = programs.map((p) => targets[`${branch.id}-${p.id}`] ?? 0);
              const total = values.reduce((s, v) => s + v, 0);
              return (
                <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                  <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{branch.name}</td>
                  {programs.map((p) => (
                    <td className="px-2 py-1" key={p.id}>
                      <input
                        className="w-full text-center text-sm"
                        min={0}
                        type="number"
                        value={targets[`${branch.id}-${p.id}`] ?? 0}
                        onChange={(e) => update(branch.id, p.id, e.target.value)}
                      />
                    </td>
                  ))}
                  <td className="px-2 py-2 text-center font-semibold">{total.toLocaleString()}</td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-3 py-2">합계</td>
              {programs.map((p) => {
                const total = branches.reduce((s, b) => s + (targets[`${b.id}-${p.id}`] ?? 0), 0);
                return <td className="px-2 py-2 text-center" key={p.id}>{total.toLocaleString()}</td>;
              })}
              <td className="px-2 py-2 text-center">
                {branches.reduce((s, b) => s + programs.reduce((ss, p) => ss + (targets[`${b.id}-${p.id}`] ?? 0), 0), 0).toLocaleString()}
              </td>
            </tr>
          </tfoot>
        </table>
      </div>
    </div>
  );
}
