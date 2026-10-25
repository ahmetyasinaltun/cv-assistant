// Sign-in page; `?next=` brings the visitor back to the page that asked them to sign in.

import type { Metadata } from "next";
import { Suspense } from "react";

import { AuthPage } from "@/features/auth/AuthPage";
import { getDictionary } from "@/i18n/dictionaries";

export async function generateMetadata(): Promise<Metadata> {
  return { title: (await getDictionary()).meta.titles.signIn };
}

export default function SignInPage({ searchParams }: PageProps<"/[lang]/sign-in">) {
  return (
    <Suspense fallback={<main id="main" aria-busy="true" className="min-h-[60vh]" />}>
      <AuthPage mode="signIn" searchParams={searchParams} />
    </Suspense>
  );
}
