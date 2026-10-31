// Shared class names for the app's buttons, so every primary action looks and responds the same way.

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-[18px] text-[15px] font-semibold whitespace-nowrap text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

/** A helper action beside a field ("Fill in" next to a link): outlined, so the screen keeps one filled action. */
export const secondaryButtonClass =
  "inline-flex h-11 shrink-0 items-center justify-center gap-2 rounded-[10px] border border-accent/55 bg-paper px-[18px] text-[15px] font-semibold whitespace-nowrap text-accent-hover transition-[transform,background-color,border-color] duration-150 ease-out hover:border-accent hover:bg-accent-tint active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

/** A screen's primary action when it sits on the teal brand band: white, so it reads against the teal. */
export const onBrandPrimaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-paper px-[18px] text-[15px] font-semibold whitespace-nowrap text-brand transition-[transform,background-color] duration-150 ease-out hover:bg-accent-tint active:scale-[0.97]";

/** Confirms a destructive action (deleting a saved CV). */
export const dangerButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-marker px-[18px] text-[15px] font-semibold whitespace-nowrap text-white transition-[transform,background-color] duration-150 ease-out hover:bg-marker-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

/** The outlined action that sits on the teal brand band. */
export const onBrandButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-white/45 px-[18px] text-[15px] font-semibold whitespace-nowrap text-on-brand transition-[transform,background-color,border-color] duration-150 ease-out hover:border-white/70 hover:bg-white/10 active:scale-[0.97]";
