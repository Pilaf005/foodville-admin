"use client";

import { useEffect } from "react";

/**
 * Shared dialog shell — fixes the problems the ad-hoc modals had:
 *
 *  - z-[100]: always above the sticky navbar (z-30), so no dialog hides
 *    behind the header again.
 *  - The OVERLAY scrolls (not the panel), with `min-h-full` flex centering:
 *    a dialog taller than the viewport never gets its top clipped — you can
 *    always scroll up to it.
 *  - Sticky in-panel header: the title and close button stay visible while
 *    the body scrolls.
 *  - Escape key + backdrop click close it; body scroll is locked while open.
 *
 * Mobile: bottom sheet. Desktop: centered card.
 */
export default function Modal({ isOpen, onClose, title, subtitle, children, maxWidth = "max-w-lg" }) {
  useEffect(() => {
    if (!isOpen) return;
    document.body.style.overflow = "hidden";
    const onKey = (e) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      window.removeEventListener("keydown", onKey);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-black/50"
      style={{ backdropFilter: "blur(2px)" }}
      role="dialog"
      aria-modal="true"
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="flex min-h-full items-end justify-center md:items-center md:p-4"
        onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}
      >
        <div
          className={`relative w-full ${maxWidth} rounded-t-3xl border border-cardline bg-white shadow-2xl md:rounded-3xl max-md:animate-slide-up md:animate-scale-in`}
        >
          {/* Sticky header — title + close always visible */}
          <div className="sticky top-0 z-10 flex items-center justify-between gap-3 rounded-t-3xl border-b border-cardline bg-white px-5 py-4">
            <div className="min-w-0">
              <h2 className="truncate text-base font-black uppercase tracking-tight text-ink">{title}</h2>
              {subtitle && <p className="mt-0.5 text-xs text-muted">{subtitle}</p>}
            </div>
            <button
              onClick={onClose}
              aria-label="Close"
              className="grid h-9 w-9 shrink-0 place-items-center rounded-full text-muted transition hover:bg-cream hover:text-ink active:scale-95"
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          </div>

          <div className="p-5 sm:p-6">{children}</div>
        </div>
      </div>
    </div>
  );
}
