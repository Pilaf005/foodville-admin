"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect } from "react";
import cn from "@/lib/cn";
import { useLogout } from "@/features/auth/hooks/useAuth";

const NAV = [
  {
    href: "/",
    exact: true,
    label: "Dashboard",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
        <rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>
      </svg>
    ),
  },
  {
    href: "/products",
    label: "Products",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/>
        <path d="M16.5 9.4 7.55 4.24M3.29 7 12 12l8.71-5M12 22V12"/>
        <circle cx="18.5" cy="18.5" r="2.5"/><path d="M20.27 11.05 21 18.5l-2.5 2.5-6.77-.73"/>
      </svg>
    ),
  },
  {
    href: "/categories",
    label: "Categories",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M4 6h16M4 10h16M4 14h16M4 18h16"/>
      </svg>
    ),
  },
  {
    href: "/orders",
    label: "Orders",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/>
        <rect x="9" y="3" width="6" height="4" rx="2"/>
        <path d="m9 12 2 2 4-4"/>
      </svg>
    ),
  },
  {
    href: "/blogs",
    label: "Blogs",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/>
        <polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/>
        <polyline points="10 9 9 9 8 9"/>
      </svg>
    ),
  },
  {
    href: "/users",
    label: "Customers",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>
      </svg>
    ),
  },
  {
    href: "/franchise-applications",
    label: "Franchise Leads",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <path d="M3 21h18M3 7v14M21 7v14M6 11h12M6 15h12M9 3h6v4H9z" />
      </svg>
    ),
  },
  {
    href: "/bulk-inquiries",
    label: "Bulk Inquiries",
    icon: (
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/>
        <path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
      </svg>
    ),
  },
];

// ─── Sidebar inner content (shared between desktop and mobile drawer) ──────
function SidebarContent({ onNavClick }) {
  const pathname = usePathname();
  const logout   = useLogout();

  function isActive(item) {
    if (item.exact) return pathname === item.href;
    return pathname === item.href || pathname.startsWith(item.href + "/");
  }

  return (
    <>
      {/* Logo */}
      <div className="px-5 py-4 border-b border-white/10 shrink-0">
        <Link href="/" className="flex flex-col items-start gap-1.5 group">
          <div className="relative inline-flex items-center pr-3">
            <img
              src="/foodville-logo.png"
              alt="Foodville"
              className="h-8 w-auto object-contain transition-transform duration-200 group-hover:scale-105"
            />
            <span className="absolute top-0 right-0 text-[11px] font-black text-white/80 leading-none select-none pointer-events-none">
              ®
            </span>
          </div>
          <span className="px-2 py-0.5 text-[9px] font-black bg-[#6B7F59] text-white rounded-md uppercase tracking-widest shadow-sm">
            ADMIN
          </span>
        </Link>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto py-4 space-y-0.5 px-3">
        <p className="px-2 py-2 text-[9px] font-black text-white/30 uppercase tracking-widest">Menu</p>
        {NAV.map((item) => {
          const active = isActive(item);
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavClick}
              className={cn(
                "flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold transition-all duration-150 min-h-[48px]",
                active
                  ? "bg-[#6B7F59] text-white shadow-sm"
                  : "text-white/65 hover:text-white hover:bg-white/8"
              )}
            >
              <span className={active ? "text-white" : "text-white/50"}>{item.icon}</span>
              {item.label}
            </Link>
          );
        })}
      </nav>

      {/* Bottom */}
      <div className="px-3 py-4 border-t border-white/10 space-y-1 shrink-0">
        <button
          suppressHydrationWarning
          onClick={() => logout.mutate()}
          disabled={logout.isPending}
          className="w-full flex items-center gap-3 px-3 py-3 rounded-xl text-sm font-semibold text-white/50 hover:text-white hover:bg-white/8 transition disabled:opacity-40 min-h-[48px]"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
            <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/>
          </svg>
          {logout.isPending ? "Signing out…" : "Sign Out"}
        </button>
      </div>
    </>
  );
}

// ─── Desktop sidebar ───────────────────────────────────────────────────────
export function AdminDesktopSidebar() {
  return (
    <aside className="hidden lg:flex flex-col w-56 shrink-0 bg-[#2C3624] text-white h-full">
      <SidebarContent onNavClick={undefined} />
    </aside>
  );
}

// ─── Mobile drawer ─────────────────────────────────────────────────────────
export function AdminMobileDrawer({ isOpen, onClose }) {
  const pathname = usePathname();

  // Close drawer on route change
  useEffect(() => { onClose(); }, [pathname]);

  // Lock body scroll when open
  useEffect(() => {
    document.body.style.overflow = isOpen ? "hidden" : "";
    return () => { document.body.style.overflow = ""; };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 z-40 bg-black/60 backdrop-blur-sm transition-opacity duration-300 lg:hidden ${
          isOpen ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none"
        }`}
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Drawer panel */}
      <aside
        className={`fixed top-0 left-0 z-50 h-full w-64 bg-[#2C3624] text-white flex flex-col shadow-2xl transition-transform duration-300 ease-out lg:hidden ${
          isOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        {/* Close button row */}
        <div className="flex items-center justify-end px-4 pt-4 shrink-0">
          <button
            onClick={onClose}
            aria-label="Close menu"
            className="p-2.5 rounded-xl hover:bg-white/10 transition text-white/70 hover:text-white min-h-[44px] min-w-[44px] flex items-center justify-center"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
          </button>
        </div>

        <SidebarContent onNavClick={onClose} />
      </aside>
    </>
  );
}

export default AdminDesktopSidebar;
