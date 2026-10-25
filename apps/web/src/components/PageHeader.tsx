// Title row of a working screen: heading and one meta line on the left, the screen's primary action on the right.

import type { ReactNode } from "react";

interface PageHeaderProps {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
}

export function PageHeader({ title, meta, action }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-4 py-6 sm:py-7 md:flex-row md:items-end md:justify-between">
      <div className="min-w-0">
        <h1 className="text-[26px] leading-[1.15] font-semibold tracking-[-0.025em] sm:text-[30px]">
          {title}
        </h1>
        {meta && <p className="mt-2 max-w-[70ch] text-[14px] text-mute">{meta}</p>}
      </div>
      {action && <div className="shrink-0">{action}</div>}
    </div>
  );
}
