// Registration page; a new account lands on the analyses list (or the page in `?next=`).

import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthPage } from "@/features/auth/AuthPage";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.register };
}

export default function RegisterPage({ searchParams }: PageProps<"/[lang]/register">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="min-h-[60vh]" />}>
      <AuthPage mode="register" searchParams={searchParams} />
    </Suspense>
  );
}
