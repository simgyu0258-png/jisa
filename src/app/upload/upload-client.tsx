"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SaleOrderPreviewRow, SaleOrderPreviewResponse } from "@/app/api/sales/excel/preview/route";
import type { ErpUnresolvedRow, ErpPreviewResponse } from "@/app/api/upload/erp/preview/route";

type Tab = "erp" | "branch";

type Program = { id: number; name: string };

export function UploadClient({ programs }: { programs: Program[] }) {
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

      {tab === "erp" && <ErpUpload programs={programs} onDone={() => router.refresh()} />}
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

function ErpUpload({ programs, onDone }: { programs: Program[]; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ErpPreviewResponse | null>(null);
  const [message, setMessage] = useState("");
  // 미매핑 항목의 수동 지정: key=productName, value={programId, issueNumber}
  const [resolvedMap, setResolvedMap] = useState<Record<string, { programId: number; issueNumber: number }>>({});

  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setPreview(null);
    setResolvedMap({});
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
    if (!preview) return;
    setLoading(true);
    try {
      // 미매핑 항목 중 지정된 것만 newMappings로 변환
      const newMappings = preview.unresolved
        .filter((u) => resolvedMap[u.productName])
        .map((u) => ({
          productName: u.productName,
          programId: resolvedMap[u.productName].programId,
          issueNumber: resolvedMap[u.productName].issueNumber,
          branchId: u.branchId,
          institutionName: u.institutionName,
          institutionId: u.institutionId,
          orderDate: u.orderDate,
          quantity: u.quantity,
          isNewInstitution: u.isNewInstitution,
        }));

      const res = await fetch("/api/upload/erp/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview.payload, newMappings }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "적용 실패");
      setPreview(null);
      setResolvedMap({});
      const parts = [`${data.upsertedCount}건 등록/수정됐습니다.`];
      if (data.savedMappings > 0) parts.push(`품목명 매핑 ${data.savedMappings}건 저장됐습니다.`);
      setMessage(parts.join(" "));
      onDone();
    } catch (err) {
      setMessage(err instanceof Error ? err.message : "오류가 발생했습니다.");
    } finally {
      setLoading(false);
    }
  }

  const unresolvedCount = preview?.unresolved.length ?? 0;
  const resolvedCount = Object.keys(resolvedMap).length;
  const canApply = preview && (preview.payload.length > 0 || resolvedCount > 0);

  return (
    <div className="space-y-4">
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">ERP 파일 업로드</h2>
          <p className="mt-1 text-xs text-slate-400">
            ERP에서 다운로드한 엑셀 파일을 그대로 업로드하세요.
            동일 기관·프로그램·호·주문일의 수량은 최신 자료로 교체됩니다.
          </p>
        </div>
        <div className="p-5">
          <form className="space-y-2" onSubmit={handlePreview}>
            <div className="flex flex-wrap items-center gap-2">
              <input accept=".xlsx,.xls" name="file" required type="file" />
              <input
                className="w-48 text-sm"
                name="password"
                placeholder="파일 비밀번호 (없으면 빈칸)"
                type="password"
              />
              <button
                className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
                disabled={loading}
                type="submit"
              >
                {loading ? "처리 중..." : "미리보기"}
              </button>
            </div>
          </form>
        </div>
      </section>

      {preview && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
            <h2 className="font-semibold text-slate-800">미리보기</h2>
            <div className="flex items-center gap-3 text-sm text-slate-600">
              <span>유효 <strong className="text-emerald-700">{preview.summary.validRows}건</strong></span>
              {unresolvedCount > 0 && (
                <span>미매핑 <strong className="text-amber-600">{unresolvedCount}건</strong></span>
              )}
              {preview.summary.skippedRows > 0 && <span>건너뜀 {preview.summary.skippedRows}건</span>}
              {preview.summary.errorRows > 0 && <span className="text-rose-600">오류 {preview.summary.errorRows}건</span>}
            </div>
          </div>
          <div className="p-5 space-y-5">
            {/* 오류 목록 */}
            {preview.errors.length > 0 && (
              <ul className="rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 space-y-1">
                {preview.errors.map((e) => (
                  <li key={`${e.row}-${e.message}`}>{e.row > 0 ? `${e.row}행: ` : ""}{e.message}</li>
                ))}
              </ul>
            )}

            {/* 미매핑 항목 */}
            {unresolvedCount > 0 && (
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-semibold text-amber-700">미매핑 품목명 ({unresolvedCount}건)</h3>
                  <span className="text-xs text-slate-400">프로그램과 호를 지정하면 매핑이 저장되어 다음 업로드부터 자동 처리됩니다.</span>
                </div>
                <div className="overflow-x-auto rounded border border-amber-200 bg-amber-50">
                  <table className="min-w-full text-sm">
                    <thead className="bg-amber-100 text-amber-800">
                      <tr>
                        <th className="px-3 py-2 text-left font-medium">품목명</th>
                        <th className="px-3 py-2 text-left font-medium">지사</th>
                        <th className="px-3 py-2 text-left font-medium">기관</th>
                        <th className="px-3 py-2 text-center font-medium">수량</th>
                        <th className="px-3 py-2 text-center font-medium">프로그램</th>
                        <th className="px-3 py-2 text-center font-medium">호</th>
                      </tr>
                    </thead>
                    <tbody>
                      {preview.unresolved.map((u, i) => {
                        const r = resolvedMap[u.productName];
                        return (
                          <tr className="border-t border-amber-200" key={i}>
                            <td className="px-3 py-2 font-mono text-xs text-slate-700">{u.productName}</td>
                            <td className="px-3 py-2 text-slate-600">{u.branchName}</td>
                            <td className="px-3 py-2 text-slate-600">
                              {u.institutionName}
                              {u.isNewInstitution && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>}
                            </td>
                            <td className="px-3 py-2 text-center">{u.quantity.toLocaleString()}</td>
                            <td className="px-3 py-2">
                              <select
                                className="w-full text-sm"
                                value={r?.programId ?? ""}
                                onChange={(e) => setResolvedMap((prev) => ({
                                  ...prev,
                                  [u.productName]: { programId: Number(e.target.value), issueNumber: prev[u.productName]?.issueNumber ?? 0 },
                                }))}
                              >
                                <option value="">선택</option>
                                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input
                                className="w-16 text-center text-sm"
                                min={1}
                                placeholder="호"
                                type="number"
                                value={r?.issueNumber || ""}
                                onChange={(e) => setResolvedMap((prev) => ({
                                  ...prev,
                                  [u.productName]: { programId: prev[u.productName]?.programId ?? 0, issueNumber: Number(e.target.value) },
                                }))}
                              />
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* 유효 행 테이블 */}
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
                          {row.isNewInstitution && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>}
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
              disabled={loading || !canApply}
              onClick={handleApply}
              type="button"
            >
              {loading ? "처리 중..." : `${(preview.payload.length + resolvedCount)}건 적용`}
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
