// Form-level problem (wrong password, service unreachable): announced to screen readers and marked like a gap.

import { StruckMark } from "./StruckMark";

/** The live region stays mounted while empty, so a message that appears later is announced. */
export function FormAlert({ message }: { message: string | null }) {
  return (
    <div role="alert" className="empty:hidden">
      {message && (
        <p className="flex gap-2.5 text-[14px] leading-[1.5] text-ink">
          <StruckMark />
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
