// Error line under a form control, linked to it with aria-describedby by the caller.

import { StruckMark } from "./StruckMark";

export function FieldError({ id, message }: { id: string; message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex gap-2 text-[13px] text-marker">
      <StruckMark size={10} />
      <span>{message}</span>
    </p>
  );
}
