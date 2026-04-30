"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";
import { signOut } from "next-auth/react";

const menus = [
  { href: "/", label: "대시보드", masterOnly: false },
  { href: "/branches", label: "지사 관리", masterOnly: false },
  { href: "/permissions", label: "판매권한 조회", masterOnly: false },
  { href: "/sales", label: "판매부수 조회 및 관리", masterOnly: false },
  { href: "/programs", label: "프로그램 관리", masterOnly: true },
  { href: "/accounts", label: "계정 관리", masterOnly: true },
];

type Props = {
  userName: string;
  userRole: string;
};

export function MainNav({ userName, userRole }: Props) {
  const currentPath = usePathname();
  const isMaster = userRole === "master";

  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r lg:flex lg:flex-col">
      <div className="px-6 py-5 text-lg font-bold text-slate-900">지사 관리 시스템</div>
      <nav className="flex gap-2 px-4 pb-4 lg:flex-col lg:flex-1">
        {menus.filter((m) => !m.masterOnly || isMaster).map((menu) => {
          const active =
            currentPath === menu.href ||
            (menu.href !== "/" && currentPath.startsWith(menu.href));

          return (
            <Link
              className={clsx(
                "rounded-md px-4 py-2 text-sm font-medium",
                active ? "bg-slate-900 text-white" : "text-slate-700 hover:bg-slate-100",
              )}
              href={menu.href}
              key={menu.href}
            >
              {menu.label}
            </Link>
          );
        })}
      </nav>
      <div className="border-t border-slate-100 px-4 py-4">
        <div className="mb-2 px-2 text-xs text-slate-500">
          {userName}
          <span className="ml-1.5 rounded-full bg-slate-100 px-1.5 py-0.5 text-slate-600">
            {isMaster ? "마스터" : "일반"}
          </span>
        </div>
        <button
          className="w-full rounded-md px-4 py-2 text-left text-sm text-slate-500 hover:bg-slate-100"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          로그아웃
        </button>
      </div>
    </aside>
  );
}
