"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SaleOrderPreviewRow, SaleOrderPreviewResponse } from "@/app/api/sales/excel/preview/route";

type Tab = "erp" | "branch";

export function UploadClient() {
  const router = useRouter();
  const [tab, setTab] = useState<Tab>("erp");

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">자료 업데이트</h1>

      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === "erp" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("erp")}
        >ERP 파일 업로드</button>
        <button
          className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${tab === "branch" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("branch")}
        >지사 일괄등록</button>
      </div>

      {tab === "erp" && <ErpUpload onDone={() => router.refresh()} />}
      {tab === "branch" && (
        <div className="rounded-lg border border-slate-200 bg-white p-6 text-sm text-slate-600">
          지사 일괄등록은{" "}
          <a className="underline text-slate-900" href="/branches/bulk">지사 관리 &gt; 일괄 등록</a>
          에서 이용하실 수 있습니다.
        </div>
      )}
    </div>
  );
}

function ErpUpload({ onDone }: { onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<SaleOrderPreviewResponse | null>(null);
  const [message, setMessage] = useState("");

  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setPreview(null);
    try {
      const res = await fetch("/api/upload/erp/preview", { method: "POST", body: new FormData(e.currentTarget) });
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
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">ERP 파일 업로드</h2>
          <p className="mt-1 text-xs text-slate-400">
            ERP에서 다운로드한 엑셀 파일을 그대로 업로드하세요.
            워크북 항목은 자동으로 제외되며, 동일 기관·프로그램·호의 수량은 합산됩니다.
          </p>
        </div>
        <div className="p-5">
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
              <span>유효 <strong className="text-emerald-700">{preview.summary.validRows}건</strong></span>
              {(preview.summary as { skippedRows?: number }).skippedRows !== undefined && (
                <span>건너뜀 {(preview.summary as { skippedRows?: number }).skippedRows}건</span>
              )}
              {preview.summary.errorRows > 0 && (
                <span className="text-rose-600">오류 {preview.summary.errorRows}건</span>
              )}
            </div>
          </div>
          <div className="p-5 space-y-4">
            {preview.errors.length > 0 && (
              <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>{e.row > 0 ? `${e.row}행: ` : ""}{e.message}</li>
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
              {loading ? "처리 중..." : `${preview.payload.length}건 적용`}
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
