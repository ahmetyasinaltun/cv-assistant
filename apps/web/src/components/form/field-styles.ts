// Shared class names for form controls and text links, so every field on every screen looks and responds the same way.

/** White field with a 3.3:1 teal-grey edge, darker on hover, red when invalid; focus uses the global teal ring. */
export const fieldControlClass =
  "w-full rounded-[10px] border border-field-edge bg-paper text-[16px] text-ink transition-[border-color] duration-150 placeholder:text-mute hover:border-ink-soft aria-[invalid=true]:border-marker";

export const inputClass = `${fieldControlClass} h-11 px-3.5`;

export const textareaClass = `${fieldControlClass} block min-h-56 resize-y px-3.5 py-3 leading-[1.6]`;

export const labelClass = "block text-[15px] font-semibold text-ink";

export const hintClass = "mt-1.5 text-[14px] text-mute";

/** A link inside running text: inherits the text size, teal with a light underline that darkens on hover. */
export const inlineLinkClass =
  "rounded-[3px] font-medium text-accent-hover underline decoration-accent/35 underline-offset-[3px] transition-[color,text-decoration-color] duration-150 hover:text-ink hover:decoration-ink";

/**
 * Secondary actions are text links: 14px teal with a light underline.
 * An invisible ::after extends the hit area to about 42px tall without moving the layout.
 */
export const textActionClass =
  "relative rounded-[3px] text-[14px] font-medium whitespace-nowrap text-accent-hover underline decoration-accent/35 underline-offset-[3px] transition-colors duration-150 after:absolute after:-inset-x-2 after:-inset-y-3 hover:text-ink hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-60";
