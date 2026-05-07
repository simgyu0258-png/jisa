"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { OrderModal } from "./order-modal";

type Branch = { id: number; name: string };
type Program = { id: number; name: string; totalIssues: number };
type Institution = { id: number; name: string; branchName: string; branchId: number };
type MonthlyOrder = { institutionId: number; programId: number; quantity: number };
type IssueOrder = { institutionId: number; programId: number; issueNumber: number; quantity: number };

export function SalesViewClient({
  branches, programs, institutions, allInstitutions,
  monthlyOrders, issueOrders,
  view, selectedBranchId, selectedProgramId, selectedYm, selectedYear,
  maxIssues, canEdit, canBulkEdit,
}: {
  branches: Branch[];
  programs: Program[];
  institutions: Institution[];
  allInstitutions: Institution[];
  monthlyOrders: MonthlyOrder[];
  issueOrders: IssueOrder[];
  view: "monthly" | "issue";
  selectedBranchId?: number;
  selectedProgramId?: number;
  selectedYm: string;
  selectedYear: string;
  maxIssues: number;
  canEdit: boolean;
  canBulkEdit?: boolean;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);
  const [issueModalCell, setIssueModalCell] = useState<{ branchId: number; branchName: string; issueNumber: number } | null>(null);

  function navigate(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = {
      view,
      branchId: selectedBranchId?.toString(),
      programId: selectedProgramId?.toString(),
      ym: selectedYm,
      year: selectedYear,
      ...updates,
    };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    router.push(`/sales?${sp.toString()}`);
  }

  const currentYear = new Date().getFullYear();
  const yearOptions = Array.from({ length: 7 }, (_, i) => currentYear - 3 + i);
  const issueNumbers = Array.from({ length: maxIssues }, (_, i) => i + 1);

  // institutionId → branchId 매핑
  const instBranchMap = new Map(allInstitutions.map((i) => [i.id, i.branchId]));
  const isBranchView = !selectedBranchId;

  // 월별: (id, programId) → quantity
  const monthlyMap = new Map<string, number>();
  for (const o of monthlyOrders) {
    const id = isBranchView ? (instBranchMap.get(o.institutionId) ?? o.institutionId) : o.institutionId;
    const key = `${id}-${o.programId}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + o.quantity);
  }

  // 호별 기본 그리드: (branchId, issueNumber) → 전체 합계
  const issueGridMap = new Map<string, number>();
  for (const o of issueOrders) {
    const branchId = instBranchMap.get(o.institutionId);
    if (branchId === undefined) continue;
    const key = `${branchId}-${o.issueNumber}`;
    issueGridMap.set(key, (issueGridMap.get(key) ?? 0) + o.quantity);
  }

  // 월별 뷰 행 목록
  const rows = isBranchView
    ? branches.map((b) => ({ id: b.id, label: b.name, sub: "" }))
    : institutions.map((i) => ({ id: i.id, label: i.name, sub: i.branchName }));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매부수 조회 및 관리</h1>

      {/* 필터 */}
      <div className="flex flex-wrap gap-2 rounded-lg border border-slate-200 bg-white p-4">
        <select className="flex-1 min-w-36" value={selectedBranchId ?? ""} onChange={(e) => navigate({ branchId: e.target.value || undefined })}>
          <option value="">전체 지사</option>
          {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
        </select>
        <select className="flex-1 min-w-36" value={selectedProgramId ?? ""} onChange={(e) => navigate({ programId: e.target.value || undefined })}>
          <option value="">전체 프로그램</option>
          {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        {view === "monthly" && (
          <input className="w-36" type="month" value={selectedYm} onChange={(e) => navigate({ ym: e.target.value })} />
        )}
        {view === "issue" && (
          <select className="w-28" value={selectedYear} onChange={(e) => navigate({ year: e.target.value })}>
            {yearOptions.map((y) => (
              <option key={y} value={y}>{y}년</option>
            ))}
          </select>
        )}
      </div>

      {/* 탭 + 주문 입력 버튼 */}
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
        </div>
        {canEdit && (
          <div className="flex items-center gap-2">
            {canBulkEdit && (
              <>
                <a className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="/sales/bulk-edit">일괄 수정</a>
                <a className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="/sales/bulk">일괄 등록</a>
              </>
            )}
            <button
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white"
              onClick={() => setShowModal(true)}
            >판매부수 입력</button>
          </div>
        )}
      </div>

      {/* 월별 현황 테이블 */}
      {view === "monthly" && (() => {
        const visiblePrograms = programs.filter((p) => !selectedProgramId || p.id === selectedProgramId);
        return (
          <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
            <table className="min-w-full text-sm">
              <thead className="bg-slate-100">
                <tr>
                  <th className="px-3 py-2 text-left">{isBranchView ? "지사" : "지사"}</th>
                  {!isBranchView && <th className="px-3 py-2 text-left">기관</th>}
                  {visiblePrograms.map((p) => (
                    <th className="px-3 py-2 text-right" key={p.id}>{p.name}</th>
                  ))}
                  <th className="px-3 py-2 text-right font-semibold">합계</th>
                </tr>
              </thead>
              <tbody>
                {rows.length === 0 && (
                  <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={visiblePrograms.length + (isBranchView ? 2 : 3)}>데이터가 없습니다.</td></tr>
                )}
                {rows.map((row) => {
                  const values = visiblePrograms.map((p) => monthlyMap.get(`${row.id}-${p.id}`) ?? 0);
                  const total = values.reduce((s, v) => s + v, 0);
                  return (
                    <tr className="border-t border-slate-200 hover:bg-slate-50" key={row.id}>
                      <td className="px-3 py-2">
                        {isBranchView ? (
                          <button className="text-left font-medium text-slate-700 hover:underline"
                            onClick={() => navigate({ branchId: String(row.id) })}>
                            {row.label}
                          </button>
                        ) : (
                          <span className="text-xs text-slate-400">{row.sub}</span>
                        )}
                      </td>
                      {!isBranchView && <td className="px-3 py-2">{row.label}</td>}
                      {values.map((v, i) => (
                        <td className="px-3 py-2 text-right" key={visiblePrograms[i].id}>{v > 0 ? v.toLocaleString() : "-"}</td>
                      ))}
                      <td className="px-3 py-2 text-right font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                    </tr>
                  );
                })}
              </tbody>
              {rows.length > 0 && (
                <tfoot className="bg-slate-50 font-semibold">
                  <tr>
                    <td className="px-3 py-2" colSpan={isBranchView ? 1 : 2}>합계</td>
                    {visiblePrograms.map((p) => {
                      const total = rows.reduce((s, row) => s + (monthlyMap.get(`${row.id}-${p.id}`) ?? 0), 0);
                      return <td className="px-3 py-2 text-right" key={p.id}>{total.toLocaleString()}</td>;
                    })}
                    <td className="px-3 py-2 text-right">
                      {rows.reduce((s, row) => s + visiblePrograms.reduce((ss, p) => ss + (monthlyMap.get(`${row.id}-${p.id}`) ?? 0), 0), 0).toLocaleString()}
                    </td>
                  </tr>
                </tfoot>
              )}
            </table>
          </div>
        );
      })()}

      {/* 호별 현황 테이블: 행=지사, 열=호 / 숫자 클릭 시 모달 */}
      {view === "issue" && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">지사</th>
                {issueNumbers.map((n) => (
                  <th className="px-3 py-2 text-right" key={n}>{n}호</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">합계</th>
              </tr>
            </thead>
            <tbody>
              {branches.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={maxIssues + 2}>데이터가 없습니다.</td></tr>
              )}
              {branches.map((branch) => {
                const values = issueNumbers.map((n) => issueGridMap.get(`${branch.id}-${n}`) ?? 0);
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <tr className="border-t border-slate-200 hover:bg-slate-50" key={branch.id}>
                    <td className="px-3 py-2 font-medium text-slate-700">{branch.name}</td>
                    {values.map((v, i) => (
                      <td className="px-3 py-2 text-right" key={issueNumbers[i]}>
                        {v > 0 ? (
                          <button
                            className="font-medium text-slate-800 hover:text-blue-600 hover:underline"
                            onClick={() => setIssueModalCell({ branchId: branch.id, branchName: branch.name, issueNumber: issueNumbers[i] })}
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
            {branches.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-3 py-2">합계</td>
                  {issueNumbers.map((n) => {
                    const total = branches.reduce((s, b) => s + (issueGridMap.get(`${b.id}-${n}`) ?? 0), 0);
                    return <td className="px-3 py-2 text-right" key={n}>{total > 0 ? total.toLocaleString() : "-"}</td>;
                  })}
                  <td className="px-3 py-2 text-right">
                    {branches.reduce((s, b) => s + issueNumbers.reduce((ss, n) => ss + (issueGridMap.get(`${b.id}-${n}`) ?? 0), 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 호별 상세 모달 */}
      {issueModalCell && (() => {
        const { branchId, branchName, issueNumber } = issueModalCell;
        const branchInsts = allInstitutions.filter((i) => i.branchId === branchId);
        const detailMap = new Map<string, number>();
        for (const o of issueOrders) {
          if (o.issueNumber !== issueNumber) continue;
          if (instBranchMap.get(o.institutionId) !== branchId) continue;
          detailMap.set(`${o.institutionId}-${o.programId}`, o.quantity);
        }
        return (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={() => setIssueModalCell(null)}>
            <div className="relative max-h-[80vh] w-full max-w-5xl overflow-auto rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4">
                <h2 className="font-semibold text-slate-800">{branchName} — {issueNumber}호 상세</h2>
                <button className="text-slate-400 hover:text-slate-700" onClick={() => setIssueModalCell(null)}>✕</button>
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
      })()}

      {showModal && (
        <OrderModal
          branches={branches}
          programs={programs}
          institutions={allInstitutions}
          onClose={() => { setShowModal(false); router.refresh(); }}
        />
      )}
    </div>
  );
}
