export const dynamic = "force-dynamic";

import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { createAccountAction, deleteAccountAction, resetPasswordAction } from "./actions";

export default async function AccountsPage() {
  const session = await auth();
  if (!session || session.user.role !== "master") redirect("/");

  const users = await prisma.user.findMany({ orderBy: { createdAt: "asc" } });

  return (
    <div className="space-y-5">
      <h1 className="text-2xl font-bold">계정 관리</h1>

      {/* 계정 추가 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">계정 추가</h2>
        </div>
        <form action={createAccountAction} className="p-5 space-y-3">
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">이메일</span>
            <input className="min-w-0 flex-1" name="email" required type="email" />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">이름</span>
            <input className="min-w-0 flex-1" name="name" required />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">비밀번호</span>
            <input className="min-w-0 flex-1" name="password" required type="password" />
          </div>
          <div className="flex items-center gap-3">
            <span className="w-20 shrink-0 text-sm font-medium text-slate-600">권한</span>
            <select className="min-w-0 flex-1" name="role">
              <option value="user">일반</option>
              <option value="master">마스터</option>
            </select>
          </div>
          <div>
            <button className="rounded-md bg-slate-900 px-4 py-2 text-sm text-white">추가</button>
          </div>
        </form>
      </section>

      {/* 계정 목록 */}
      <section className="rounded-lg border border-slate-200 bg-white">
        <div className="border-b border-slate-100 px-5 py-4">
          <h2 className="font-semibold text-slate-800">계정 목록</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-sm">
            <thead className="bg-slate-50 text-slate-600">
              <tr>
                <th className="px-4 py-2.5 text-left font-medium">이름</th>
                <th className="px-4 py-2.5 text-left font-medium">이메일</th>
                <th className="px-4 py-2.5 text-left font-medium">권한</th>
                <th className="px-4 py-2.5 text-left font-medium">비밀번호 재설정</th>
                <th className="px-4 py-2.5 text-center font-medium"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr className="border-t border-slate-100" key={user.id}>
                  <td className="px-4 py-2.5 font-medium text-slate-700">
                    {user.name}
                    {user.id === Number(session.user.id) && (
                      <span className="ml-2 text-xs text-slate-400">(나)</span>
                    )}
                  </td>
                  <td className="px-4 py-2.5 text-slate-600">{user.email}</td>
                  <td className="px-4 py-2.5">
                    <span className={`rounded-full px-2 py-0.5 text-xs font-medium ${
                      user.role === "master"
                        ? "bg-slate-900 text-white"
                        : "bg-slate-100 text-slate-700"
                    }`}>
                      {user.role === "master" ? "마스터" : "일반"}
                    </span>
                  </td>
                  <td className="px-4 py-2.5">
                    <form action={resetPasswordAction.bind(null, user.id)} className="flex items-center gap-2">
                      <input className="w-40" name="password" placeholder="새 비밀번호" type="password" />
                      <button className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700">변경</button>
                    </form>
                  </td>
                  <td className="px-4 py-2.5 text-center">
                    {user.id !== Number(session.user.id) && (
                      <form action={deleteAccountAction.bind(null, user.id)}>
                        <button className="text-xs text-rose-500 hover:underline">삭제</button>
                      </form>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
