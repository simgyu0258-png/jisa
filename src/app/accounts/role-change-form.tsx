"use client";

import { useState, useTransition } from "react";
import { updateRoleAction } from "./actions";

export function RoleChangeForm({ userId, currentRole }: { userId: number; currentRole: string }) {
  const [role, setRole] = useState(currentRole);
  const [toast, setToast] = useState("");
  const [isPending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    startTransition(async () => {
      const formData = new FormData();
      formData.set("role", role);
      await updateRoleAction(userId, formData);
      setToast("권한이 변경되었습니다.");
      setTimeout(() => setToast(""), 3000);
    });
  }

  return (
    <>
      <form className="flex items-center gap-2" onSubmit={handleSubmit}>
        <select
          className="text-sm"
          disabled={isPending}
          onChange={(e) => setRole(e.target.value)}
          value={role}
          name="role"
        >
          <option value="master">마스터</option>
          <option value="user">일반</option>
        </select>
        <button
          className="rounded-md bg-slate-100 px-3 py-1.5 text-xs text-slate-700 disabled:opacity-50"
          disabled={isPending}
          type="submit"
        >
          {isPending ? "변경 중..." : "변경"}
        </button>
      </form>

      {toast && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 rounded-lg bg-slate-900 px-5 py-3 text-sm text-white shadow-lg">
          {toast}
        </div>
      )}
    </>
  );
}
