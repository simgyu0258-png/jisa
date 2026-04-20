import { format, subMonths, subYears } from "date-fns";

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
