// States the sample page can preview through `?preview=`; shared by the server page and the client wrapper.

const samplePreviews = ["pending", "running", "failed", "no-questions", "questions-error"] as const;

export type SamplePreview = (typeof samplePreviews)[number];

export function parseSamplePreview(value: string | string[] | undefined): SamplePreview | null {
  return samplePreviews.find((preview) => preview === value) ?? null;
}
