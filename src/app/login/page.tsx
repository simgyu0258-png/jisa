import { loginAction } from "./actions";

export default function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-50">
      <div className="w-full max-w-sm rounded-xl border border-slate-200 bg-white p-8 shadow-sm">
        <h1 className="mb-1 text-2xl font-bold text-slate-900">지사 관리 시스템</h1>
        <p className="mb-6 text-sm text-slate-500">계속하려면 로그인하세요.</p>
        <form action={loginAction} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">이메일</label>
            <input
              autoComplete="email"
              className="w-full"
              name="email"
              placeholder="example@company.com"
              required
              type="email"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium text-slate-700">비밀번호</label>
            <input
              autoComplete="current-password"
              className="w-full"
              name="password"
              required
              type="password"
            />
          </div>
          <button className="w-full rounded-md bg-slate-900 py-2 text-sm font-medium text-white hover:bg-slate-700" type="submit">
            로그인
          </button>
        </form>
      </div>
    </div>
  );
}
