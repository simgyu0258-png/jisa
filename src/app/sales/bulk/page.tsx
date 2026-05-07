import Link from "next/link";
import { SalesBulkUpload } from "../sales-bulk-upload";

export default function SalesBulkPage() {
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">판매부수 일괄 등록</h1>
        <Link
          className="rounded-md border border-slate-200 px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
          href="/sales"
        >
          목록으로
        </Link>
      </div>
      <SalesBulkUpload mode="register" />
    </div>
  );
}
