import { format, subMonths, subYears } from "date-fns";

// 회계연도: 당해 3월 ~ 다음해 2월
// 예) 2026년 = 2026-03-01 ~ 2027-02-28

export function getCurrentFiscalYear(): number {
  const now = new Date();
  const month = now.getMonth() + 1;
  return month >= 3 ? now.getFullYear() : now.getFullYear() - 1;
}

export function getFiscalYearRange(year: number) {
  return {
    gte: `${year}-03-01`,
    lt: `${year + 1}-03-01`,
  };
}

export function getFiscalYearFromDate(dateStr: string): number {
  const year = Number(dateStr.slice(0, 4));
  const month = Number(dateStr.slice(5, 7));
  return month >= 3 ? year : year - 1;
}

export function getCurrentFiscalIssue(): number {
  const month = new Date().getMonth() + 1;
  return month >= 3 ? month - 2 : month + 10;
}

export function getFiscalMonths(year: number): { label: string; ym: string }[] {
  return Array.from({ length: 12 }, (_, i) => {
    const month = i + 3; // 3월부터 시작
    const calYear = month > 12 ? year + 1 : year;
    const calMonth = month > 12 ? month - 12 : month;
    return {
      label: `${calMonth}월`,
      ym: `${calYear}-${String(calMonth).padStart(2, "0")}`,
    };
  });
}

export function getCurrentYearMonth() {
  return format(new Date(), "yyyy-MM");
}

export function getPreviousYearMonth(yearMonth: string) {
  const date = new Date(`${yearMonth}-01T00:00:00`);
  return format(subMonths(date, 1), "yyyy-MM");
}

export function getSameMonthLastYear(yearMonth: string) {
  const date = new Date(`${yearMonth}-01T00:00:00`);
  return format(subYears(date, 1), "yyyy-MM");
}

export function getRecentMonths(count = 12) {
  return Array.from({ length: count }, (_, index) =>
    format(subMonths(new Date(), count - index - 1), "yyyy-MM"),
  );
}

export function isValidYearMonth(value: string) {
  return /^\d{4}-\d{2}$/.test(value);
}
