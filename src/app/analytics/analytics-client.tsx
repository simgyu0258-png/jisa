"use client";

import { useEffect, useRef, useState } from "react";
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer,
} from "recharts";

type Branch = { id: number; name: string };
type Program = { id: number; name: string; totalIssues: number };
type MonthlyAgg = { branchId: number; programId: number; ym: string; qty: number };
type IssueAgg = { branchId: number; programId: number; issueNumber: number; year: string; qty: number };

type CardConfig = {
  id: string;
  year: string;
  basis: "monthly" | "issue";
  branchId: number | null; // null = 전체 지사
  programIds: number[];    // [] = 전체 프로그램
  configured?: boolean;    // false = 새 카드 (빈칸 상태)
};

const LINE_COLORS = ["#2563eb", "#16a34a", "#dc2626", "#9333ea", "#ea580c", "#0891b2", "#ca8a04", "#db2777"];
const LS_KEY = "jisa-analytics-v1";
const THIS_YEAR = String(new Date().getFullYear());

function newCard(): CardConfig {
  return { id: crypto.randomUUID(), year: THIS_YEAR, basis: "monthly", branchId: null, programIds: [], configured: false };
}

export function AnalyticsClient({
  branches, programs, monthlyAgg, issueAgg, minYear,
}: {
  branches: Branch[];
  programs: Program[];
  monthlyAgg: MonthlyAgg[];
  issueAgg: IssueAgg[];
  minYear: number;
}) {
  const [cards, setCards] = useState<CardConfig[]>([newCard()]);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(LS_KEY);
      if (saved) {
        const parsed = JSON.parse(saved) as CardConfig[];
        if (Array.isArray(parsed) && parsed.length > 0) setCards(parsed);
      }
    } catch {}
    setReady(true);
  }, []);

  useEffect(() => {
    if (ready) localStorage.setItem(LS_KEY, JSON.stringify(cards));
  }, [cards, ready]);

  function addCard() { setCards((p) => [...p, newCard()]); }
  function removeCard(id: string) { setCards((p) => p.filter((c) => c.id !== id)); }
  function updateCard(id: string, updates: Partial<CardConfig>) {
    setCards((p) => p.map((c) => (c.id === id ? { ...c, ...updates } : c)));
  }

  if (!ready) return null;

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">판매 분석</h1>
        <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white" onClick={addCard}>
          차트 추가
        </button>
      </div>

      {cards.length === 0 && (
        <div className="rounded-lg border border-slate-200 bg-white p-16 text-center text-sm text-slate-400">
          차트 추가 버튼을 눌러 분석을 시작하세요.
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-2">
        {cards.map((card) => (
          <ChartCard
            key={card.id}
            config={card}
            branches={branches}
            programs={programs}
            monthlyAgg={monthlyAgg}
            issueAgg={issueAgg}
            minYear={minYear}
            onUpdate={(u) => updateCard(card.id, u)}
            onRemove={() => removeCard(card.id)}
          />
        ))}
      </div>
    </div>
  );
}

function SortedTooltip({ active, payload, label }: {
  active?: boolean;
  payload?: { name: string; value: number; color: string }[];
  label?: string;
}) {
  if (!active || !payload?.length) return null;
  const sorted = [...payload].sort((a, b) => (b.value ?? 0) - (a.value ?? 0));
  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2 text-xs shadow-lg">
      <p className="mb-1.5 font-medium text-slate-700">{label}</p>
      {sorted.map((entry) => (
        <div key={entry.name} className="flex items-center gap-2 py-0.5">
          <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: entry.color }} />
          <span className="text-slate-600">{entry.name}</span>
          <span className="ml-4 font-medium text-slate-800">{(entry.value ?? 0).toLocaleString()}</span>
        </div>
      ))}
    </div>
  );
}

