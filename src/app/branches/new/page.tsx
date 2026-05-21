"use client";

import Link from "next/link";
import { useState } from "react";
import { createBranchAction } from "../actions";

export default function NewBranchPage() {
  const [aliases, setAliases] = useState<string[]>([]);
  const [aliasInput, setAliasInput] = useState("");

  function addAlias() {
    const v = aliasInput.trim();
    if (v && !aliases.includes(v)) setAliases((prev) => [...prev, v]);
    setAliasInput("");
  }

  function removeAlias(i: number) {
    setAliases((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="mx-auto max-w-3xl space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">지사 등록</h1>
        <Link className="text-sm text-slate-600 underline" href="/branches">목록으로</Link>
      </div>

      <form action={createBranchAction} className="space-y-3 rounded-lg border border-slate-200 bg-white p-5">
        {[
          { label: "지사명", name: "name", req: true },
          { label: "지역", name: "region", req: true },
          { label: "담당자", name: "managerName", req: true },
          { label: "연락처", name: "phone", req: true },
          { label: "주소", name: "address", req: false },
        ].map(({ label, name, req }) => (
          <div className="flex items-center gap-3" key={name}>
            <span className={`w-3 shrink-0 text-center font-medium ${req ? "text-rose-500" : ""}`}>{req ? "*" : ""}</span>
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">{label}</span>
            <input className="min-w-0 flex-1" name={name} required={req} />
          </div>
        ))}

        <div className="flex items-center gap-3">
          <span className="w-3 shrink-0 text-center font-medium text-rose-500">*</span>
          <span className="w-20 shrink-0 text-sm font-medium text-slate-600">상태</span>
          <select className="min-w-0 flex-1" defaultValue="active" name="status">
            <option value="active">활성</option>
            <option value="inactive">비활성</option>
          </select>
        </div>

        <div className="flex items-start gap-3">
          <span className="w-3 shrink-0 pt-2" />
          <span className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-600">메모</span>
          <textarea className="min-w-0 flex-1" name="memo" rows={3} />
        </div>

        {/* 사업자명 별칭 */}
        <div className="flex items-start gap-3">
          <span className="w-3 shrink-0 pt-2" />
          <span className="w-20 shrink-0 pt-2 text-sm font-medium text-slate-600">사업자명 별칭</span>
          <div className="min-w-0 flex-1 space-y-2">
            {aliases.map((alias, i) => (
              <div key={i} className="flex items-center gap-2">
                <input type="hidden" name="alias" value={alias} />
                <span className="flex-1 rounded bg-slate-50 px-3 py-1.5 text-sm text-slate-700">{alias}</span>
                <button type="button" className="text-slate-400 hover:text-rose-500 px-1 text-sm" onClick={() => removeAlias(i)}>삭제</button>
              </div>
            ))}
            <div className="flex gap-2">
              <input
                className="min-w-0 flex-1"
                placeholder="추가할 사업자명 입력"
                type="text"
                value={aliasInput}
                onChange={(e) => setAliasInput(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addAlias(); } }}
              />
              <button type="button" className="shrink-0 rounded-md border border-slate-200 px-3 py-1.5 text-sm text-slate-600 hover:bg-slate-50" onClick={addAlias}>추가</button>
            </div>
            <p className="text-xs text-slate-400">ERP 거래처명이 지사명과 다를 경우 등록하세요.</p>
          </div>
        </div>

        <div className="flex justify-center pt-8">
          <button className="rounded-md bg-slate-900 px-6 py-2 text-sm text-white" type="submit">등록</button>
        </div>
      </form>
    </div>
  );
}
