"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { SaleOrderPreviewRow } from "@/app/api/sales/excel/preview/route";
import type { ErpUnresolvedRow, ErpReturnRow, ErpPreviewResponse } from "@/app/api/upload/erp/preview/route";

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

type PreviewSection = "valid" | "skipped" | "errors" | "unresolved" | "returns";

function ErpPreviewPanel({
  preview, programs, resolvedMap, setResolvedMap, returnFiscalYears, setReturnFiscalYears, loading, canApply, resolvedCount, onApply,
}: {
  preview: ErpPreviewResponse;
  programs: Program[];
  resolvedMap: Record<string, { programId: number; issueNumber: number }>;
  setResolvedMap: React.Dispatch<React.SetStateAction<Record<string, { programId: number; issueNumber: number }>>>;
  returnFiscalYears: Record<number, number>;
  setReturnFiscalYears: React.Dispatch<React.SetStateAction<Record<number, number>>>;
  loading: boolean;
  canApply: boolean;
  resolvedCount: number;
  onApply: () => void;
}) {
  const [active, setActive] = useState<PreviewSection | null>(
    preview.unresolved.length > 0 ? "unresolved"
      : preview.returns.length > 0 ? "returns"
      : preview.errors.length > 0 ? "errors"
      : "valid"
  );

  function toggle(section: PreviewSection) {
    setActive((prev) => (prev === section ? null : section));
  }

  const chips: { key: PreviewSection; label: string; count: number; color: string; activeColor: string }[] = [
    { key: "valid", label: "유효", count: preview.summary.validRows, color: "border-emerald-200 text-emerald-700 hover:bg-emerald-50", activeColor: "bg-emerald-700 text-white border-emerald-700" },
    { key: "returns", label: "반품", count: preview.returns.length, color: "border-orange-200 text-orange-600 hover:bg-orange-50", activeColor: "bg-orange-600 text-white border-orange-600" },
    { key: "skipped", label: "건너뜀", count: preview.summary.skippedRows, color: "border-slate-200 text-slate-500 hover:bg-slate-50", activeColor: "bg-slate-600 text-white border-slate-600" },
    { key: "errors", label: "오류", count: preview.summary.errorRows, color: "border-rose-200 text-rose-600 hover:bg-rose-50", activeColor: "bg-rose-600 text-white border-rose-600" },
    { key: "unresolved", label: "미매핑", count: preview.unresolved.length, color: "border-amber-200 text-amber-600 hover:bg-amber-50", activeColor: "bg-amber-500 text-white border-amber-500" },
  ];

  return (
    <section className="rounded-lg border border-slate-200 bg-white">
      <div className="border-b border-slate-100 px-5 py-4 flex items-center justify-between">
        <h2 className="font-semibold text-slate-800">미리보기</h2>
        <div className="flex items-center gap-2">
          {chips.map(({ key, label, count, color, activeColor }) => (
            <button
              key={key}
              type="button"
              disabled={count === 0}
              onClick={() => toggle(key)}
              className={`rounded-full border px-3 py-1 text-xs font-medium transition-colors disabled:opacity-30 disabled:cursor-default ${active === key ? activeColor : color}`}
            >
              {label} {count.toLocaleString()}건
            </button>
          ))}
        </div>
      </div>

      {active && (
        <div className="p-5">
          {active === "valid" && <ValidSection rows={preview.payload} />}
          {active === "returns" && (
            <ReturnSection
              rows={preview.returns}
              fiscalYears={returnFiscalYears}
              setFiscalYears={setReturnFiscalYears}
            />
          )}
          {active === "skipped" && (
            <p className="text-sm text-slate-500">
              ERP 제외 규칙에 의해 {preview.summary.skippedRows.toLocaleString()}건이 처리되지 않았습니다.
              규칙은 <a href="/erp-rules" className="underline text-slate-700">ERP 규칙 관리</a>에서 설정할 수 있습니다.
            </p>
          )}
          {active === "errors" && (
            <ul className="space-y-1 text-sm text-rose-700 max-h-80 overflow-y-auto">
              {preview.errors.map((e, i) => (
                <li key={i} className="border-b border-rose-100 pb-1 last:border-0">
                  {e.row > 0 ? <span className="mr-1 text-rose-400 text-xs">{e.row}행</span> : null}
                  {e.message}
                </li>
              ))}
            </ul>
          )}
          {active === "unresolved" && (
            <UnresolvedSection
              rows={preview.unresolved}
              programs={programs}
              resolvedMap={resolvedMap}
              setResolvedMap={setResolvedMap}
            />
          )}
        </div>
      )}

      <div className="border-t border-slate-100 px-5 py-4">
        <button
          className="rounded-md bg-emerald-700 px-4 py-2 text-sm text-white disabled:opacity-50"
          disabled={loading || !canApply}
          onClick={onApply}
          type="button"
        >
          {loading ? "처리 중..." : `${(preview.payload.length + resolvedCount + preview.returns.length).toLocaleString()}건 적용`}
        </button>
      </div>
    </section>
  );
}

