// Shared class names for form controls, so every input on every screen reads as the same printed form box.

/** 1px Pencil Grey edge (6.4:1 on paper, above the 3:1 needed for a control boundary), ink on hover, red when invalid. */
export const fieldControlClass =
  "w-full rounded-md border border-mute bg-paper text-[15px] text-ink transition-[border-color] duration-150 placeholder:text-mute hover:border-ink aria-[invalid=true]:border-marker";

export const inputClass = `${fieldControlClass} h-10 px-3`;

export const textareaClass = `${fieldControlClass} block min-h-56 resize-y px-3 py-2.5 leading-[1.6]`;

export const labelClass = "block text-[14px] font-medium text-ink";

export const hintClass = "mt-1.5 text-[13px] text-mute";

/** A link inside running text: inherits the text size, hairline underline that turns ink on hover. */
export const inlineLinkClass =
  "rounded-[3px] text-ink underline decoration-rule underline-offset-[3px] transition-[text-decoration-color] duration-150 hover:decoration-ink";

/**
 * Secondary actions are text links: 13px Soft Ink with a hairline underline that turns ink on hover.
 * An invisible ::after extends the hit area to about 42px tall without moving the layout.
 */
export const textActionClass =
  "relative rounded-[3px] text-[13px] whitespace-nowrap text-ink-soft underline decoration-rule underline-offset-[3px] transition-colors duration-150 after:absolute after:-inset-x-2 after:-inset-y-3 hover:text-ink hover:decoration-ink disabled:cursor-not-allowed disabled:opacity-60";
