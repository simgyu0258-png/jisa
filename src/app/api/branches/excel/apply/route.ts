import { revalidatePath } from "next/cache";
import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { BranchPreviewRow } from "../preview/route";

export async function POST(request: Request) {
  const body = (await request.json()) as { payload?: BranchPreviewRow[] };
  const payload = body.payload;

  if (!Array.isArray(payload) || payload.length === 0) {
    return NextResponse.json({ error: "잘못된 payload 입니다." }, { status: 400 });
  }

  const [lastBranch, programs] = await Promise.all([
    prisma.branch.findFirst({ orderBy: { id: "desc" }, select: { branchCode: true } }),
    prisma.program.findMany({ select: { id: true } }),
  ]);

  const startNumber = lastBranch
    ? Number.parseInt(lastBranch.branchCode.replace(/^[A-Z]+/, ""), 10) + 1
    : 1;

  await prisma.$transaction(async (tx) => {
    for (let i = 0; i < payload.length; i++) {
      const item = payload[i];
      const branchCode = `JS${String(startNumber + i).padStart(3, "0")}`;
      await tx.branch.create({
        data: {
          branchCode,
          name: item.name,
          region: item.region,
          status: item.status,
          managerName: item.managerName,
          phone: item.phone,
          address: item.address,
          memo: item.memo,
          permissions: {
            create: programs.map((p) => ({
              programId: p.id,
              isEnabled: item.permissions?.[p.id] ?? false,
            })),
          },
        },
      });
    }
  });

  revalidatePath("/branches");

  return NextResponse.json({ createdRows: payload.length });
}
