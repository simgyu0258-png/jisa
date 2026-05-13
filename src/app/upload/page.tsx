import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { UploadClient } from "./upload-client";

export default async function UploadPage() {
  const session = await auth();
  if (!session) redirect("/login");

  return <UploadClient />;
}
