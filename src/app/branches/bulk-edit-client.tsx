"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { BulkEditPreviewResponse, BulkEditRow } from "@/app/api/branches/excel/bulk-edit/preview/route";

export function BranchBulkEditClient() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<BulkEditPreviewResponse | null>(null);
  const [message, setMessage] = useState("");

  async function requestPreview(formData: FormData) {
    setLoading(true);
    setMessage("");
    setPreview(null);
    try {
      const response = await fetch("/api/branches/excel/bulk-edit/preview", { method: "POST", body: formData });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "미리보기 실패");
      setPreview(data);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  async function applyPreview() {
    if (!preview || preview.payload.length === 0) return;
    setLoading(true);
    try {
      const response = await fetch("/api/branches/excel/bulk-edit/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview.payload }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "적용 실패");
      setPreview(null);
      setMessage(`${data.updatedRows}개 지사 정보가 수정됐습니다.`);
      router.refresh();
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const programIds = preview ? Object.keys(preview.programNames).map(Number) : [];

  return (
    <div className="space-y-4">
      {/* 업로드 폼 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">엑셀 파일 업로드</h2>
        </div>
        <div className="p-5 space-y-3">
          <p className="text-sm text-slate-500">
            현재 지사 데이터를 다운로드하여 수정한 뒤 업로드하세요.
            <a
              className="ml-2 text-slate-700 underline hover:text-slate-900"
              download
              href="/api/branches/excel/bulk-edit/download"
            >
              현재 데이터 다운로드
            </a>
          </p>
          <p className="text-xs text-slate-400">
            지사코드를 기준으로 매칭하여 수정합니다. 지사코드는 변경하지 마세요.
            판매권한: 프로그램명 컬럼에 1(권한있음) / 0(권한없음)
          </p>
          <form
            className="flex flex-wrap items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              requestPreview(new FormData(e.currentTarget));
            }}
          >
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

      {/* 미리보기 결과 */}
      {preview && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">미리보기</h2>
            <div className="flex items-center gap-4 text-sm text-slate-600">
              <span>총 {preview.summary.totalRows}행</span>
              <span className="text-emerald-700">수정 {preview.summary.validRows}건</span>
              {preview.summary.errorRows > 0 && (
                <span className="text-rose-600">오류 {preview.summary.errorRows}건</span>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4">
            {preview.errors.length > 0 && (
              <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                {preview.errors.map((err) => (
                  <li key={`${err.row}-${err.message}`}>{err.row}행: {err.message}</li>
                ))}
              </ul>
            )}

            {preview.payload.length > 0 && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">지사코드</th>
                      <th className="px-3 py-2 text-left font-medium">지사명</th>
                      <th className="px-3 py-2 text-left font-medium">지역</th>
                      <th className="px-3 py-2 text-left font-medium">상태</th>
                      <th className="px-3 py-2 text-left font-medium">담당자</th>
                      <th className="px-3 py-2 text-left font-medium">연락처</th>
                      <th className="px-3 py-2 text-left font-medium">주소</th>
                      {programIds.map((id) => (
                        <th className="px-3 py-2 text-center font-medium" key={id}>
                          {preview.programNames[id]}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {preview.payload.map((row: BulkEditRow, i) => (
                      <tr className="border-t border-slate-100" key={i}>
                        <td className="px-3 py-2 font-medium text-slate-500">{row.branchCode}</td>
                        <td className="px-3 py-2">{row.name}</td>
                        <td className="px-3 py-2">{row.region}</td>
                        <td className="px-3 py-2">{row.status}</td>
                        <td className="px-3 py-2">{row.managerName}</td>
                        <td className="px-3 py-2">{row.phone}</td>
                        <td className="px-3 py-2 text-slate-400">{row.address ?? "-"}</td>
                        {programIds.map((id) => (
                          <td className="px-3 py-2 text-center" key={id}>
                            {row.permissions[id] ? (
                              <span className="text-emerald-600 font-medium">O</span>
                            ) : (
                              <span className="text-slate-300">-</span>
                            )}
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <button
              className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={loading || preview.payload.length === 0}
              onClick={applyPreview}
              type="button"
            >
              {loading ? "처리 중..." : `${preview.payload.length}건 수정 적용`}
            </button>
          </div>
        </section>
      )}

      {message && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          {message}
        </p>
      )}
    </div>
  );
}
