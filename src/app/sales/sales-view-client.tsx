"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { OrderModal } from "./order-modal";

type Branch = { id: number; name: string };
type Program = { id: number; name: string; totalIssues: number };
type Institution = { id: number; name: string; branchName: string; branchId: number };
type MonthlyOrder = { institutionId: number; programId: number; quantity: number };
type IssueOrder = { institutionId: number; issueNumber: number; quantity: number; orderDate: string };

export function SalesViewClient({
  branches, programs, institutions, allInstitutions,
  monthlyOrders, issueOrders,
  view, selectedBranchId, selectedProgramId, selectedYm,
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
  maxIssues: number;
  canEdit: boolean;
  canBulkEdit?: boolean;
}) {
  const router = useRouter();
  const [showModal, setShowModal] = useState(false);

  function navigate(updates: Record<string, string | undefined>) {
    const sp = new URLSearchParams();
    const merged = { view, branchId: selectedBranchId?.toString(), programId: selectedProgramId?.toString(), ym: selectedYm, ...updates };
    Object.entries(merged).forEach(([k, v]) => { if (v) sp.set(k, v); });
    router.push(`/sales?${sp.toString()}`);
  }

  // institutionId → branchId 매핑
  const instBranchMap = new Map(allInstitutions.map((i) => [i.id, i.branchId]));
  const isBranchView = !selectedBranchId; // 지사 미선택 = 지사 단위 뷰

  // 월별: (id, programId) → quantity  (id = institutionId or branchId)
  const monthlyMap = new Map<string, number>();
  for (const o of monthlyOrders) {
    const id = isBranchView ? (instBranchMap.get(o.institutionId) ?? o.institutionId) : o.institutionId;
    const key = `${id}-${o.programId}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + o.quantity);
  }

  // 호별: (id, issueNumber) → quantity
  const issueMap = new Map<string, number>();
  for (const o of issueOrders) {
    const id = isBranchView ? (instBranchMap.get(o.institutionId) ?? o.institutionId) : o.institutionId;
    const key = `${id}-${o.issueNumber}`;
    issueMap.set(key, (issueMap.get(key) ?? 0) + o.quantity);
  }

  // 뷰 기준 행 목록
  const rows = isBranchView
    ? branches.map((b) => ({ id: b.id, label: b.name, sub: "" }))
    : institutions.map((i) => ({ id: i.id, label: i.name, sub: i.branchName }));

  const issueNumbers = Array.from({ length: maxIssues }, (_, i) => i + 1);

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
                <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="/sales/bulk-edit">일괄 수정</Link>
                <Link className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50" href="/sales/bulk">일괄 등록</Link>
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

      {/* 호별 현황 테이블 */}
      {view === "issue" && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">{isBranchView ? "지사" : "지사"}</th>
                {!isBranchView && <th className="px-3 py-2 text-left">기관</th>}
                {issueNumbers.map((n) => (
                  <th className="px-3 py-2 text-right" key={n}>{n}호</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">합계</th>
              </tr>
            </thead>
            <tbody>
              {rows.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={maxIssues + (isBranchView ? 2 : 3)}>데이터가 없습니다.</td></tr>
              )}
              {rows.map((row) => {
                const values = issueNumbers.map((n) => issueMap.get(`${row.id}-${n}`) ?? 0);
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
                      <td className="px-3 py-2 text-right" key={issueNumbers[i]}>{v > 0 ? v.toLocaleString() : "-"}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold">{total > 0 ? total.toLocaleString() : "-"}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

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
