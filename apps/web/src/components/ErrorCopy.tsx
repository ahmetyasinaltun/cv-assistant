"use client";

// Hands the localized error-page text from the server layout to the client-side error boundary below it.

import { createContext, use, type ReactNode } from "react";

import type { Dictionary } from "@/i18n/dictionaries";

type ErrorPageCopy = Dictionary["errorPage"];

const ErrorCopyContext = createContext<ErrorPageCopy | null>(null);

export function ErrorCopyProvider({ copy, children }: { copy: ErrorPageCopy; children: ReactNode }) {
  return <ErrorCopyContext value={copy}>{children}</ErrorCopyContext>;
}

export function useErrorCopy(): ErrorPageCopy {
  const copy = use(ErrorCopyContext);
  if (!copy) throw new Error("useErrorCopy must be used inside ErrorCopyProvider");
  return copy;
}
