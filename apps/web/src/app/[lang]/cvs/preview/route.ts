// Live preview of the CV being edited: the editor posts its unsaved content and gets one page back as a PNG.

import { fetchCvPreview } from "@/lib/api/backend";
import { passFile } from "@/lib/api/file-response";
import type { CvContent, CvTemplateId, Language } from "@/lib/api/types";

interface PreviewRequest {
  template: CvTemplateId;
  language: Language;
  content: CvContent;
  page: number;
}

export async function POST(request: Request) {
  let body: PreviewRequest;
  try {
    body = (await request.json()) as PreviewRequest;
  } catch {
    return Response.json({ error: "invalid_request" }, { status: 400 });
  }
  const page = Number.isInteger(body.page) && body.page > 0 ? body.page : 1;
  // The API validates the template, language and content; this handler only forwards them.
  return passFile(() => fetchCvPreview(body.template, body.language, body.content, page));
}
