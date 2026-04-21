/** Scroll area: horizontal + vertical; styled scrollbars (see `.patient-directory-table-scroll` in index.css). */
/** Use inside a flex column parent (`flex flex-col`) so the area fills remaining height and scrolls. */
export const patientTableScrollClass =
  "patient-directory-table-scroll min-h-0 flex-1 min-w-0 overflow-x-auto overflow-y-auto overscroll-x-contain";

/** Wide floor so columns keep readable width; parent scrolls when viewport is narrower. */
export const patientTableClass =
  "w-full min-w-[1080px] table-auto border-collapse text-xs sm:text-sm";
