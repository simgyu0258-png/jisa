import Link from "next/link";
import { BranchBulkEditClient } from "../bulk-edit-client";

export default function BranchBulkEditPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-slate-500">
            <Link className="hover:underline" href="/branches">지사 관리</Link>
            {" / "}
            <span>일괄 수정</span>
          </p>
          <h1 className="mt-0.5 text-2xl font-bold">지사 일괄 수정</h1>
        </div>
        <Link
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          href="/branches"
        >
          목록으로
        </Link>
      </div>
      <BranchBulkEditClient />
    </div>
  );
}
