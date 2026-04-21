import { createPortal } from "react-dom";
import { ArrowLeft } from "lucide-react";

type Props = {
  src: string | null;
  alt?: string;
  open: boolean;
  onClose: () => void;
};

export default function ImageLightbox({ src, alt = "Attachment preview", open, onClose }: Props) {
  if (!open || !src) return null;

  const node = (
    <div
      className="fixed inset-0 z-[200] flex flex-col bg-black/90 p-3 backdrop-blur-sm sm:p-6"
      role="dialog"
      aria-modal="true"
      aria-label="Image preview"
    >
      <div className="mb-3 flex shrink-0 items-center justify-between gap-2">
        <button
          type="button"
          className="inline-flex items-center gap-2 rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
          onClick={onClose}
        >
          <ArrowLeft size={18} />
          Back
        </button>
        <button
          type="button"
          className="rounded-lg border border-white/25 bg-white/10 px-3 py-2 text-sm font-medium text-white hover:bg-white/20"
          onClick={onClose}
        >
          Close
        </button>
      </div>
      <div
        className="flex min-h-0 flex-1 items-center justify-center overflow-auto"
        onClick={onClose}
      >
        <img
          src={src}
          alt={alt}
          className="max-h-full max-w-full object-contain shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        />
      </div>
      {alt ? (
        <p className="mt-2 shrink-0 truncate text-center text-xs text-white/80">{alt}</p>
      ) : null}
    </div>
  );

  if (typeof document === "undefined") return null;
  return createPortal(node, document.body);
}
