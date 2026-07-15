"use client";

import QueryProvider from "./QueryProvider";
import ToastProvider from "./ToastProvider";

export function AppProviders({ children }) {
  return (
    <QueryProvider>
      <ToastProvider>{children}</ToastProvider>
    </QueryProvider>
  );
}

export default AppProviders;
