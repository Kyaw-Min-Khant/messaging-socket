import { useEffect, type ReactNode } from "react";

/** Slides up from the bottom on phones; a centered dialog on wider screens. */
export function BottomSheet({
  title,
  subtitle,
  onClose,
  children,
}: {
  title: string;
  subtitle?: string;
  onClose: () => void;
  children: ReactNode;
}) {
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center">
      <div className="absolute inset-0 bg-black/60 backdrop-blur-sm animate-fade-in" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className="relative w-full sm:max-w-md max-h-[92vh] flex flex-col bg-gray-900 border-t sm:border border-gray-800 rounded-t-3xl sm:rounded-3xl animate-sheet-up"
      >
        <div className="flex justify-center pt-2.5 sm:hidden">
          <div className="w-10 h-1.5 rounded-full bg-gray-700" />
        </div>
        <div className="flex items-start justify-between px-5 pt-3 pb-3">
          <div>
            <h2 className="text-white font-semibold text-lg">{title}</h2>
            {subtitle && <p className="text-gray-500 text-xs mt-0.5">{subtitle}</p>}
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 -mr-2 -mt-1 rounded-full text-gray-400 hover:text-white hover:bg-gray-800"
          >
            <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
              <path d="M19 6.41L17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" />
            </svg>
          </button>
        </div>
        <div className="overflow-y-auto px-5 pb-[max(1.25rem,env(safe-area-inset-bottom))]">{children}</div>
      </div>
    </div>
  );
}
