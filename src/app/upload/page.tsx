import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { UploadClient } from "./upload-client";

export default async function UploadPage() {
  const session = await auth();
  if (!session) redirect("/login");

  const programs = await prisma.program.findMany({ orderBy: { id: "asc" }, select: { id: true, name: true } });

  return <UploadClient programs={programs} />;
}
