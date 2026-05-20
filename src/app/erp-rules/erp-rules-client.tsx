"use client";

import { useState } from "react";
import { addSkipRuleAction, deleteSkipRuleAction, updateMappingAction, deleteMappingAction } from "./actions";

type SkipRule = { id: number; keyword1: string; keyword2: string | null };
type Mapping = { id: number; productName: string; programId: number; issueNumber: number };
type Program = { id: number; name: string };

export function ErpRulesClient({
  skipRules, mappings, programs,
}: {
  skipRules: SkipRule[];
  mappings: Mapping[];
  programs: Program[];
}) {
  const [tab, setTab] = useState<"skip" | "mapping">("skip");
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editProgram, setEditProgram] = useState(0);
  const [editIssue, setEditIssue] = useState(0);

  function startEdit(m: Mapping) {
    setEditingId(m.id);
    setEditProgram(m.programId);
    setEditIssue(m.issueNumber);
  }

  async function saveEdit(id: number) {
    await updateMappingAction(id, editProgram, editIssue);
    setEditingId(null);
  }

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">ERP 업로드 규칙 관리</h1>

      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === "skip" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("skip")}
        >제외 규칙</button>
        <button
          className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${tab === "mapping" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("mapping")}
        >품목명 매핑</button>
      </div>

      {tab === "skip" && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">제외 규칙</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              키워드1만 입력 시 해당 문자열 포함 품목 제외 · 키워드2 추가 시 두 문자열 모두 포함될 때만 제외
            </p>
          </div>
          <div className="p-5 space-y-3">
            {skipRules.length > 0 && (
              <ul className="space-y-1">
                {skipRules.map((rule) => (
                  <li key={rule.id} className="flex items-center gap-2 text-sm">
                    <span className="rounded bg-slate-50 px-3 py-1.5 font-mono text-slate-700">{rule.keyword1}</span>
                    {rule.keyword2 && (
                      <>
                        <span className="text-slate-400">+</span>
                        <span className="rounded bg-slate-50 px-3 py-1.5 font-mono text-slate-700">{rule.keyword2}</span>
                      </>
                    )}
                    <form action={deleteSkipRuleAction.bind(null, rule.id)} className="ml-auto">
                      <button className="text-slate-400 hover:text-rose-500 px-1" type="submit">삭제</button>
                    </form>
                  </li>
                ))}
              </ul>
            )}
            {skipRules.length === 0 && <p className="text-sm text-slate-400">등록된 제외 규칙이 없습니다.</p>}
            <form action={addSkipRuleAction} className="flex items-center gap-2 pt-2 border-t border-slate-100">
              <input className="min-w-0 flex-1" name="keyword1" placeholder="키워드1 *" required />
              <input className="min-w-0 flex-1" name="keyword2" placeholder="키워드2 (선택)" />
              <button className="shrink-0 rounded-md bg-slate-900 px-4 py-2 text-sm text-white" type="submit">추가</button>
            </form>
          </div>
        </section>
      )}

      {tab === "mapping" && (
        <section className="rounded-lg border border-slate-200 bg-white">
          <div className="border-b border-slate-100 px-5 py-4">
            <h2 className="font-semibold text-slate-800">품목명 매핑</h2>
            <p className="mt-0.5 text-xs text-slate-400">
              ERP 업로드 시 자동 파싱에 실패한 품목명을 수동 지정한 매핑 목록입니다.
            </p>
          </div>
          <div className="p-5">
            {mappings.length === 0 ? (
              <p className="text-sm text-slate-400">저장된 매핑이 없습니다. ERP 파일 업로드 시 미매핑 항목을 지정하면 자동으로 등록됩니다.</p>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-sm">
                  <thead className="bg-slate-50 text-slate-600">
                    <tr>
                      <th className="px-3 py-2 text-left font-medium">품목명</th>
                      <th className="px-3 py-2 text-center font-medium">프로그램</th>
                      <th className="px-3 py-2 text-center font-medium">호</th>
                      <th className="px-3 py-2 text-center font-medium">관리</th>
                    </tr>
                  </thead>
                  <tbody>
                    {mappings.map((m) => (
                      <tr className="border-t border-slate-100" key={m.id}>
                        <td className="px-3 py-2 font-mono text-xs text-slate-700">{m.productName}</td>
                        {editingId === m.id ? (
                          <>
                            <td className="px-3 py-2">
                              <select className="w-full text-sm" value={editProgram} onChange={(e) => setEditProgram(Number(e.target.value))}>
                                {programs.map((p) => <option key={p.id} value={p.id}>{p.name}</option>)}
                              </select>
                            </td>
                            <td className="px-3 py-2">
                              <input className="w-16 text-center text-sm" min={1} type="number" value={editIssue} onChange={(e) => setEditIssue(Number(e.target.value))} />
                            </td>
                            <td className="px-3 py-2 text-center space-x-2">
                              <button className="text-emerald-600 hover:underline text-xs" onClick={() => saveEdit(m.id)}>저장</button>
                              <button className="text-slate-400 hover:underline text-xs" onClick={() => setEditingId(null)}>취소</button>
                            </td>
                          </>
                        ) : (
                          <>
                            <td className="px-3 py-2 text-center">{programs.find((p) => p.id === m.programId)?.name ?? "-"}</td>
                            <td className="px-3 py-2 text-center">{m.issueNumber}호</td>
                            <td className="px-3 py-2 text-center space-x-2">
                              <button className="text-slate-500 hover:underline text-xs" onClick={() => startEdit(m)}>수정</button>
                              <form className="inline" action={deleteMappingAction.bind(null, m.id)}>
                                <button className="text-slate-400 hover:text-rose-500 text-xs" type="submit">삭제</button>
                              </form>
                            </td>
                          </>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </section>
      )}
    </div>
  );
}
