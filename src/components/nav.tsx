"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { clsx } from "clsx";

const menus = [
  { href: "/", label: "대시보드" },
  { href: "/branches", label: "지사 관리" },
  { href: "/permissions", label: "판매권한 관리" },
  { href: "/sales", label: "판매부수 관리" },
];

export function MainNav() {
  const currentPath = usePathname();

  return (
    <aside className="w-full border-b border-slate-200 bg-white lg:w-64 lg:border-b-0 lg:border-r">
      <div className="px-6 py-5 text-lg font-bold text-slate-900">본사 관리 시스템</div>
      <nav className="flex gap-2 px-4 pb-4 lg:flex-col">
        {menus.map((menu) => {
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
    </aside>
  );
}
