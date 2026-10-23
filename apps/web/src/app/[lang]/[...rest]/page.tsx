// Catch-all for unknown paths inside a locale, so they render the localized 404 instead of a bare default page.

import { notFound } from "next/navigation";

export default function UnknownLocalizedPath() {
  notFound();
}
