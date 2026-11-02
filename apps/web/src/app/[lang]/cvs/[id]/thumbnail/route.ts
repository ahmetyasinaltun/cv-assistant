// The first page of a saved CV as a small image for the CV list. The list adds the CV's edit time to the address,
// so the browser may keep the image until the CV changes.

import { fetchCvDocumentThumbnail } from "@/lib/api/backend";
import { passFile } from "@/lib/api/file-response";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return passFile(() => fetchCvDocumentThumbnail(id));
}
