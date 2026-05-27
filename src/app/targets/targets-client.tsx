"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { saveTargetsAction, saveOnlyOneTargetsAction } from "./actions";
import { SavedToast } from "@/components/saved-toast";
import type { TargetPreviewResponse, TargetPreviewRow } from "@/app/api/targets/excel/preview/route";

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
  const [showUpload, setShowUpload] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [uploadPreview, setUploadPreview] = useState<TargetPreviewResponse | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

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

  async function handleUploadPreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setUploadMessage("");
    setUploadPreview(null);
    try {
      const res = await fetch("/api/targets/excel/preview", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "미리보기 실패");
      setUploadPreview(data);
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setUploading(false);
    }
  }

  async function handleUploadApply() {
    if (!uploadPreview) return;
    setUploading(true);
    try {
      const res = await fetch("/api/targets/excel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ year, payload: uploadPreview.payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "적용 실패");
      setUploadPreview(null);
      setShowUpload(false);
      setUploadMessage(`${data.count}개 지사 목표가 반영됐습니다.`);
      router.refresh();
    } catch (err) {
      setUploadMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setUploading(false);
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
          <button
            className={`rounded-md border px-4 py-2 text-sm ${showUpload ? "border-slate-900 bg-slate-900 text-white" : "border-slate-200 text-slate-600 hover:bg-slate-50"}`}
            onClick={() => { setShowUpload(!showUpload); setUploadPreview(null); setUploadMessage(""); }}
          >
            일괄등록
          </button>
          <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={saving} onClick={handleSave}>
            {saving ? "저장 중..." : "저장"}
          </button>
        </div>
      </div>

      {showUpload && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">목표 일괄등록 ({year}년)</h2>
            <a
              className="text-sm text-slate-500 underline hover:text-slate-700"
              href={`/api/targets/excel/template?t=${Date.now()}`}
            >
              양식 다운로드
            </a>
          </div>
          <div className="p-5 space-y-4">
            <p className="text-xs text-slate-400">지사명을 기준으로 매핑됩니다. 판매권한이 없는 프로그램 목표는 반영되지 않습니다.</p>
            <form className="flex flex-wrap items-center gap-2" onSubmit={handleUploadPreview}>
              <input accept=".xlsx,.xls" name="file" required type="file" />
              <input className="w-48 text-sm" name="password" placeholder="파일 비밀번호 (없으면 빈칸)" type="password" />
              <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={uploading} type="submit">
                {uploading ? "처리 중..." : "미리보기"}
              </button>
            </form>

            {uploadPreview && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>유효 <strong className="text-emerald-700">{uploadPreview.summary.validRows}건</strong></span>
                  {uploadPreview.summary.errorRows > 0 && <span className="text-rose-600">오류 {uploadPreview.summary.errorRows}건</span>}
                </div>
                {uploadPreview.errors.length > 0 && (
                  <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                    {uploadPreview.errors.map((e) => <li key={`${e.row}-${e.message}`}>{e.row}행: {e.message}</li>)}
                  </ul>
                )}
                {uploadPreview.payload.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">지사</th>
                          {uploadPreview.payload[0].programTargets.map((t) => (
                            <th className={`px-2 py-2 text-center font-medium ${t.skipped ? "text-slate-300" : ""}`} key={t.programId}>
                              {t.programName}
                            </th>
                          ))}
                          <th className="px-2 py-2 text-center font-medium border-l border-slate-200">온리원</th>
                        </tr>
                      </thead>
                      <tbody>
                        {uploadPreview.payload.map((row: TargetPreviewRow) => (
                          <tr className="border-t border-slate-100" key={row.branchId}>
                            <td className="px-3 py-2 font-medium">{row.branchName}</td>
                            {row.programTargets.map((t) => (
                              <td className={`px-2 py-2 text-center ${t.skipped ? "text-slate-300 bg-slate-50" : ""}`} key={t.programId}>
                                {t.skipped ? "-" : t.quantity.toLocaleString()}
                              </td>
                            ))}
                            <td className="px-2 py-2 text-center border-l border-slate-200">{row.onlyOne.toLocaleString()}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                {uploadPreview.payload.length > 0 && (
                  <button
                    className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
                    disabled={uploading}
                    onClick={handleUploadApply}
                    type="button"
                  >
                    {uploading ? "처리 중..." : `${uploadPreview.payload.length}건 적용`}
                  </button>
                )}
              </div>
            )}
            {uploadMessage && <p className="text-sm text-slate-700">{uploadMessage}</p>}
          </div>
        </section>
      )}

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
