// Marks fictional sample content with the contact-strip glyph, so it is never mistaken for real data.

export function SampleNotice({ children, className = "" }: { children: string; className?: string }) {
  return (
    <p className={`inline-flex items-center gap-2 rounded-[4px] bg-desk-deep px-2 py-1 text-[13px] text-ink-soft ${className}`}>
      <svg aria-hidden="true" width="14" height="14" viewBox="0 0 14 14" className="shrink-0 text-edge">
        <rect x="1" y="2.5" width="12" height="9" rx="1" fill="none" stroke="currentColor" strokeWidth="1.3" />
        <path d="M1 5h12M1 9h12" stroke="currentColor" strokeWidth="1.3" strokeDasharray="1.5 1.5" />
      </svg>
      {children}
    </p>
  );
}
