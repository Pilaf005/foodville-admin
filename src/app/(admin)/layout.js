"use client";

import { useState, useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { AdminDesktopSidebar, AdminMobileDrawer } from "@/features/admin/components/AdminSidebar";
import AdminTopbar from "@/features/admin/components/AdminTopbar";

export default function AdminLayout({ children }) {
  const router   = useRouter();
  const pathname = usePathname();
  const { user, isLoading } = useAuth();
  const [drawerOpen, setDrawerOpen] = useState(false);

  useEffect(() => {
    if (!isLoading && !user) {
      router.replace("/login");
    }
  }, [isLoading, user, router]);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  // ── Loading ────────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="fixed inset-0 z-50 bg-gray-50 flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <svg className="animate-spin h-5 w-5 text-[#6B7F59]" fill="none" viewBox="0 0 24 24">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
          </svg>
          <span className="text-sm font-semibold">Loading…</span>
        </div>
      </div>
    );
  }

  // ── Not authenticated ──────────────────────────────────────────────────
  if (!user) return null;

  // ── Authenticated shell ────────────────────────────────────────────────
  return (
    <div className="fixed inset-0 z-10 flex bg-gray-50 text-gray-900">
      {/* Desktop sidebar — hidden on mobile, visible lg+ */}
      <AdminDesktopSidebar />

      {/* Mobile slide-out drawer */}
      <AdminMobileDrawer
        isOpen={drawerOpen}
        onClose={() => setDrawerOpen(false)}
      />

      {/* Main content column */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        <AdminTopbar onMenuClick={() => setDrawerOpen(true)} />
        <main className="flex-1 overflow-auto p-4 sm:p-6">
          {children}
        </main>
      </div>
    </div>
  );
}
