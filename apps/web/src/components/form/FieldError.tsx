// Error line under a form control, linked to it with aria-describedby by the caller.

import { StatusMark } from "@/components/StatusMark";

export function FieldError({ id, message }: { id: string; message: string | null | undefined }) {
  if (!message) return null;
  return (
    <p id={id} className="mt-1.5 flex gap-2 text-[14px] leading-[1.45] text-marker">
      <span className="mt-[2px]">
        <StatusMark status="missing" size={15} />
      </span>
      <span>{message}</span>
    </p>
  );
}
