// Marks fictional sample content in a tinted pill, so it is never mistaken for real data.

interface SampleNoticeProps {
  children: string;
  className?: string;
  /** "onBrand" for the teal band at the top of a page. */
  tone?: "default" | "onBrand";
}

export function SampleNotice({ children, className = "", tone = "default" }: SampleNoticeProps) {
  const toneClass = tone === "onBrand" ? "bg-white/12 text-on-brand" : "bg-accent-tint text-accent-hover";
  return <p className={`inline-flex rounded-md px-2.5 py-1 text-[14px] font-medium ${toneClass} ${className}`}>{children}</p>;
}
