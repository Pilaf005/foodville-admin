"use client";

import { Toaster } from "sonner";

export function ToastProvider({ children }) {
  return (
    <>
      {children}
      <Toaster
        richColors
        closeButton
        position="top-right"
        duration={3500}
        toastOptions={{ className: "rounded-2xl" }}
      />
    </>
  );
}

export default ToastProvider;
