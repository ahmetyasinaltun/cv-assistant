// Email verification page: the six-digit code from the registration email unlocks analyses and AI-written CVs.

import type { Metadata } from "next";
import { Suspense } from "react";

import { VerifyEmailPage } from "@/features/auth/VerifyEmailPage";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.verifyEmail };
}

export default function VerifyEmailRoute({ searchParams }: PageProps<"/[lang]/verify-email">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="min-h-[60vh]" />}>
      <VerifyEmailPage searchParams={searchParams} />
    </Suspense>
  );
}
