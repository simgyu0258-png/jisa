import { prisma } from "@/lib/prisma";
import { ProgramsClient } from "./programs-client";

export default async function ProgramsPage() {
  const programs = await prisma.program.findMany({ orderBy: { id: "asc" } });

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-bold">프로그램 관리</h1>
      <ProgramsClient programs={programs} />
    </div>
  );
}
