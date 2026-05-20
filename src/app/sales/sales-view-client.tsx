"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderModal } from "./order-modal";
import { getFiscalMonths } from "@/lib/month";

type Branch = { id: number; name: string };
type Program = { id: number; name: string; totalIssues: number };
type Institution = { id: number; name: string; branchName: string; branchId: number };
type MonthlyOrder = { institutionId: number; programId: number; orderDate: string; quantity: number };
type IssueOrder = { institutionId: number; programId: number; issueNumber: number; quantity: number };
type SalesTarget = { branchId: number; programId: number; quantity: number };
type TargetActualOrder = { institutionId: number; programId: number; quantity: number };
type TargetPermission = { branchId: number; programId: number };
type InstitutionOrder = { institutionId: number; programId: number; issueNumber: number; quantity: number };

type MonthlyModalCell = { branchId: number; branchName: string; ym: string };
type IssueModalCell = { branchId: number; branchName: string; issueNumber: number };

export function SalesViewClient({
  branches, programs, allInstitutions,
  monthlyOrders, issueOrders, salesTargets, targetActualOrders, targetPermissions, institutionOrders,
  view, selectedBranchId, selectedYear, minYear, fiscalYear,
  maxIssues, canEdit, canBulkEdit,
}: {
  branches: Branch[];
  programs: Program[];
  allInstitutions: Institution[];
  monthlyOrders: MonthlyOrder[];
  issueOrders: IssueOrder[];
  salesTargets: SalesTarget[];
  targetActualOrders: TargetActualOrder[];
  targetPermissions: TargetPermission[];
  institutionOrders: InstitutionOrder[];
  view: "monthly" | "issue" | "target" | "institution";
  selectedBranchId?: number;
  selectedYear: string;
  minYear: number;
  fiscalYear: number;
  maxIssues: number;
  canEdit: boolean;
  canBulkEdit?: boolean;
}) {
  const router = useRouter();
  const [showOrderModal, setShowOrderModal] = useState(false);
  const [monthlyModal, setMonthlyModal] = useState<MonthlyModalCell | null>(null);
  const [issueModal, setIssueModal] = useState<IssueModalCell | null>(null);
  const [onlyNoOrder, setOnlyNoOrder] = useState(false);
  const [instFilterProgramId, setInstFilterProgramId] = useState<number | null>(null);
  const [instDetailModal, setInstDetailModal] = useState<Institution | null>(null);

  function navigate(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = {
      view,
      branchId: selectedBranchId?.toString(),
      year: selectedYear,
      ...updates,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    router.push(`/sales?${sp.toString()}`);
  }

  const yearOptions = Array.from({ length: fiscalYear - minYear + 1 }, (_, i) => minYear + i);
  const issueNumbers = Array.from({ length: maxIssues }, (_, i) => i + 1);
  const months = getFiscalMonths(Number(selectedYear));

  // institutionId → branchId 매핑
  const instBranchMap = new Map(allInstitutions.map((i) => [i.id, i.branchId]));

  // 표시할 지사 (필터)
  const visibleBranches = selectedBranchId
    ? branches.filter((b) => b.id === selectedBranchId)
    : branches;

  // 월별 그리드: (branchId, YYYY-MM) → 총 부수
  const monthlyGridMap = new Map<string, number>();
  for (const o of monthlyOrders) {
    const branchId = instBranchMap.get(o.institutionId);
    if (branchId === undefined) continue;
    const ym = o.orderDate.substring(0, 7);
    const key = `${branchId}-${ym}`;
    monthlyGridMap.set(key, (monthlyGridMap.get(key) ?? 0) + o.quantity);
  }

  // 호별 그리드: (branchId, issueNumber) → 총 부수
  const issueGridMap = new Map<string, number>();
  for (const o of issueOrders) {
    const branchId = instBranchMap.get(o.institutionId);
    if (branchId === undefined) continue;
    const key = `${branchId}-${o.issueNumber}`;
    issueGridMap.set(key, (issueGridMap.get(key) ?? 0) + o.quantity);
  }

  function DetailModal({
    title, branchId, filterOrders, onClose,
  }: {
    title: string;
    branchId: number;
    filterOrders: (o: { institutionId: number; programId: number; quantity: number }) => boolean;
    onClose: () => void;
  }) {
    const branchInsts = allInstitutions.filter((i) => i.branchId === branchId);
    const detailMap = new Map<string, number>();
    const allOrders = [...monthlyOrders, ...issueOrders] as { institutionId: number; programId: number; quantity: number }[];
    for (const o of allOrders) {
      if (!filterOrders(o)) continue;
      if (instBranchMap.get(o.institutionId) !== branchId) continue;
      const key = `${o.institutionId}-${o.programId}`;
      detailMap.set(key, (detailMap.get(key) ?? 0) + o.quantity);
    }
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
        <div className="relative max-h-[80vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
          <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
            <h2 className="font-semibold text-slate-800">{title}</h2>
            <button className="text-slate-400 hover:text-slate-700" onClick={onClose}>✕</button>
          </div>
          <div className="p-6">
            {branchInsts.length === 0 ? (
              <p className="text-sm text-slate-400">등록된 기관이 없습니다.</p>
            ) : (
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">기관</th>
                    {programs.map((p) => (
                      <th className="px-3 py-2 text-right whitespace-nowrap" key={p.id}>{p.name}</th>
                    ))}
                    <th className="px-3 py-2 text-right font-semibold whitespace-nowrap">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {branchInsts.map((inst) => {
                    const values = programs.map((p) => detailMap.get(`${inst.id}-${p.id}`) ?? 0);
                    const total = values.reduce((s, v) => s + v, 0);
                    return (
                      <tr className="border-t border-slate-200" key={inst.id}>
                        <td className="px-3 py-2 whitespace-nowrap">{inst.name}</td>
                        {values.map((v, i) => (
                          <td className="px-3 py-2 text-right" key={programs[i].id}>{v > 0 ? v.toLocaleString() : "-"}</td>
                        ))}
                        <td className="px-3 py-2 text-right font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2">합계</td>
                    {programs.map((p) => {
                      const total = branchInsts.reduce((s, inst) => s + (detailMap.get(`${inst.id}-${p.id}`) ?? 0), 0);
                      return <td className="px-3 py-2 text-right" key={p.id}>{total > 0 ? total.toLocaleString() : "-"}</td>;
                    })}
                    <td className="px-3 py-2 text-right">
                      {branchInsts.reduce((s, inst) => s + programs.reduce((ss, p) => ss + (detailMap.get(`${inst.id}-${p.id}`) ?? 0), 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              </table>
            )}
          </div>
        </div>
      </div>
    );
  }

  function GridTable({
    cols, getCellKey, getCellValue, getColLabel, footerLabel,
    onCellClick,
  }: {
    cols: { key: string; label: string }[];
    getCellKey: (branchId: number, colKey: string) => string;
    getCellValue: (mapKey: string) => number;
    getColLabel: (colKey: string) => string;
    footerLabel: string;
    onCellClick: (branch: Branch, colKey: string) => void;
  }) {
    return (
      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">지사</th>
              {cols.map((c) => (
                <th className="px-3 py-2 text-right whitespace-nowrap" key={c.key}>{c.label}</th>
              ))}
              <th className="px-3 py-2 text-right font-semibold">합계</th>
            </tr>
          </thead>
          <tbody>
            {visibleBranches.length === 0 && (
              <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={cols.length + 2}>데이터가 없습니다.</td></tr>
            )}
            {visibleBranches.map((branch) => {
              const values = cols.map((c) => getCellValue(getCellKey(branch.id, c.key)));
              const total = values.reduce((s, v) => s + v, 0);
              return (
                <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                  <td className="px-3 py-2 font-medium text-slate-700">{branch.name}</td>
                  {values.map((v, i) => (
                    <td className="px-3 py-2 text-right" key={cols[i].key}>
                      {v > 0 ? (
                        <button
                          className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                          onClick={() => onCellClick(branch, cols[i].key)}
                        >
                          {v.toLocaleString()}
                        </button>
                      ) : (
                        <span className="text-slate-300">-</span>
                      )}
                    </td>
                  ))}
                  <td className="px-3 py-2 text-right font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                </tr>
              );
            })}
          </tbody>
          {visibleBranches.length > 0 && (
            <tfoot className="bg-slate-50 font-semibold">
              <tr>
                <td className="px-3 py-2">{footerLabel}</td>
                {cols.map((c) => {
                  const total = visibleBranches.reduce((s, b) => s + getCellValue(getCellKey(b.id, c.key)), 0);
                  return <td className="px-3 py-2 text-right" key={c.key}>{total > 0 ? total.toLocaleString() : "-"}</td>;
                })}
                <td className="px-3 py-2 text-right">
                  {visibleBranches.reduce((s, b) => s + cols.reduce((ss, c) => ss + getCellValue(getCellKey(b.id, c.key)), 0), 0).toLocaleString()}
                </td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매부수 조회 및 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <select className="flex-1 min-w-36" value={selectedBranchId ?? ""} onChange={(e) => navigate({ branchId: e.target.value || undefined })}>
          <option value="">전체 지사</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="w-28" value={selectedYear} onChange={(e) => navigate({ year: e.target.value })}>
          {yearOptions.map((y) => (
            <option key={y} value={y}>{y}년</option>
          ))}
        </select>
      </div>

      {/* 탭 + 버튼 */}
      <div className="flex items-center justify-between">
        <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden">
          <button
            className={`px-4 py-2 text-sm font-medium ${view === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => navigate({ view: "monthly" })}
          >월별 현황</button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${view === "issue" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => navigate({ view: "issue" })}
          >호별 현황</button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${view === "target" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => navigate({ view: "target" })}
          >목표 현황</button>
          <button
            className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${view === "institution" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
            onClick={() => navigate({ view: "institution" })}
          >기관 현황</button>
        </div>
        <div className="flex items-center gap-2">
          <a
            className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
            href={`/api/sales/download?year=${selectedYear}${selectedBranchId ? `&branchId=${selectedBranchId}` : ""}&t=${Date.now()}`}
          >엑셀 다운로드</a>
          {canEdit && (
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => setShowOrderModal(true)}
            >판매부수 입력</button>
          )}
        </div>
      </div>

      {/* 월별 현황: 행=지사, 열=월 */}
      {view === "monthly" && (
        <GridTable
          cols={months.map((m) => ({ key: m.ym, label: m.label }))}
          getCellKey={(branchId, ym) => `${branchId}-${ym}`}
          getCellValue={(key) => monthlyGridMap.get(key) ?? 0}
          getColLabel={(ym) => ym}
          footerLabel="합계"
          onCellClick={(branch, ym) => setMonthlyModal({ branchId: branch.id, branchName: branch.name, ym })}
        />
      )}

      {/* 호별 현황: 행=지사, 열=호 */}
      {view === "issue" && (
        <GridTable
          cols={issueNumbers.map((n) => ({ key: String(n), label: `${n}호` }))}
          getCellKey={(branchId, n) => `${branchId}-${n}`}
          getCellValue={(key) => issueGridMap.get(key) ?? 0}
          getColLabel={(n) => `${n}호`}
          footerLabel="합계"
          onCellClick={(branch, n) => setIssueModal({ branchId: branch.id, branchName: branch.name, issueNumber: Number(n) })}
        />
      )}

      {/* 목표 현황: 행=지사, 열=프로그램, 셀=실적/목표/달성률 */}
      {view === "target" && (() => {
        // 집계 (권한 없는 프로그램은 목표 0으로 처리)
        const permSet = new Set(targetPermissions.map((p) => `${p.branchId}-${p.programId}`));
        const targetMap = new Map<string, number>();
        for (const t of salesTargets) {
          const key = `${t.branchId}-${t.programId}`;
          targetMap.set(key, permSet.has(key) ? t.quantity : 0);
        }
        const actualMap = new Map<string, number>();
        for (const o of targetActualOrders) {
          const bid = instBranchMap.get(o.institutionId);
          if (!bid) continue;
          const key = `${bid}-${o.programId}`;
          actualMap.set(key, (actualMap.get(key) ?? 0) + o.quantity);
        }

        function rateColor(rate: number | null) {
          if (rate === null) return "text-slate-400";
          if (rate >= 100) return "text-emerald-600";
          if (rate >= 50) return "text-amber-500";
          return "text-rose-600";
        }

        return (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">지사</th>
                  {programs.map((p) => (
                    <th className="px-3 py-2 text-center whitespace-nowrap" key={p.id}>{p.name}</th>
                  ))}
                  <th className="px-3 py-2 text-center font-semibold whitespace-nowrap">합계</th>
                </tr>
              </thead>
              <tbody>
                {visibleBranches.length === 0 && (
                  <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={programs.length + 1}>데이터가 없습니다.</td></tr>
                )}
                {visibleBranches.map((branch) => {
                  const totalActual = programs.reduce((s, p) => {
                    const key = `${branch.id}-${p.id}`;
                    return permSet.has(key) ? s + (actualMap.get(key) ?? 0) : s;
                  }, 0);
                  const totalTarget = programs.reduce((s, p) => {
                    const key = `${branch.id}-${p.id}`;
                    return permSet.has(key) ? s + (targetMap.get(key) ?? 0) : s;
                  }, 0);
                  const totalRate = totalTarget > 0 ? (totalActual / totalTarget) * 100 : null;
                  return (
                    <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                      <td className="px-3 py-2 font-medium text-slate-700 whitespace-nowrap">{branch.name}</td>
                      {programs.map((p) => {
                        const key = `${branch.id}-${p.id}`;
                        const hasPerm = permSet.has(key);
                        const actual = actualMap.get(key) ?? 0;
                        const target = targetMap.get(key) ?? 0;
                        const rate = target > 0 ? (actual / target) * 100 : null;
                        return (
                          <td className={`px-3 py-2 text-center ${!hasPerm ? "bg-slate-50" : ""}`} key={p.id}>
                            {!hasPerm ? null : target === 0 ? (
                              <span className="text-slate-400">-</span>
                            ) : (
                              <>
                                <div className={`font-semibold ${rateColor(rate)}`}>
                                  {rate !== null ? `${rate.toFixed(1)}%` : "-"}
                                </div>
                                <div className="text-xs text-slate-400 mt-0.5">
                                  {actual.toLocaleString()} / {target.toLocaleString()}
                                </div>
                              </>
                            )}
                          </td>
                        );
                      })}
                      <td className="px-3 py-2 text-center border-l border-slate-200">
                        {totalTarget === 0 ? (
                          <span className="text-slate-400">-</span>
                        ) : (
                          <>
                            <div className={`font-semibold ${rateColor(totalRate)}`}>
                              {totalRate !== null ? `${totalRate.toFixed(1)}%` : "-"}
                            </div>
                            <div className="text-xs text-slate-400 mt-0.5">
                              {totalActual.toLocaleString()} / {totalTarget.toLocaleString()}
                            </div>
                          </>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        );
      })()}

      {/* 기관 현황: 행=기관, 열=호, 프로그램 필터, 기관명 클릭→모달 */}
      {view === "institution" && (() => {
        if (!selectedBranchId) {
          return (
            <div className="rounded-lg border border-slate-200 bg-white p-12 text-center text-sm text-slate-400">
              지사를 선택하면 기관별 주문 현황을 확인할 수 있습니다.
            </div>
          );
        }

        const instOrderMap = new Map<string, number>();
        for (const o of institutionOrders) {
          if (instFilterProgramId && o.programId !== instFilterProgramId) continue;
          const key = `${o.institutionId}-${o.issueNumber}`;
          instOrderMap.set(key, (instOrderMap.get(key) ?? 0) + o.quantity);
        }

        const branchInsts = allInstitutions.filter((i) => i.branchId === selectedBranchId);
        const filteredInsts = onlyNoOrder
          ? branchInsts.filter((inst) => issueNumbers.every((n) => !instOrderMap.get(`${inst.id}-${n}`)))
          : branchInsts;

        return (
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <p className="text-xs text-slate-500">
                전체 {branchInsts.length}개 기관{onlyNoOrder && ` 중 미주문 ${filteredInsts.length}개`}
              </p>
              <div className="flex items-center gap-3">
                <select
                  className="text-sm"
                  value={instFilterProgramId ?? ""}
                  onChange={(e) => setInstFilterProgramId(e.target.value ? Number(e.target.value) : null)}
                >
                  <option value="">전체 프로그램</option>
                  {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                </select>
                <label className="flex cursor-pointer items-center gap-1.5 text-sm">
                  <input type="checkbox" checked={onlyNoOrder} onChange={(e) => setOnlyNoOrder(e.target.checked)} />
                  미주문 기관만 보기
                </label>
              </div>
            </div>
            <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
              <table className="min-w-full text-sm">
                <thead className="bg-slate-100">
                  <tr>
                    <th className="px-3 py-2 text-left whitespace-nowrap">기관</th>
                    {issueNumbers.map((n) => (
                      <th className="px-3 py-2 text-center" key={n}>{n}호</th>
                    ))}
                    <th className="px-3 py-2 text-center font-semibold">합계</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredInsts.length === 0 && (
                    <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={maxIssues + 2}>
                      {onlyNoOrder ? "미주문 기관이 없습니다." : "등록된 기관이 없습니다."}
                    </td></tr>
                  )}
                  {filteredInsts.map((inst) => {
                    const values = issueNumbers.map((n) => instOrderMap.get(`${inst.id}-${n}`) ?? 0);
                    const total = values.reduce((s, v) => s + v, 0);
                    return (
                      <tr className="border-t border-slate-200 hover:bg-slate-50" key={inst.id}>
                        <td className="px-3 py-2 whitespace-nowrap">
                          <button
                            className="font-medium text-slate-700 hover:text-blue-600 hover:underline text-left"
                            onClick={() => setInstDetailModal(inst)}
                          >{inst.name}</button>
                        </td>
                        {values.map((v, i) => (
                          <td className={`px-3 py-2 text-center ${v === 0 ? "bg-rose-50 text-rose-400" : "text-slate-700"}`} key={issueNumbers[i]}>
                            {v > 0 ? v.toLocaleString() : "✕"}
                          </td>
                        ))}
                        <td className="px-3 py-2 text-center font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* 기관 상세 모달 (프로그램×호) */}
            {instDetailModal && (() => {
              const detailMap = new Map<string, number>();
              for (const o of institutionOrders) {
                if (o.institutionId !== instDetailModal.id) continue;
                const key = `${o.programId}-${o.issueNumber}`;
                detailMap.set(key, (detailMap.get(key) ?? 0) + o.quantity);
              }
              return (
                <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setInstDetailModal(null)}>
                  <div className="relative max-h-[80vh] w-full max-w-4xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
                    <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                      <h2 className="font-semibold text-slate-800">{instDetailModal.name} — 프로그램별 주문 현황</h2>
                      <button className="text-slate-400 hover:text-slate-700" onClick={() => setInstDetailModal(null)}>✕</button>
                    </div>
                    <div className="p-6 overflow-x-auto">
                      <table className="min-w-full text-sm">
                        <thead className="bg-slate-100">
                          <tr>
                            <th className="px-3 py-2 text-left whitespace-nowrap">프로그램</th>
                            {issueNumbers.map((n) => (
                              <th className="px-3 py-2 text-center" key={n}>{n}호</th>
                            ))}
                            <th className="px-3 py-2 text-center font-semibold">합계</th>
                          </tr>
                        </thead>
                        <tbody>
                          {programs.map((p) => {
                            const values = issueNumbers.map((n) => {
                              if (n > p.totalIssues) return null;
                              return detailMap.get(`${p.id}-${n}`) ?? 0;
                            });
                            const total = values.reduce<number>((s, v) => s + (v ?? 0), 0);
                            const hasAny = values.some((v) => v !== null && v > 0);
                            return (
                              <tr className={`border-t border-slate-200 ${!hasAny ? "opacity-40" : ""}`} key={p.id}>
                                <td className="px-3 py-2 whitespace-nowrap font-medium text-slate-700">{p.name}</td>
                                {values.map((v, i) => (
                                  <td className={`px-3 py-2 text-center ${v === null ? "text-slate-200" : v === 0 ? "bg-rose-50 text-rose-400" : "text-slate-700"}`} key={issueNumbers[i]}>
                                    {v === null ? "—" : v > 0 ? v.toLocaleString() : "✕"}
                                  </td>
                                ))}
                                <td className="px-3 py-2 text-center font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              );
            })()}
          </div>
        );
      })()}

      {/* 월별 상세 모달 */}
      {monthlyModal && (
        <DetailModal
          title={`${monthlyModal.branchName} — ${monthlyModal.ym.replace("-", "년 ")}월`}
          branchId={monthlyModal.branchId}
          filterOrders={(o) => (o as MonthlyOrder).orderDate?.startsWith(monthlyModal.ym) ?? false}
          onClose={() => setMonthlyModal(null)}
        />
      )}

      {/* 호별 상세 모달 */}
      {issueModal && (
        <DetailModal
          title={`${issueModal.branchName} — ${issueModal.issueNumber}호`}
          branchId={issueModal.branchId}
          filterOrders={(o) => (o as IssueOrder).issueNumber === issueModal.issueNumber}
          onClose={() => setIssueModal(null)}
        />
      )}

      {showOrderModal && (
        <OrderModal
          branches={branches}
          programs={programs}
          institutions={allInstitutions}
          onClose={() => { setShowOrderModal(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
