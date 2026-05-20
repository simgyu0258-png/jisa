import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { ErpRulesClient } from "./erp-rules-client";

export default async function ErpRulesPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const [skipRules, mappings, programs] = await Promise.all([
    prisma.erpSkipRule.findMany({ orderBy: { id: "asc" } }),
    prisma.erpProductMapping.findMany({ orderBy: { id: "desc" }, include: { program: { select: { name: true } } } }),
    prisma.program.findMany({ where: { isOnlyOne: false }, orderBy: { id: "asc" }, select: { id: true, name: true, matchKeyword: true } }),
  ]);

  return (
    <ErpRulesClient
      skipRules={skipRules}
      mappings={mappings.map((m) => ({ id: m.id, productName: m.productName, programId: m.programId, issueNumber: m.issueNumber }))}
      programs={programs}
    />
  );
}
