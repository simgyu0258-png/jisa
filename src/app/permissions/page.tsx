import { prisma } from "@/lib/prisma";
import { PermissionsTableClient } from "./permissions-table-client";

type Params = {
  q?: string;
  region?: string;
  status?: "active" | "inactive";
};

export default async function PermissionsPage({
  searchParams,
}: {
  searchParams: Promise<Params>;
}) {
  const params = await searchParams;
  const q = params.q?.trim() ?? "";
  const region = params.region?.trim() ?? "";
  const status = params.status ?? "";

  const [programs, branches] = await Promise.all([
    prisma.program.findMany({ orderBy: { id: "asc" } }),
    prisma.branch.findMany({
      where: {
        ...(q ? { name: { contains: q } } : {}),
        ...(region ? { region: { contains: region } } : {}),
        ...(status === "active" || status === "inactive" ? { status } : {}),
      },
      include: {
        permissions: { orderBy: { programId: "asc" } },
      },
      orderBy: { name: "asc" },
    }),
  ]);

  branches.sort((a, b) => a.name.localeCompare(b.name, "ko"));

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매권한 조회</h1>
      <form className="grid grid-cols-1 gap-2 rounded-lg border border-slate-200 bg-white p-4 md:grid-cols-4">
        <input defaultValue={q} name="q" placeholder="지사명 검색" />
        <input defaultValue={region} name="region" placeholder="지역 필터" />
        <select defaultValue={status} name="status">
          <option value="">전체 상태</option>
          <option value="active">active</option>
          <option value="inactive">inactive</option>
        </select>
        <button className="rounded-md bg-slate-100 px-3 py-2 text-sm">조회</button>
      </form>

      <PermissionsTableClient
        branches={branches.map((b) => ({
          id: b.id,
          name: b.name,
          permissions: b.permissions.map((p) => ({ programId: p.programId, isEnabled: p.isEnabled })),
        }))}
        programs={programs.map((p) => ({ id: p.id, name: p.name }))}
      />
    </div>
  );
}
