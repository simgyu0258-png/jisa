import type { Metadata } from "next";
import "./globals.css";
import { SessionProvider } from "next-auth/react";
import { auth } from "@/auth";
import { MainNav } from "@/components/nav";

export const metadata: Metadata = {
  title: "지사 관리 시스템",
  description: "지사 정보, 권한, 판매부수를 관리하는 본사 전용 시스템",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await auth();

  return (
    <html lang="ko" className="h-full antialiased">
      <body className="min-h-full bg-slate-50 text-slate-900" style={{ fontFamily: "Segoe UI, Malgun Gothic, sans-serif" }}>
        <SessionProvider session={session}>
          {session ? (
            <div className="min-h-screen lg:flex">
              <MainNav userName={session.user.name ?? ""} userRole={session.user.role} />
              <main className="flex-1 p-4 sm:p-6">{children}</main>
            </div>
          ) : (
            <>{children}</>
          )}
        </SessionProvider>
      </body>
    </html>
  );
}