function ChartCard({
  config, branches, programs, monthlyAgg, issueAgg, minYear, onUpdate, onRemove,
}: {
  config: CardConfig;
  branches: Branch[];
  programs: Program[];
  monthlyAgg: MonthlyAgg[];
  issueAgg: IssueAgg[];
  minYear: number;
  onUpdate: (u: Partial<CardConfig>) => void;
  onRemove: () => void;
}) {
  const cardRef = useRef<HTMLDivElement>(null);
  const [downloading, setDownloading] = useState(false);

  async function downloadImage() {
    if (!cardRef.current) return;
    setDownloading(true);
    try {
      const { toPng } = await import("html-to-image");
      const dataUrl = await toPng(cardRef.current, { pixelRatio: 2, backgroundColor: "#ffffff" });
      const link = document.createElement("a");
      link.download = `chart-${config.year}-${config.basis}.png`;
      link.href = dataUrl;
      link.click();
    } finally {
      setDownloading(false);
    }
  }

  // 필터 변경 시 항상 configured: true 로 설정
  function handleUpdate(updates: Partial<CardConfig>) {
    onUpdate({ ...updates, configured: true });
  }

  function toggleProgram(pid: number) {
    if (config.programIds.length === 0) {
      handleUpdate({ programIds: programs.map((p) => p.id).filter((id) => id !== pid) });
    } else if (config.programIds.includes(pid)) {
      const next = config.programIds.filter((id) => id !== pid);
      handleUpdate({ programIds: next });
    } else {
      const next = [...config.programIds, pid];
      handleUpdate({ programIds: next.length === programs.length ? [] : next });
    }
  }

  const selectedProgs = config.programIds.length === 0
    ? programs
    : programs.filter((p) => config.programIds.includes(p.id));

  const { data, lineKeys } = computeChartData(config, branches, programs, selectedProgs, monthlyAgg, issueAgg);
  const hasData = data.some((pt) => lineKeys.some((k) => (pt[k] as number) > 0));

  return (
    <div className="rounded-lg border border-slate-200 bg-white" ref={cardRef}>
      <div className="space-y-2 border-b border-slate-100 px-4 py-3">
        {/* 필터 행 */}
        <div className="flex flex-wrap items-center gap-2">
          <select className="text-sm" value={config.year} onChange={(e) => handleUpdate({ year: e.target.value })}>
            {Array.from({ length: new Date().getFullYear() - minYear + 1 }, (_, i) => String(minYear + i)).map((y) => <option key={y} value={y}>{y}년</option>)}
          </select>
          <select className="text-sm" value={config.basis} onChange={(e) => handleUpdate({ basis: e.target.value as CardConfig["basis"] })}>
            <option value="monthly">월별</option>
            <option value="issue">호별</option>
          </select>
          <select
            className="text-sm"
            value={config.branchId ?? ""}
            onChange={(e) => handleUpdate({ branchId: e.target.value ? Number(e.target.value) : null })}
          >
            <option value="">전체 지사</option>
            {branches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button
            className="ml-auto text-xs text-slate-400 hover:text-slate-700 disabled:opacity-40"
            disabled={downloading || config.configured === false}
            onClick={downloadImage}
            title="이미지 저장"
          >
            {downloading ? "저장 중..." : "이미지 저장"}
          </button>
          <button className="text-slate-400 hover:text-slate-700" onClick={onRemove}>✕</button>
        </div>
        {/* 프로그램 선택 */}
        <div className="flex flex-wrap gap-x-3 gap-y-1">
          <label className="flex cursor-pointer items-center gap-1 text-xs">
            <input type="checkbox" checked={config.programIds.length === 0} onChange={() => handleUpdate({ programIds: [] })} />
            전체
          </label>
          {programs.map((p) => (
            <label key={p.id} className="flex cursor-pointer items-center gap-1 text-xs">
              <input
                type="checkbox"
                checked={config.programIds.length === 0 || config.programIds.includes(p.id)}
                onChange={() => toggleProgram(p.id)}
              />
              {p.name}
            </label>
          ))}
        </div>
      </div>

      {/* 차트 */}
      <div className="p-4">
        {config.configured === false ? (
          <div className="flex h-52 items-center justify-center text-sm text-slate-400">
            필터를 선택하면 차트가 표시됩니다.
          </div>
        ) : !hasData ? (
          <div className="flex h-52 items-center justify-center text-sm text-slate-400">데이터가 없습니다.</div>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={data} margin={{ top: 4, right: 8, bottom: 4, left: 0 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
              <XAxis dataKey="name" tick={{ fontSize: 11 }} />
              <YAxis tick={{ fontSize: 11 }} width={40} />
              <Tooltip content={<SortedTooltip />} wrapperStyle={{ zIndex: 50 }} />
              <Legend wrapperStyle={{ fontSize: 12 }} />
              {lineKeys.map((key, i) => (
                <Line
                  key={key}
                  type="monotone"
                  dataKey={key}
                  stroke={LINE_COLORS[i % LINE_COLORS.length]}
                  strokeWidth={2}
                  dot={false}
                  connectNulls
                />
              ))}
            </LineChart>
          </ResponsiveContainer>
        )}
      </div>
    </div>
  );
}

function computeChartData(
  config: CardConfig,
  branches: Branch[],
  programs: Program[],
  selectedProgs: Program[],
  monthlyAgg: MonthlyAgg[],
  issueAgg: IssueAgg[],
): { data: Record<string, string | number>[]; lineKeys: string[] } {
  if (config.basis === "monthly") {
    const xPoints = Array.from({ length: 12 }, (_, i) => ({
      ym: `${config.year}-${String(i + 1).padStart(2, "0")}`,
      label: `${i + 1}월`,
    }));

    // 전체/특정 지사 모두 선 = 프로그램별
    const filtered = config.branchId === null
      ? monthlyAgg
      : monthlyAgg.filter((a) => a.branchId === config.branchId);
    const data = xPoints.map(({ ym, label }) => {
      const pt: Record<string, string | number> = { name: label };
      for (const p of selectedProgs) {
        pt[p.name] = filtered
          .filter((a) => a.programId === p.id && a.ym === ym)
          .reduce((s, a) => s + a.qty, 0);
      }
      return pt;
    });
    return { data, lineKeys: selectedProgs.map((p) => p.name) };
  } else {
    // 호별
    const maxIssues = Math.max(...(selectedProgs.length > 0 ? selectedProgs : programs).map((p) => p.totalIssues), 12);
    const xPoints = Array.from({ length: maxIssues }, (_, i) => ({ n: i + 1, label: `${i + 1}호` }));
    const filtered = issueAgg.filter((a) => a.year === config.year);

    // 전체/특정 지사 모두 선 = 프로그램별
    const branchFiltered = config.branchId === null
      ? filtered
      : filtered.filter((a) => a.branchId === config.branchId);
    const data = xPoints.map(({ n, label }) => {
      const pt: Record<string, string | number> = { name: label };
      for (const p of selectedProgs) {
        pt[p.name] = n > p.totalIssues ? 0 : branchFiltered
          .filter((a) => a.programId === p.id && a.issueNumber === n)
          .reduce((s, a) => s + a.qty, 0);
      }
      return pt;
    });
    return { data, lineKeys: selectedProgs.map((p) => p.name) };
  }
}