function ValidSection({ rows }: { rows: SaleOrderPreviewRow[] }) {
  const grouped = rows.reduce<Record<string, SaleOrderPreviewRow[]>>((acc, row) => {
    (acc[row.branchName] ??= []).push(row);
    return acc;
  }, {});
  const branchNames = Object.keys(grouped);
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});

  function toggle(name: string) {
    setExpanded((prev) => ({ ...prev, [name]: !prev[name] }));
  }

  return (
    <div className="rounded border border-slate-200 overflow-hidden text-sm max-h-[500px] overflow-y-auto">
      {branchNames.map((branchName) => {
        const branchRows = grouped[branchName];
        const isOpen = !!expanded[branchName];
        const newCount = branchRows.filter((r) => r.isNewInstitution).length;
        return (
          <div key={branchName} className="border-b border-slate-100 last:border-b-0">
            <button
              type="button"
              className="w-full flex items-center justify-between px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-left"
              onClick={() => toggle(branchName)}
            >
              <span className="font-medium text-slate-800">
                <span className="mr-2 text-slate-400 text-xs">{isOpen ? "▼" : "▶"}</span>
                {branchName}
              </span>
              <span className="flex items-center gap-2 text-xs text-slate-500">
                {newCount > 0 && (
                  <span className="rounded-full bg-emerald-100 px-2 py-0.5 text-emerald-700">신규 {newCount}건</span>
                )}
                <span>{branchRows.length.toLocaleString()}건</span>
              </span>
            </button>
            {isOpen && (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-white text-slate-500 border-b border-slate-100">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">기관</th>
                      <th className="px-3 py-2 text-left font-medium">프로그램</th>
                      <th className="px-3 py-2 text-center font-medium">호</th>
                      <th className="px-3 py-2 text-center font-medium">주문일</th>
                      <th className="px-3 py-2 text-right font-medium">부수</th>
                    </tr>
                  </thead>
                  <tbody>
                    {branchRows.map((row, i) => (
                      <tr className="border-t border-slate-100" key={i}>
                        <td className="px-3 py-2">
                          {row.institutionName}
                          {row.isNewInstitution && (
                            <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>
                          )}
                        </td>
                        <td className="px-3 py-2 text-slate-600">{row.programName}</td>
                        <td className="px-3 py-2 text-center">{row.issueNumber}호</td>
                        <td className="px-3 py-2 text-center">{row.orderDate}</td>
                        <td className="px-3 py-2 text-right">{row.quantity.toLocaleString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function ReturnSection({
  rows, fiscalYears, setFiscalYears,
}: {
  rows: ErpReturnRow[];
  fiscalYears: Record<number, number>;
  setFiscalYears: React.Dispatch<React.SetStateAction<Record<number, number>>>;
}) {
  const allSuggested = rows.map((r) => r.suggestedFiscalYear);
  const fyOptions = [...new Set(allSuggested.flatMap((fy) => [fy - 1, fy, fy + 1]))].sort();

  function applyAllSuggested() {
    const all: Record<number, number> = {};
    rows.forEach((r, i) => { all[i] = r.suggestedFiscalYear; });
    setFiscalYears(all);
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <p className="text-xs text-slate-500">
          귀속 회계연도를 확인하세요. 시스템이 issueNumber 기준으로 자동 계산한 연도가 미리 선택되어 있습니다.
        </p>
        <button
          type="button"
          onClick={applyAllSuggested}
          className="shrink-0 rounded border border-orange-300 px-3 py-1 text-xs text-orange-700 hover:bg-orange-50"
        >
          전체 자동계산 적용
        </button>
      </div>
      <div className="overflow-x-auto rounded border border-orange-200 max-h-80 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-orange-50 text-orange-800 sticky top-0">
            <tr>
              <th className="px-3 py-2 text-left font-medium">품목명</th>
              <th className="px-3 py-2 text-left font-medium">지사</th>
              <th className="px-3 py-2 text-left font-medium">기관</th>
              <th className="px-3 py-2 text-center font-medium">호</th>
              <th className="px-3 py-2 text-center font-medium">수량</th>
              <th className="px-3 py-2 text-center font-medium">원본 일자</th>
              <th className="px-3 py-2 text-center font-medium">귀속 연도</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => {
              const selected = fiscalYears[i] ?? r.suggestedFiscalYear;
              const isOverridden = selected !== r.suggestedFiscalYear;
              return (
                <tr className="border-t border-orange-100" key={i}>
                  <td className="px-3 py-2 font-mono text-xs text-slate-700">{r.productName}</td>
                  <td className="px-3 py-2 text-slate-600">{r.branchName}</td>
                  <td className="px-3 py-2 text-slate-600">
                    {r.institutionName}
                    {r.isNewInstitution && <span className="ml-1 rounded-full bg-emerald-100 px-1.5 py-0.5 text-xs text-emerald-700">신규</span>}
                  </td>
                  <td className="px-3 py-2 text-center">{r.issueNumber}호</td>
                  <td className="px-3 py-2 text-center font-medium text-rose-600">{r.quantity.toLocaleString()}</td>
                  <td className="px-3 py-2 text-center text-xs text-slate-400">{r.originalOrderDate}</td>
                  <td className="px-3 py-2">
                    <select
                      className={`w-full text-sm rounded border px-1.5 py-0.5 ${isOverridden ? "border-orange-400 bg-orange-50" : "border-slate-200"}`}
                      value={selected}
                      onChange={(e) => setFiscalYears((prev) => ({ ...prev, [i]: Number(e.target.value) }))}
                    >
                      {fyOptions.map((fy) => (
                        <option key={fy} value={fy}>
                          {fy}년{fy === r.suggestedFiscalYear ? " (자동)" : ""}
                        </option>
                      ))}
                    </select>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function UnresolvedSection({
  rows, programs, resolvedMap, setResolvedMap,
}: {
  rows: ErpUnresolvedRow[];
  programs: Program[];
  resolvedMap: Record<string, { programId: number; issueNumber: number }>;
  setResolvedMap: React.Dispatch<React.SetStateAction<Record<string, { programId: number; issueNumber: number }>>>;
}) {
  return (
    <div className="space-y-2">
      <p className="text-xs text-slate-400">프로그램과 호를 지정하면 매핑이 저장되어 다음 업로드부터 자동 처리됩니다.</p>
      <div className="overflow-x-auto rounded border border-amber-200 max-h-80 overflow-y-auto">
        <table className="min-w-full text-sm">
          <thead className="bg-amber-50 text-amber-800 sticky top-0">
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
            {rows.map((u, i) => {
              const r = resolvedMap[u.productName];
              return (
                <tr className="border-t border-amber-100" key={i}>
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
  );
}

function ErpUpload({ programs, onDone }: { programs: Program[]; onDone: () => void }) {
  const [loading, setLoading] = useState(false);
  const [preview, setPreview] = useState<ErpPreviewResponse | null>(null);
  const [message, setMessage] = useState("");
  const [resolvedMap, setResolvedMap] = useState<Record<string, { programId: number; issueNumber: number }>>({});
  const [returnFiscalYears, setReturnFiscalYears] = useState<Record<number, number>>({});

  async function handlePreview(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setPreview(null);
    setResolvedMap({});
    setReturnFiscalYears({});
    try {
      const res = await fetch("/api/upload/erp/preview", { method: "POST", body: new FormData(e.currentTarget) });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "미리보기 실패");
      setPreview(data);
      const initFYs: Record<number, number> = {};
      (data.returns as ErpReturnRow[]).forEach((r, i) => { initFYs[i] = r.suggestedFiscalYear; });
      setReturnFiscalYears(initFYs);
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

      const returns = preview.returns.map((r, i) => ({
        institutionId: r.institutionId,
        institutionName: r.institutionName,
        branchId: r.branchId,
        isNewInstitution: r.isNewInstitution,
        programId: r.programId,
        issueNumber: r.issueNumber,
        quantity: r.quantity,
        fiscalYear: returnFiscalYears[i] ?? r.suggestedFiscalYear,
      }));

      const res = await fetch("/api/upload/erp/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ payload: preview.payload, newMappings, returns }),
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

  const resolvedCount = Object.keys(resolvedMap).length;
  const canApply = preview && (preview.payload.length > 0 || resolvedCount > 0 || preview.returns.length > 0);

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
        <ErpPreviewPanel
          preview={preview}
          programs={programs}
          resolvedMap={resolvedMap}
          setResolvedMap={setResolvedMap}
          returnFiscalYears={returnFiscalYears}
          setReturnFiscalYears={setReturnFiscalYears}
          loading={loading}
          canApply={!!canApply}
          resolvedCount={resolvedCount}
          onApply={handleApply}
        />
      )}

      {message && (
        <p className="rounded-md border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">{message}</p>
      )}
    </div>
  );
}
