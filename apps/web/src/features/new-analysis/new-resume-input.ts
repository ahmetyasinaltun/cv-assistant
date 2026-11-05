// Reads the fields of a CV being added and saves it through the API; the new-analysis and New CV actions share this.

import { createResumeFromText, uploadResume } from "@/lib/api/backend";

/** `step` names the save, so the caller can tell which field an API error belongs to. */
export type NewResumeInput =
  | { step: "resumeUpload"; title: string; file: File }
  | { step: "resumeText"; title: string; text: string };

export function formText(formData: FormData, name: string): string {
  const value = formData.get(name);
  return typeof value === "string" ? value.trim() : "";
}

export function readNewResume(formData: FormData): NewResumeInput {
  const title = formText(formData, "resumeTitle");
  const file = formData.get("resumeFile");
  if (formText(formData, "resumeSource") === "upload" && file instanceof File) {
    return { step: "resumeUpload", title, file };
  }
  return { step: "resumeText", title, text: formText(formData, "resumeText") };
}

/** Saves the CV and returns its id. */
export async function saveNewResume(input: NewResumeInput): Promise<string> {
  const saved =
    input.step === "resumeUpload"
      ? await uploadResume(input.title, input.file)
      : await createResumeFromText(input.title, input.text);
  return saved.id;
}
