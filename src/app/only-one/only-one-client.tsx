"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { OnlyOnePreviewRow, OnlyOnePreviewResponse } from "@/app/api/only-one/preview/route";

type Branch = { id: number; name: string };
type ContractRow = { id: number; classCount: number; startDate: string; endDate: string | null };
type InstitutionDetail = { id: number; name: string; contracts: ContractRow[] };
type BranchSummary = { branch: Branch; target: number; activeClasses: number };

function rateColor(rate: number | null) {
  if (rate === null) return "text-slate-400";
  if (rate >= 100) return "text-emerald-600";
  if (rate >= 50) return "text-amber-500";
  return "text-rose-600";
}

export function OnlyOneClient({
  year, minYear, currentYear, branches, summaries,
}: {
  year: number;
  minYear: number;
  currentYear: number;
  branches: Branch[];
  summaries: BranchSummary[];
}) {
  const router = useRouter();
  const [modal, setModal] = useState<{ branch: Branch; institutions: InstitutionDetail[] } | null>(null);
  const [showUpload, setShowUpload] = useState(false);
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<OnlyOnePreviewResponse | null>(null);
  const [uploadMessage, setUploadMessage] = useState("");

  const yearOptions = Array.from({ length: currentYear - minYear + 1 }, (_, i) => minYear + i);
  const totalTarget = summaries.reduce((s, b) => s + b.target, 0);
  const totalActive = summaries.reduce((s, b) => s + b.activeClasses, 0);
  const totalRate = totalTarget > 0 ? (totalActive / totalTarget) * 100 : null;

  async function openModal(branch: Branch) {
    const res = await fetch(`/api/only-one/institutions?branchId=${branch.id}&year=${year}`);
    const data = await res.json();
    setModal({ branch, institutions: data });
  }

  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setUploadMessage("");
    setPreview(null);
    try {
      const res = await fetch("/api/only-one/preview", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(data);
    } catch (err) { setUploadMessage(err instanceof Error ? err.message : "오류"); }
    finally { setLoading(false); }
  }

  async function handleApply() {
    if (!preview) return;
    setLoading(true);
    try {
      const res = await fetch("/api/only-one/apply", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ payload: preview.payload }) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error);
      setPreview(null);
      setUploadMessage(`${data.count}건 등록됐습니다.`);
      router.refresh();
    } catch (err) { setUploadMessage(err instanceof Error ? err.message : "오류"); }
    finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">온리원 현황</h1>
        <div className="flex items-center gap-2">
          <select className="text-sm" value={year} onChange={(e) => router.push(`/only-one?year=${e.target.value}`)}>
            {yearOptions.map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <button className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" onClick={() => setShowUpload(!showUpload)}>
            일괄등록
          </button>
        </div>
      </div>

      {/* 전체 요약 */}
      <section className="grid grid-cols-3 gap-4">
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">목표 클래스</div>
          <div className="mt-2 text-3xl font-bold">{totalTarget.toLocaleString()}</div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">계약 클래스</div>
          <div className="mt-2 text-3xl font-bold">{totalActive.toLocaleString()}</div>
        </article>
        <article className="rounded-lg border border-slate-200 bg-white p-5">
          <div className="text-sm text-slate-500">달성률</div>
          <div className={`mt-2 text-3xl font-bold ${rateColor(totalRate)}`}>
            {totalRate !== null ? `${totalRate.toFixed(1)}%` : "-"}
          </div>
        </article>
      </section>

      {/* 지사별 테이블 */}
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-4 py-2 text-left">지사</th>
              <th className="px-4 py-2 text-right">목표</th>
              <th className="px-4 py-2 text-right">계약</th>
              <th className="px-4 py-2 text-center">달성률</th>
            </tr>
          </thead>
          <tbody>
            {summaries.length === 0 && (
              <tr><td className="px-4 py-8 text-center text-slate-400" colSpan={4}>데이터가 없습니다.</td></tr>
            )}
            {summaries.map(({ branch, target, activeClasses }) => {
              const rate = target > 0 ? (activeClasses / target) * 100 : null;
              return (
                <tr className="border-t border-slate-100 hover:bg-slate-50" key={branch.id}>
                  <td className="px-4 py-2">
                    <button className="font-medium text-slate-700 hover:text-blue-600 hover:underline" onClick={() => openModal(branch)}>
                      {branch.name}
                    </button>
                  </td>
                  <td className="px-4 py-2 text-right">{target > 0 ? target.toLocaleString() : "-"}</td>
                  <td className="px-4 py-2 text-right">{activeClasses > 0 ? activeClasses.toLocaleString() : "-"}</td>
                  <td className={`px-4 py-2 text-center font-semibold ${rateColor(rate)}`}>
                    {rate !== null ? `${rate.toFixed(1)}%` : "-"}
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot className="bg-slate-50 font-semibold">
            <tr>
              <td className="px-4 py-2">합계</td>
              <td className="px-4 py-2 text-right">{totalTarget.toLocaleString()}</td>
              <td className="px-4 py-2 text-right">{totalActive.toLocaleString()}</td>
              <td className={`px-4 py-2 text-center ${rateColor(totalRate)}`}>{totalRate !== null ? `${totalRate.toFixed(1)}%` : "-"}</td>
            </tr>
          </tfoot>
        </table>
      </div>

      {/* 일괄등록 */}
      {showUpload && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">일괄등록</h2>
            <a className="text-sm text-slate-500 underline hover:text-slate-700" href={`/api/only-one/template?t=${Date.now()}`}>양식 다운로드</a>
          </div>
          <div className="p-5 space-y-4">
            <form className="space-y-2" onSubmit={handlePreview}>
              <div className="flex flex-wrap gap-2">
                <input accept=".xlsx,.xls" name="file" required type="file" />
                <input
                  className="w-48 text-sm"
                  name="password"
                  placeholder="파일 비밀번호 (없으면 빈칸)"
                  type="password"
                />
                <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={loading} type="submit">
                  {loading ? "처리 중..." : "미리보기"}
                </button>
              </div>
            </form>
            {preview && (
              <div className="space-y-3">
                <div className="flex items-center gap-3 text-sm text-slate-600">
                  <span>유효 <strong className="text-emerald-700">{preview.summary.validRows}건</strong></span>
                  {preview.summary.errorRows > 0 && <span className="text-rose-600">오류 {preview.summary.errorRows}건</span>}
                </div>
                {preview.errors.length > 0 && (
                  <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                    {preview.errors.map((e) => <li key={`${e.row}-${e.message}`}>{e.row}행: {e.message}</li>)}
                  </ul>
                )}
                {preview.payload.length > 0 && (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="bg-slate-50 text-slate-600">
                        <tr>
                          <th className="px-3 py-2 text-left font-medium">지사</th>
                          <th className="px-3 py-2 text-left font-medium">기관</th>
                          <th className="px-3 py-2 text-center font-medium">클래스</th>
                          <th className="px-3 py-2 text-center font-medium">시작일</th>
                          <th className="px-3 py-2 text-center font-medium">종료일</th>
                        </tr>
                      </thead>
                      <tbody>
                        {preview.payload.map((row: OnlyOnePreviewRow, i) => (
                          <tr className="border-t border-slate-100" key={i}>
                            <td className="px-3 py-2 text-slate-500">{row.branchName}</td>
                            <td className="px-3 py-2">
                              {row.institutionName}
                              {row.isNewInstitution && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{row.classCount}</td>
                            <td className="px-3 py-2 text-center">{row.startDate}</td>
                            <td className="px-3 py-2 text-center">{row.endDate ?? "-"}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
                <button className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50" disabled={loading || preview.payload.length === 0} onClick={handleApply}>
                  {loading ? "처리 중..." : `${preview.payload.length}건 등록`}
                </button>
              </div>
            )}
            {uploadMessage && <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{uploadMessage}</p>}
          </div>
        </section>
      )}

      {/* 기관 상세 모달 */}
      {modal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setModal(null)}>
          <div className="relative max-h-[80vh] w-full max-w-2xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
              <h2 className="font-semibold text-slate-800">{modal.branch.name} — 온리원 계약 현황</h2>
              <button className="text-slate-400 hover:text-slate-700" onClick={() => setModal(null)}>✕</button>
            </div>
            <div className="p-6">
              {modal.institutions.length === 0 ? (
                <p className="text-sm text-slate-400">등록된 계약이 없습니다.</p>
              ) : (
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left">기관</th>
                      <th className="px-3 py-2 text-center">클래스</th>
                      <th className="px-3 py-2 text-center">시작일</th>
                      <th className="px-3 py-2 text-center">종료일</th>
                      <th className="px-3 py-2 text-center">상태</th>
                    </tr>
                  </thead>
                  <tbody>
                    {modal.institutions.flatMap((inst) =>
                      inst.contracts.map((c, ci) => {
                        const isActive = !c.endDate || c.endDate >= new Date().toISOString().slice(0, 10);
                        return (
                          <tr className={`border-t border-slate-100 ${!isActive ? "opacity-50" : ""}`} key={`${inst.id}-${ci}`}>
                            <td className="px-3 py-2 font-medium">{ci === 0 ? inst.name : ""}</td>
                            <td className="px-3 py-2 text-center">{c.classCount}</td>
                            <td className="px-3 py-2 text-center">{c.startDate}</td>
                            <td className="px-3 py-2 text-center">{c.endDate ?? "-"}</td>
                            <td className="px-3 py-2 text-center">
                              {isActive
                                ? <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-xs text-emerald-700">계약중</span>
                                : <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">종료</span>}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
