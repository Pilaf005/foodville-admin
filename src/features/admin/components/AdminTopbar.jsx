"use client";

import { usePathname } from "next/navigation";
import { useAuth } from "@/features/auth/hooks/useAuth";

const PAGE_TITLES = {
  "/":            "Dashboard",
  "/products":    "Products",
  "/orders":      "Orders",
  "/categories":  "Categories",
  "/blogs":       "Blogs",
  "/users":       "Customers",
};

function getTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname];
  if (pathname.startsWith("/products/")) return "Product Detail";
  if (pathname.startsWith("/orders/"))   return "Order Detail";
  if (pathname.startsWith("/blogs/"))    return "Blog Detail";
  return "Admin";
}

export default function AdminTopbar({ onMenuClick }) {
  const pathname  = usePathname();
  const { user }  = useAuth();
  const initials  = user?.email?.slice(0, 2).toUpperCase() ?? "A";

  return (
    <header className="h-14 shrink-0 bg-white border-b border-gray-200 flex items-center justify-between px-4 sm:px-6 gap-3">
      <div className="flex items-center gap-3 min-w-0">
        {/* Hamburger — mobile only */}
        <button
          onClick={onMenuClick}
          aria-label="Open navigation menu"
          className="lg:hidden p-2.5 rounded-xl hover:bg-gray-100 transition text-gray-600 min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <line x1="3" y1="6" x2="21" y2="6"/>
            <line x1="3" y1="12" x2="21" y2="12"/>
            <line x1="3" y1="18" x2="21" y2="18"/>
          </svg>
        </button>

        <h1 className="text-sm font-black text-gray-900 uppercase tracking-wider truncate">
          {getTitle(pathname)}
        </h1>
      </div>

      {/* User info */}
      <div className="flex items-center gap-2.5 shrink-0">
        {user && (
          <div className="text-right hidden sm:block">
            <p className="text-xs font-bold text-gray-900 leading-none truncate max-w-[160px]">
              {user.fullName || user.email}
            </p>
            <p className="text-[10px] text-gray-400 mt-0.5">Administrator</p>
          </div>
        )}
        <div className="w-8 h-8 rounded-full bg-[#6B7F59] flex items-center justify-center text-white text-xs font-black shrink-0 ring-2 ring-transparent">
          {initials}
        </div>
      </div>
    </header>
  );
}
