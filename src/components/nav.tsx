"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { signOut } from "next-auth/react";

const menuGroups = [
  {
    items: [
      { href: "/", label: "대시보드" },
    ],
  },
  {
    label: "지사",
    items: [
      { href: "/branches", label: "지사 관리" },
      { href: "/permissions", label: "판매권한 관리" },
      { href: "/targets", label: "목표 관리" },
    ],
  },
  {
    label: "판매",
    items: [
      { href: "/sales", label: "판매 현황" },
      { href: "/only-one", label: "온리원 현황" },
      { href: "/analytics", label: "판매 분석" },
    ],
  },
  {
    label: "시스템",
    items: [
      { href: "/upload", label: "자료 업데이트" },
      { href: "/erp-rules", label: "ERP 규칙 관리" },
      { href: "/programs", label: "프로그램 관리" },
      { href: "/accounts", label: "계정 관리", masterOnly: true },
    ],
  },
];

type Props = {
  userName: string;
  userRole: string;
};

export function MainNav({ userName, userRole }: Props) {
  const currentPath = usePathname();
  const isMaster = userRole === "master";

  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:w-56 lg:border-b-0 lg:border-r lg:flex lg:flex-col lg:sticky lg:top-0 lg:h-screen">
      <div className="px-5 py-5 text-base font-bold text-slate-900">지사 관리 시스템</div>
      <nav className="flex gap-1 px-3 pb-4 lg:flex-col lg:flex-1">
        {menuGroups.map((group, gi) => (
          <div key={gi} className={clsx("lg:space-y-0.5", gi > 0 && "lg:mt-4")}>
            {group.label && (
              <div className="px-3 pb-1 pt-1 text-xs font-semibold uppercase tracking-wider text-slate-400">
                {group.label}
              </div>
            )}
            {group.items
              .filter((item) => !("masterOnly" in item && item.masterOnly) || isMaster)
              .map((item) => {
                const active =
                  currentPath === item.href ||
                  (item.href !== "/" && currentPath.startsWith(item.href));
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={clsx(
                      "block rounded-md px-3 py-2 text-sm font-medium",
                      active ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-100",
                    )}
                  >
                    {item.label}
                  </Link>
                );
              })}
          </div>
        ))}
      </nav>
      <div className="border-t border-slate-100 px-3 pt-3">
        <Link
          href="/guide"
          className={clsx(
            "block rounded-md px-3 py-2 text-sm font-medium",
            currentPath === "/guide" ? "bg-slate-900 text-white" : "text-slate-500 hover:bg-slate-100",
          )}
        >
          이용 가이드
        </Link>
      </div>
      <div className="px-3 py-4">
        <div className="mb-2 px-2 text-xs text-slate-500">
          {userName}
          <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">
            {isMaster ? "마스터" : "일반"}
          </span>
        </div>
        <button
          className="w-full rounded-md px-3 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
