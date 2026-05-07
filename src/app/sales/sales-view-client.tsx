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

  // 월별: (institutionId, programId) → quantity
  const monthlyMap = new Map<string, number>();
  for (const o of monthlyOrders) {
    const key = `${o.institutionId}-${o.programId}`;
    monthlyMap.set(key, (monthlyMap.get(key) ?? 0) + o.quantity);
  }

  // 호별: (institutionId, issueNumber) → quantity
  const issueMap = new Map<string, number>();
  for (const o of issueOrders) {
    const key = `${o.institutionId}-${o.issueNumber}`;
    issueMap.set(key, (issueMap.get(key) ?? 0) + o.quantity);
  }

  const issueNumbers = Array.from({ length: maxIssues }, (_, i) => i + 1);

  return (
    <div className="space-y-4">
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
      {view === "monthly" && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">지사</th>
                <th className="px-3 py-2 text-left">기관</th>
                {programs.filter((p) => !selectedProgramId || p.id === selectedProgramId).map((p) => (
                  <th className="px-3 py-2 text-right" key={p.id}>{p.name}</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">합계</th>
              </tr>
            </thead>
            <tbody>
              {institutions.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={programs.length + 3}>데이터가 없습니다.</td></tr>
              )}
              {institutions.map((inst) => {
                const visiblePrograms = programs.filter((p) => !selectedProgramId || p.id === selectedProgramId);
                const values = visiblePrograms.map((p) => monthlyMap.get(`${inst.id}-${p.id}`) ?? 0);
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <tr className="border-t border-slate-200" key={inst.id}>
                    <td className="px-3 py-2 text-slate-500 text-xs">{inst.branchName}</td>
                    <td className="px-3 py-2">{inst.name}</td>
                    {values.map((v, i) => (
                      <td className="px-3 py-2 text-right" key={visiblePrograms[i].id}>{v.toLocaleString()}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold">{total.toLocaleString()}</td>
                  </tr>
                );
              })}
            </tbody>
            {institutions.length > 0 && (
              <tfoot className="bg-slate-50 font-semibold">
                <tr>
                  <td className="px-3 py-2" colSpan={2}>합계</td>
                  {programs.filter((p) => !selectedProgramId || p.id === selectedProgramId).map((p) => {
                    const total = institutions.reduce((s, inst) => s + (monthlyMap.get(`${inst.id}-${p.id}`) ?? 0), 0);
                    return <td className="px-3 py-2 text-right" key={p.id}>{total.toLocaleString()}</td>;
                  })}
                  <td className="px-3 py-2 text-right">
                    {institutions.reduce((s, inst) =>
                      s + programs.filter((p) => !selectedProgramId || p.id === selectedProgramId)
                        .reduce((ss, p) => ss + (monthlyMap.get(`${inst.id}-${p.id}`) ?? 0), 0), 0).toLocaleString()}
                  </td>
                </tr>
              </tfoot>
            )}
          </table>
        </div>
      )}

      {/* 호별 현황 테이블 */}
      {view === "issue" && (
        <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-100">
              <tr>
                <th className="px-3 py-2 text-left">지사</th>
                <th className="px-3 py-2 text-left">기관</th>
                {issueNumbers.map((n) => (
                  <th className="px-3 py-2 text-right" key={n}>{n}호</th>
                ))}
                <th className="px-3 py-2 text-right font-semibold">합계</th>
              </tr>
            </thead>
            <tbody>
              {institutions.length === 0 && (
                <tr><td className="px-3 py-8 text-center text-slate-400" colSpan={maxIssues + 3}>데이터가 없습니다.</td></tr>
              )}
              {institutions.map((inst) => {
                const values = issueNumbers.map((n) => issueMap.get(`${inst.id}-${n}`) ?? 0);
                const total = values.reduce((s, v) => s + v, 0);
                return (
                  <tr className="border-t border-slate-200" key={inst.id}>
                    <td className="px-3 py-2 text-slate-500 text-xs">{inst.branchName}</td>
                    <td className="px-3 py-2">{inst.name}</td>
                    {values.map((v, i) => (
                      <td className="px-3 py-2 text-right" key={issueNumbers[i]}>{v > 0 ? v.toLocaleString() : "-"}</td>
                    ))}
                    <td className="px-3 py-2 text-right font-semibold">{total.toLocaleString()}</td>
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
