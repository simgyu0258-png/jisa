"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SaleOrderPreviewRow, SaleOrderPreviewResponse } from "@/app/api/sales/excel/preview/route";

export function SalesBulkUpload({ mode = "register" }: { mode?: "register" | "edit" }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SaleOrderPreviewResponse | null>(null);
  const [message, setMessage] = useState("");

  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setPreview(null);
    try {
      const res = await fetch("/api/sales/excel/preview", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "미리보기 실패");
      setPreview(data);
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function handleApply() {
    if (!preview || preview.payload.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch("/api/sales/excel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview.payload }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "적용 실패");
      setPreview(null);
      setMessage(`${data.upsertedCount}건이 등록/수정됐습니다.`);
      router.refresh();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
          <h2 className="font-semibold text-slate-800">
            {mode === "edit" ? "판매부수 일괄 수정" : "판매부수 일괄 등록"}
          </h2>
          <div className="flex gap-3">
            {mode === "edit" && (
              <button
                className="text-sm text-slate-500 underline hover:text-slate-900"
                onClick={() => { window.location.href = `/api/sales/excel/download?t=${Date.now()}`; }}
                type="button"
              >
                현재 데이터 다운로드
              </button>
            )}
            <button
              className="text-sm text-slate-500 underline hover:text-slate-900"
              onClick={() => { window.location.href = `/api/sales/excel/template?t=${Date.now()}`; }}
              type="button"
            >
              양식 다운로드
            </button>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-xs text-slate-400">
            지사명·기관명이 비어있으면 바로 위 행 값을 사용 (fill-down) · 신규 기관은 자동 등록 · 기존 주문은 덮어씀
          </p>
          <form className="flex flex-wrap items-center gap-2" onSubmit={handlePreview}>
            <input accept=".xlsx,.xls" name="file" required type="file" />
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={loading}
              type="submit"
            >
              {loading ? "처리 중..." : "미리보기"}
            </button>
          </form>
        </div>
      </section>

      {preview && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">미리보기</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>총 {preview.summary.totalRows}행</span>
              <span className="text-emerald-700">유효 {preview.summary.validRows}건</span>
              {preview.summary.errorRows > 0 && (
                <span className="text-rose-600">오류 {preview.summary.errorRows}건</span>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4">
            {preview.errors.length > 0 && (
              <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>{e.row}행: {e.message}</li>
                ))}
              </ul>
            )}
            {preview.payload.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">지사</th>
                      <th className="px-3 py-2 text-left font-medium">기관</th>
                      <th className="px-3 py-2 text-left font-medium">프로그램</th>
                      <th className="px-3 py-2 text-center font-medium">호</th>
                      <th className="px-3 py-2 text-center font-medium">주문일</th>
                      <th className="px-3 py-2 text-right font-medium">부수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {preview.payload.map((row: SaleOrderPreviewRow, i) => (
                      <tr className="border-t border-slate-100" key={i}>
                        <td className="px-3 py-2 text-slate-500">{row.branchName}</td>
                        <td className="px-3 py-2">
                          {row.institutionName}
                          {row.isNewInstitution && (
                            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>
                          )}
                        </td>
                        <td className="px-3 py-2">{row.programName}</td>
                        <td className="px-3 py-2 text-center">{row.issueNumber}호</td>
                        <td className="px-3 py-2 text-center">{row.orderDate}</td>
                        <td className="px-3 py-2 text-right">{row.quantity.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            <button
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={loading || preview.payload.length === 0}
              onClick={handleApply}
              type="button"
            >
              {loading ? "처리 중..." : `${preview.payload.length}건 등록`}
            </button>
          </div>
        </section>
      )}

      {message && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{message}</p>
      )}
    </div>
  );
}
