"use client";

// Re-renders the current server page every few seconds while an analysis is queued or running.
// Polling pauses while the tab is hidden, so a forgotten tab does not keep calling the API.

import { useRouter } from "next/navigation";
import { useEffect } from "react";

const POLL_INTERVAL_MS = 3000;

export function RefreshWhileRunning({ active }: { active: boolean }) {
  const router = useRouter();

  useEffect(() => {
    if (!active) return;
    const timer = window.setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, POLL_INTERVAL_MS);
    return () => window.clearInterval(timer);
  }, [active, router]);

  return null;
}
