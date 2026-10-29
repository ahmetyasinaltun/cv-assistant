// Form-level problem (wrong password, service unreachable): announced to screen readers, shown on a red tint with
// the missing icon, so it reads without colour too.

import { StatusMark } from "@/components/StatusMark";

/** The live region stays mounted while empty, so a message that appears later is announced. */
export function FormAlert({ message }: { message: string | null }) {
  return (
    <div role="alert" className="empty:hidden">
      {message && (
        <p className="flex gap-2.5 rounded-[10px] bg-marker-tint px-3.5 py-3 text-[15px] leading-[1.5] text-ink">
          <span className="mt-[2px]">
            <StatusMark status="missing" size={17} />
          </span>
          <span>{message}</span>
        </p>
      )}
    </div>
  );
}
