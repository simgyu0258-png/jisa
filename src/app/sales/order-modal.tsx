"use client";

import { useState, useTransition } from "react";
import { upsertSaleOrderAction, createInstitutionAction } from "./actions";

type Branch = { id: number; name: string };
type Program = { id: number; name: string; totalIssues: number };
type Institution = { id: number; name: string; branchId: number; branchName: string };

export function OrderModal({
  branches,
  programs,
  institutions,
  onClose,
}: {
  branches: Branch[];
  programs: Program[];
  institutions: Institution[];
  onClose: () => void;
}) {
  const [branchId, setBranchId] = useState<number | "">(branches[0]?.id ?? "");
  const [institutionId, setInstitutionId] = useState<number | "new" | "">("");
  const [newInstName, setNewInstName] = useState("");
  const [programId, setProgramId] = useState<number | "">(programs[0]?.id ?? "");
  const [issueNumber, setIssueNumber] = useState(1);
  const [orderDate, setOrderDate] = useState(new Date().toISOString().slice(0, 10));
  const [quantity, setQuantity] = useState(0);
  const [isPending, startTransition] = useTransition();

  const filteredInstitutions = institutions.filter((i) => i.branchId === Number(branchId));
  const selectedProgram = programs.find((p) => p.id === programId);
  const maxIssues = selectedProgram?.totalIssues ?? 12;

  function handleBranchChange(id: number | "") {
    setBranchId(id);
    setInstitutionId("");
  }

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!branchId || !programId || !orderDate) return;
    if (institutionId === "" ) return;

    startTransition(async () => {
      let resolvedInstitutionId: number;

      if (institutionId === "new") {
        if (!newInstName.trim()) return;
        resolvedInstitutionId = await createInstitutionAction(Number(branchId), newInstName.trim());
      } else {
        resolvedInstitutionId = Number(institutionId);
      }

      await upsertSaleOrderAction(resolvedInstitutionId, Number(programId), issueNumber, orderDate, quantity);
      onClose();
    });
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40" onClick={onClose}>
      <div className="w-full max-w-sm rounded-xl bg-white shadow-xl" onClick={(e) => e.stopPropagation()}>
        <div className="border-b border-slate-100 px-6 py-4">
          <h2 className="font-semibold text-slate-800">주문 입력</h2>
        </div>
        <form className="p-6 space-y-4" onSubmit={handleSubmit}>
          {/* 지사 선택 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">지사</label>
            <select className="w-full" value={branchId}
              onChange={(e) => handleBranchChange(e.target.value ? Number(e.target.value) : "")} required>
              <option value="">지사 선택</option>
              {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          {/* 기관 선택 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">기관</label>
            <select className="w-full" value={institutionId}
              onChange={(e) => setInstitutionId(e.target.value === "new" ? "new" : e.target.value ? Number(e.target.value) : "")}
              required disabled={!branchId}>
              <option value="">기관 선택</option>
              {filteredInstitutions.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
              <option value="new">+ 새 기관 추가</option>
            </select>
            {institutionId === "new" && (
              <input
                autoFocus
                className="w-full mt-1"
                placeholder="기관명 입력"
                value={newInstName}
                onChange={(e) => setNewInstName(e.target.value)}
                required
              />
            )}
          </div>

          {/* 프로그램 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">프로그램</label>
            <select className="w-full" value={programId}
              onChange={(e) => { setProgramId(Number(e.target.value)); setIssueNumber(1); }} required>
              {programs.map((p) => <option key={p.id} value={p.id}>{p.name} ({p.totalIssues}호)</option>)}
            </select>
          </div>

          {/* 호 + 부수 */}
          <div className="flex gap-3">
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-slate-600">호</label>
              <select className="w-full" value={issueNumber} onChange={(e) => setIssueNumber(Number(e.target.value))}>
                {Array.from({ length: maxIssues }, (_, i) => i + 1).map((n) => (
                  <option key={n} value={n}>{n}호</option>
                ))}
              </select>
            </div>
            <div className="flex-1 space-y-1">
              <label className="text-sm font-medium text-slate-600">부수</label>
              <input className="w-full" type="number" min={0} value={quantity}
                onChange={(e) => setQuantity(Math.max(0, Number(e.target.value)))} />
            </div>
          </div>

          {/* 주문일 */}
          <div className="space-y-1">
            <label className="text-sm font-medium text-slate-600">주문일</label>
            <input className="w-full" type="date" value={orderDate}
              onChange={(e) => setOrderDate(e.target.value)} required />
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-100 pt-4">
            <button type="button" className="rounded-md bg-slate-100 px-4 py-2 text-sm text-slate-700" onClick={onClose}>취소</button>
            <button type="submit"
              className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white disabled:opacity-50"
              disabled={isPending || !branchId || !institutionId || (institutionId === "new" && !newInstName.trim())}>
              {isPending ? "저장 중..." : "저장"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
