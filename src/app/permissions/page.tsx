import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PermissionsUploadClient } from "./upload-client";

type Params = {
  q?: string;
  region?: string;
  status?: "active" | "inactive";
  programId?: string;
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
  const programId = Number.parseInt(params.programId ?? "", 10);

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

  const filteredBranches =
    Number.isNaN(programId) || !programId
      ? branches
      : branches.filter((branch) =>
          branch.permissions.some((permission) => permission.programId === programId && permission.isEnabled),
        );

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">판매권한 관리</h1>
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

      <div className="overflow-x-auto rounded-lg border border-slate-200 bg-white">
        <table className="min-w-full text-sm">
          <thead className="bg-slate-100">
            <tr>
              <th className="px-3 py-2 text-left">지사</th>
              {programs.map((program) => (
                <th className="px-3 py-2 text-center" key={program.id}>
                  <Link className="underline" href={`/permissions?programId=${program.id}`}>
                    {program.name}
                  </Link>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {filteredBranches.map((branch) => (
              <tr className="border-t border-slate-200" key={branch.id}>
                <td className="px-3 py-2">
                  <Link className="underline" href={`/branches/${branch.id}`}>
                    {branch.name}
                  </Link>
                </td>
                {programs.map((program) => {
                  const enabled =
                    branch.permissions.find((permission) => permission.programId === program.id)?.isEnabled ??
                    false;
                  return (
                    <td className="px-3 py-2 text-center font-semibold" key={program.id}>
                      {enabled ? "O" : "X"}
                    </td>
                  );
                })}
              </tr>
            ))}
            {filteredBranches.length === 0 && (
              <tr>
                <td className="px-3 py-8 text-center text-slate-500" colSpan={programs.length + 1}>
                  데이터가 없습니다.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <PermissionsUploadClient />
    </div>
  );
}
