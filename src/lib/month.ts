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

/**
 * 호별 집계용 Prisma where 조건 반환.
 * issueNumber 1-10은 회계연도 3-12월, 11-12는 다음 캘린더연도 1-2월에만 해당함.
 * 이를 강제함으로써 반품이 orderDate 기준으로 엉뚱한 회계연도에 잡히는 걸 방지.
 */
export function getIssueAwareDateWhere(fiscalYear: number) {
  return {
    OR: [
      { issueNumber: { lte: 10 }, orderDate: { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-01-01` } },
      { issueNumber: { gte: 11 }, orderDate: { gte: `${fiscalYear + 1}-01-01`, lt: `${fiscalYear + 1}-03-01` } },
    ],
  };
}

/** issueNumber + orderDate로 올바른 귀속 회계연도를 계산. */
export function getFiscalYearForIssue(issueNumber: number, orderDate: string): number {
  const issueMonth = issueNumber <= 10 ? issueNumber + 2 : issueNumber - 10;
  const fyFromDate = getFiscalYearFromDate(orderDate);
  const issueYear = issueNumber <= 10 ? fyFromDate : fyFromDate + 1;
  const issueDateStr = `${issueYear}-${String(issueMonth).padStart(2, "0")}-01`;
  return issueDateStr > orderDate ? fyFromDate - 1 : fyFromDate;
}

/** issueNumber + 귀속 회계연도로 해당 호의 마지막 날(canonical orderDate)을 반환. */
export function getIssueCanonicalDate(issueNumber: number, fiscalYear: number): string {
  const issueMonth = issueNumber <= 10 ? issueNumber + 2 : issueNumber - 10;
  const issueYear = issueNumber <= 10 ? fiscalYear : fiscalYear + 1;
  const lastDay = new Date(issueYear, issueMonth, 0).getDate();
  return `${issueYear}-${String(issueMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
