// Layout of a working screen: a teal brand band with the title, one meta line and the screen's primary action,
// and the content below it, whose first card overlaps the band's lower edge.

import type { ReactNode } from "react";

interface BandPageProps {
  title: string;
  meta?: ReactNode;
  action?: ReactNode;
  /** Extra line in the band under the meta, such as a sample notice. */
  notice?: ReactNode;
  /** "narrow" centres a single form column (sign-in, register). */
  width?: "wide" | "narrow";
  children: ReactNode;
}

export function BandPage({ title, meta, action, notice, width = "wide", children }: BandPageProps) {
  const column = width === "narrow" ? "max-w-[480px]" : "max-w-[1280px]";

  return (
    <main id="main" className="pb-24">
      <div className="bg-brand text-on-brand">
        <div className={`mx-auto ${column} px-4 pt-7 pb-[100px] sm:px-8 sm:pt-9 sm:pb-[116px]`}>
          <div className="flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
            <div className="min-w-0">
              <h1 className="text-[30px] leading-[1.12] font-bold tracking-[-0.025em] sm:text-[36px]">{title}</h1>
              {meta && <p className="mt-2.5 max-w-[70ch] text-[15px] leading-[1.5] text-on-brand-soft">{meta}</p>}
              {notice && <div className="mt-4">{notice}</div>}
            </div>
            {action && <div className="shrink-0">{action}</div>}
          </div>
        </div>
      </div>
      <div className={`mx-auto ${column} px-4 sm:px-8`}>
        <div className="relative -mt-[76px] sm:-mt-[84px]">{children}</div>
      </div>
    </main>
  );
}
