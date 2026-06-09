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
 *
 * 1~10호(발행월 3~12월): 해당 캘린더연도(1~12월) 주문을 그 회계연도로 집계.
 *   → 3월호를 직전 1~2월에 선주문해도 같은 회계연도로 잡힘.
 * 11~12호(발행월 다음해 1~2월): 회계연도 전체(3월~다음해 2월) 주문을 그 회계연도로 집계.
 *   → 발행월이 다음 캘린더연도라 캘린더연도로 자르면 회계연도와 어긋나므로 회계연도 기준을 유지.
 *     1월호를 직전 12월에 선주문해도 같은 회계연도로 잡히고, 전년도 반품도 정확히 분리됨.
 *
 * 두 규칙 모두 연도 간 구간이 빈틈·겹침 없이 맞물려 어떤 주문도 유실되거나 이중 집계되지 않음.
 */
export function getIssueAwareDateWhere(fiscalYear: number) {
  return {
    OR: [
      { issueNumber: { lte: 10 }, orderDate: { gte: `${fiscalYear}-01-01`, lt: `${fiscalYear + 1}-01-01` } },
      { issueNumber: { gte: 11 }, orderDate: { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-03-01` } },
    ],
  };
}

/**
 * 단일 호의 orderDate 범위 반환. (getIssueAwareDateWhere와 동일 규칙)
 * 1~10호: 해당 캘린더연도, 11~12호: 해당 회계연도(3월~다음해 2월).
 */
export function getIssueDateRange(issueNumber: number, fiscalYear: number): { gte: string; lt: string } {
  if (issueNumber <= 10) {
    return { gte: `${fiscalYear}-01-01`, lt: `${fiscalYear + 1}-01-01` };
  }
  return { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-03-01` };
}

/**
 * issueNumber + orderDate로 귀속 회계연도를 계산. (getIssueAwareDateWhere와 동일 규칙)
 * 1~10호: orderDate의 캘린더연도, 11~12호: orderDate의 회계연도(3월~다음해 2월).
 */
export function getFiscalYearForIssue(issueNumber: number, orderDate: string): number {
  if (issueNumber <= 10) return Number(orderDate.slice(0, 4));
  return getFiscalYearFromDate(orderDate);
}

/** issueNumber + 귀속 회계연도로 해당 호의 마지막 날(canonical orderDate)을 반환. */
export function getIssueCanonicalDate(issueNumber: number, fiscalYear: number): string {
  const issueMonth = issueNumber <= 10 ? issueNumber + 2 : issueNumber - 10;
  const issueYear = issueNumber <= 10 ? fiscalYear : fiscalYear + 1;
  const lastDay = new Date(issueYear, issueMonth, 0).getDate();
  return `${issueYear}-${String(issueMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
