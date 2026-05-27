import * as XLSX from "xlsx";

export async function prepareExcelBuffer(rawBuffer: Buffer, password?: string): Promise<Buffer> {
  if (!password) return rawBuffer;

  const { OOXMLFile, InvalidKeyError } = await import("office-crypto");

  let file: InstanceType<typeof OOXMLFile>;
  try {
    file = new OOXMLFile(new Uint8Array(rawBuffer));
  } catch {
    return rawBuffer;
  }

  if (!file.isEncrypted()) return rawBuffer;

  try {
    file.loadKey({ password });
    const decrypted = file.decrypt();
    return Buffer.from(decrypted);
  } catch (err) {
    if (err instanceof InvalidKeyError) {
      throw new Error("파일 비밀번호가 올바르지 않습니다.");
    }
    throw new Error("파일 복호화에 실패했습니다.");
  }
}

export function xlsxToArrays(wb: XLSX.WorkBook): unknown[][] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<unknown[]>(ws, { header: 1, defval: "" }) as unknown[][];
}

export function xlsxToObjects(wb: XLSX.WorkBook): Record<string, unknown>[] {
  const ws = wb.Sheets[wb.SheetNames[0]];
  return XLSX.utils.sheet_to_json<Record<string, unknown>>(ws, { defval: "" });
}
