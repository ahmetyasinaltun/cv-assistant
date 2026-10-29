// Shared class names for the app's buttons, so every primary action looks and responds the same way.

export const primaryButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] bg-accent px-[18px] text-[15px] font-semibold whitespace-nowrap text-white transition-[transform,background-color] duration-150 ease-out hover:bg-accent-hover active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-60";

/** The outlined action that sits on the teal brand band. */
export const onBrandButtonClass =
  "inline-flex h-11 items-center justify-center gap-2 rounded-[10px] border border-white/45 px-[18px] text-[15px] font-semibold whitespace-nowrap text-on-brand transition-[transform,background-color,border-color] duration-150 ease-out hover:border-white/70 hover:bg-white/10 active:scale-[0.97]";
