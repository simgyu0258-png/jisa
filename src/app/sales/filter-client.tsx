"use client";

import { useState } from "react";

const MONTH_LABELS = ["1월", "2월", "3월", "4월", "5월", "6월", "7월", "8월", "9월", "10월", "11월", "12월"];
const MONTH_KEYS = ["01", "02", "03", "04", "05", "06", "07", "08", "09", "10", "11", "12"];

type Props = {
  selectedMonths: string[];
  q: string;
  region: string;
  status: string;
};

export function SalesFilterClient({ selectedMonths, q, region, status }: Props) {
  const currentYear = new Date().getFullYear();

  const [selected, setSelected] = useState<Set<string>>(() => new Set(selectedMonths));
  const [viewYear, setViewYear] = useState(() => {
    if (selectedMonths.length > 0) {
      return Number(selectedMonths[selectedMonths.length - 1].split("-")[0]);
    }
    return currentYear;
  });

  function toggle(ym: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(ym)) next.delete(ym);
      else next.add(ym);
      return next;
    });
  }

  const sortedSelected = Array.from(selected).sort();

  return (
    <form className="rounded-lg border border-slate-200 bg-white p-4 space-y-4" method="GET">
      {/* 연도 네비게이션 */}
      <div>
        <p className="mb-2 text-xs font-medium text-slate-500">조회 월 선택</p>
        <div className="flex items-center gap-3 mb-3">
          <button
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            onClick={() => setViewYear((y) => y - 1)}
            type="button"
          >
            ◀
          </button>
          <span className="w-16 text-center text-sm font-semibold text-slate-800">{viewYear}년</span>
          <button
            className="rounded px-2 py-1 text-sm text-slate-500 hover:bg-slate-100"
            onClick={() => setViewYear((y) => y + 1)}
            type="button"
          >
            ▶
          </button>
          {selected.size > 0 && (
            <button
              className="ml-2 text-xs text-slate-400 hover:text-slate-700 underline"
              onClick={() => setSelected(new Set())}
              type="button"
            >
              초기화
            </button>
          )}
        </div>

        {/* 월 그리드 */}
        <div className="grid grid-cols-6 gap-1.5 md:grid-cols-12">
          {MONTH_KEYS.map((m, i) => {
            const ym = `${viewYear}-${m}`;
            const isSelected = selected.has(ym);
            return (
              <button
                className={[
                  "rounded py-1.5 text-sm font-medium transition-colors",
                  isSelected
                    ? "bg-slate-900 text-white"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                ].join(" ")}
                key={m}
                onClick={() => toggle(ym)}
                type="button"
              >
                {MONTH_LABELS[i]}
              </button>
            );
          })}
        </div>

        {/* 선택된 월 요약 */}
        <div className="mt-2 min-h-[20px] text-xs text-slate-400">
          {sortedSelected.length === 0 ? (
            <span>월을 선택하세요</span>
          ) : (
            <span>선택됨: {sortedSelected.join(", ")}</span>
          )}
        </div>
      </div>

      {/* 선택된 월 hidden inputs */}
      {sortedSelected.map((ym) => (
        <input key={ym} name="yearMonth" type="hidden" value={ym} />
      ))}

      {/* 지사 검색/필터 */}
      <div className="grid grid-cols-1 gap-2 border-t border-slate-100 pt-3 md:grid-cols-4">
        <input defaultValue={q} name="q" placeholder="지사명 검색" />
        <input defaultValue={region} name="region" placeholder="지역 필터" />
        <select defaultValue={status} name="status">
          <option value="">전체 상태</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button
          className="rounded-md bg-slate-900 px-3 py-2 text-sm text-white disabled:opacity-40"
          disabled={selected.size === 0}
          type="submit"
        >
          조회
        </button>
      </div>
    </form>
  );
}
