"use client";

import { useState } from "react";

type MonthlyData = {
  current: number;
  change: number;
  yoyChange: number;
  currentMonth: string;
  previousMonth: string;
  sameMonthLastYear: string;
};

type IssueData = {
  currentIssue: number;
  current: number;
  prevChange: number | null;
  yoyChange: number;
};

function ChangeValue({ value }: { value: number }) {
  return (
    <div className={`mt-3 text-4xl font-bold ${value >= 0 ? "text-rose-600" : "text-blue-600"}`}>
      {value >= 0 ? "+" : ""}{value.toFixed(1)}%
    </div>
  );
}

export function DashboardSummaryCards({
  monthly, issue,
}: {
  monthly: MonthlyData;
  issue: IssueData;
}) {
  const [tab, setTab] = useState<"monthly" | "issue">("monthly");

  return (
    <div className="space-y-2">
      <div className="flex rounded-lg border border-slate-200 bg-white overflow-hidden w-fit">
        <button
          className={`px-4 py-2 text-sm font-medium ${tab === "monthly" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("monthly")}
        >월 현황</button>
        <button
          className={`px-4 py-2 text-sm font-medium border-l border-slate-200 ${tab === "issue" ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50"}`}
          onClick={() => setTab("issue")}
        >호 현황</button>
      </div>

      {tab === "monthly" && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">이번 달 총 판매 부수 ({monthly.currentMonth})</div>
            <div className="mt-3 text-4xl font-bold">{monthly.current.toLocaleString()}</div>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">전월 대비 증감률 ({monthly.previousMonth} 대비)</div>
            <ChangeValue value={monthly.change} />
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">전년 동월 대비 증감률 ({monthly.sameMonthLastYear} 대비)</div>
            <ChangeValue value={monthly.yoyChange} />
          </article>
        </section>
      )}

      {tab === "issue" && (
        <section className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">{issue.currentIssue}호 총 판매 부수</div>
            <div className="mt-3 text-4xl font-bold">{issue.current.toLocaleString()}</div>
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">전 호 대비 증감률 ({issue.currentIssue - 1}호 대비)</div>
            {issue.prevChange !== null
              ? <ChangeValue value={issue.prevChange} />
              : <div className="mt-3 text-2xl font-bold text-slate-400">-</div>
            }
          </article>
          <article className="rounded-lg border border-slate-200 bg-white p-6">
            <div className="text-sm text-slate-500">전년도 동호 대비 증감률</div>
            <ChangeValue value={issue.yoyChange} />
          </article>
        </section>
      )}
    </div>
  );
}
