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
 * threshold = totalIssues - 2 기준으로 두 그룹으로 분리:
 *   - 1~threshold호(발행월 3월~): 해당 캘린더연도(1~12월) 주문을 그 회계연도로 집계.
 *       → 3월호를 직전 1~2월에 선주문해도 같은 회계연도로 잡힘.
 *   - (threshold+1)~totalIssues호(발행월 1~2월): 회계연도 전체(3월~다음해 2월) 기준.
 *       → 발행월이 다음 캘린더연도라 회계연도 기준을 유지해야 정확히 집계됨.
 *
 * 12호 프로그램: threshold=10 → 1~10호 캘린더연도, 11~12호 회계연도.
 * 6호 프로그램: threshold=4  → 1~4호 캘린더연도, 5~6호 회계연도.
 *   6호 2학기는 1~6호=9~2월이라 5~6호(1~2월)가 연도 경계를 넘으므로 회계연도 기준 필요.
 *
 * isOnlyOne: false 포함 — 온리원 이중 집계 방지.
 * 새 totalIssues 값이 추가되면 OR 절을 추가할 것.
 */
export function getIssueAwareDateWhere(fiscalYear: number) {
  return {
    OR: [
      // 12호 프로그램
      { program: { isOnlyOne: false, totalIssues: 12 }, issueNumber: { lte: 10 }, orderDate: { gte: `${fiscalYear}-01-01`, lt: `${fiscalYear + 1}-01-01` } },
      { program: { isOnlyOne: false, totalIssues: 12 }, issueNumber: { gte: 11 }, orderDate: { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-03-01` } },
      // 6호 프로그램 (1학기 3~8월, 2학기 9~2월)
      { program: { isOnlyOne: false, totalIssues: 6 }, issueNumber: { lte: 4 }, orderDate: { gte: `${fiscalYear}-01-01`, lt: `${fiscalYear + 1}-01-01` } },
      { program: { isOnlyOne: false, totalIssues: 6 }, issueNumber: { gte: 5 }, orderDate: { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-03-01` } },
    ],
  };
}

/**
 * 단일 호의 orderDate 범위 반환.
 * threshold = totalIssues - 2 기준: 이하 캘린더연도, 초과 회계연도.
 */
export function getIssueDateRange(issueNumber: number, fiscalYear: number, totalIssues = 12): { gte: string; lt: string } {
  if (issueNumber <= totalIssues - 2) {
    return { gte: `${fiscalYear}-01-01`, lt: `${fiscalYear + 1}-01-01` };
  }
  return { gte: `${fiscalYear}-03-01`, lt: `${fiscalYear + 1}-03-01` };
}

/**
 * issueNumber + orderDate로 귀속 회계연도를 계산.
 * threshold = totalIssues - 2 기준: 이하 캘린더연도, 초과 회계연도(getFiscalYearFromDate).
 * originalOrderDate를 사용하므로 6호 프로그램의 1학기/2학기 구분도 정확함.
 */
export function getFiscalYearForIssue(issueNumber: number, orderDate: string, totalIssues = 12): number {
  if (issueNumber <= totalIssues - 2) return Number(orderDate.slice(0, 4));
  return getFiscalYearFromDate(orderDate);
}

/**
 * issueNumber + 귀속 회계연도로 해당 호의 마지막 날(canonical orderDate)을 반환.
 * threshold = totalIssues - 2 기준으로 발행월을 계산:
 *   - 1~threshold호: 발행월 = issueNumber + 2, 발행연도 = fiscalYear
 *   - 초과호: 발행월 = issueNumber - threshold, 발행연도 = fiscalYear + 1
 */
export function getIssueCanonicalDate(issueNumber: number, fiscalYear: number, totalIssues = 12): string {
  const threshold = totalIssues - 2;
  const issueMonth = issueNumber <= threshold ? issueNumber + 2 : issueNumber - threshold;
  const issueYear = issueNumber <= threshold ? fiscalYear : fiscalYear + 1;
  const lastDay = new Date(issueYear, issueMonth, 0).getDate();
  return `${issueYear}-${String(issueMonth).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;
}
