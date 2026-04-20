"use client";

import { useState } from "react";

type PreviewResponse = {
  summary: {
    totalRows: number;
    updatedRows: number;
    unchangedRows: number;
    errorRows: number;
  };
  errors: Array<{ row: number; message: string }>;
  payload: Array<{ branchId: number; yearMonth: string; programQuantities: Record<number, number> }>;
};

export function SalesUploadClient() {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<PreviewResponse | null>(null);
  const [message, setMessage] = useState("");

  async function requestPreview(formData: FormData) {
    setLoading(true);
    setMessage("");
    try {
      const response = await fetch("/api/sales/excel/preview", {
        method: "POST",
        body: formData,
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "미리보기 실패");
      setPreview(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
      setPreview(null);
    } finally {
      setLoading(false);
    }
  }

  async function applyPreview() {
    if (!preview) return;
    setLoading(true);
    try {
      const response = await fetch("/api/sales/excel/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview.payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "적용 실패");
      setMessage(`적용 완료: ${data.updatedRows}건`);
      setPreview(null);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <section className="space-y-3 rounded-lg border border-slate-200 bg-white p-4">
      <h2 className="text-lg font-semibold">엑셀 업로드 (판매부수 일괄 수정)</h2>
      <p className="text-sm text-slate-500">
        양식을 다운로드한 뒤 판매부수를 입력하고 업로드하세요.
        <a
          className="ml-2 text-slate-700 underline hover:text-slate-900"
          download
          href="/api/sales/excel/template"
        >
          양식 다운로드
        </a>
      </p>
      <p className="text-xs text-slate-400">
        필수 컬럼: 지사코드, 연월(예: 2025-01) · 이후 컬럼: 프로그램별 판매부수
      </p>
      <form
        action={(formData) => {
          requestPreview(formData);
        }}
        className="flex flex-wrap items-center gap-2"
      >
        <input accept=".xlsx,.xls" name="file" required type="file" />
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" disabled={loading}>
          미리보기
        </button>
      </form>
      {preview && (
        <div className="rounded-md border border-slate-200 bg-slate-50 p-3 text-sm">
          <div>총 건수: {preview.summary.totalRows}</div>
          <div>수정 건수: {preview.summary.updatedRows}</div>
          <div>변경 없음: {preview.summary.unchangedRows}</div>
          <div>오류: {preview.summary.errorRows}</div>
          {preview.errors.length > 0 && (
            <ul className="mt-2 list-disc pl-5 text-rose-700">
              {preview.errors.slice(0, 8).map((error) => (
                <li key={`${error.row}-${error.message}`}>
                  {error.row}행: {error.message}
                </li>
              ))}
            </ul>
          )}
          <button
            className="mt-3 rounded-md bg-emerald-700 px-4 py-2 text-sm text-white"
            disabled={loading || preview.payload.length === 0}
            onClick={applyPreview}
            type="button"
          >
            미리보기 적용
          </button>
        </div>
      )}
      {message && <p className="text-sm text-slate-700">{message}</p>}
    </section>
  );
}
