// Downloads a saved CV as a PDF; the API names the file after the CV.

import { fetchCvDocumentPdf } from "@/lib/api/backend";
import { passFile } from "@/lib/api/file-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return passFile(() => fetchCvDocumentPdf(id));
}
