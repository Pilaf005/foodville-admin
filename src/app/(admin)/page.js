"use client";

import Link from "next/link";
import { useAdminStats } from "@/features/admin/hooks/useAdmin";
import AdminBadge from "@/features/admin/components/ui/AdminBadge";

const STATUS_VARIANT = {
  delivered: "green", shipped: "blue", confirmed: "olive",
  placed: "amber", cancelled: "red",
};

function fmt(n)     { return "₹" + Number(n).toLocaleString("en-IN"); }
function fmtDate(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }

function StatCard({ label, value, sub, icon, accent }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5 shadow-sm flex items-start gap-4">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${accent}`}>{icon}</div>
      <div>
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">{label}</p>
        <p className="text-2xl font-black text-gray-900 mt-0.5">{value ?? "—"}</p>
        {sub && <p className="text-[11px] text-gray-400 mt-0.5">{sub}</p>}
      </div>
    </div>
  );
}

function SkeletonCard() {
  return <div className="bg-white rounded-2xl border border-gray-200 h-24 animate-shimmer" />;
}

export default function AdminDashboard() {
  const { stats, isLoading } = useAdminStats();

  const totalRevenue  = stats?.revenue ?? 0;
  const paidOrders    = stats?.paidOrders ?? 0;
  const totalOrders   = stats?.totalOrders ?? 0;
  const totalUsers    = stats?.totalUsers ?? 0;
  const totalProducts = stats?.totalProducts ?? 0;
  const outOfStock    = stats?.outOfStock ?? 0;
  const recentOrders  = stats?.recentOrders ?? [];
  const ordersByStatus = stats?.ordersByStatus ?? {};
  const newOrders     = ordersByStatus.placed ?? 0;

  return (
    <div className="space-y-6 max-w-7xl">
      <div>
        <h2 className="text-lg font-black text-gray-900">Good morning, Admin 👋</h2>
        <p className="text-xs text-gray-400 mt-0.5">Here&apos;s what&apos;s happening with your store today.</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
        ) : (
          <>
            <StatCard label="Total Orders" value={totalOrders} sub={`${newOrders} awaiting confirmation`}
              accent="bg-blue-50 text-blue-600"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M9 5H7a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V7a2 2 0 0 0-2-2h-2"/><rect x="9" y="3" width="6" height="4" rx="2"/><path d="m9 12 2 2 4-4"/></svg>}
            />
            <StatCard label="Total Revenue" value={fmt(totalRevenue)} sub={`${paidOrders} paid orders`}
              accent="bg-green-50 text-green-600"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M12 2v20M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>}
            />
            <StatCard label="Products" value={totalProducts} sub={`${outOfStock} out of stock`}
              accent="bg-[#6B7F59]/10 text-[#6B7F59]"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M21 10V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l2-1.14"/><path d="M16.5 9.4 7.55 4.24M3.29 7 12 12l8.71-5M12 22V12"/></svg>}
            />
            <StatCard label="Customers" value={totalUsers} sub="Active accounts"
              accent="bg-amber-50 text-amber-600"
              icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Recent orders */}
        <div className="xl:col-span-2 bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Recent Orders</h2>
            <Link href="/orders" className="text-xs font-bold text-[#6B7F59] hover:underline">View All →</Link>
          </div>
          {isLoading ? (
            <div className="p-5 space-y-3">{Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-10 rounded-xl animate-shimmer" />)}</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead><tr className="bg-gray-50 border-b border-gray-100">
                  {["Order ID", "Customer", "Date", "Amount", "Status", ""].map((h) => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
                  ))}
                </tr></thead>
                <tbody className="divide-y divide-gray-50">
                  {recentOrders.length === 0 ? (
                    <tr><td colSpan={6} className="px-4 py-10 text-center text-sm text-gray-400">No orders yet.</td></tr>
                  ) : recentOrders.map((o) => (
                    <tr key={o.orderId} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{o.orderId}</td>
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800">{o.customer?.name || "Guest"}</p>
                        <p className="text-[10px] text-gray-400">{o.customer?.email}</p>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.placedAt)}</td>
                      <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{fmt(o.amounts?.total ?? 0)}</td>
                      <td className="px-4 py-3"><AdminBadge variant={STATUS_VARIANT[o.status] ?? "gray"} dot>{o.status}</AdminBadge></td>
                      <td className="px-4 py-3"><Link href={`/orders/${o.orderId}`} className="text-xs font-bold text-[#6B7F59] hover:underline">View</Link></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Order status breakdown */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
            <div>
              <h2 className="text-sm font-black text-gray-900 uppercase tracking-tight">Order Status</h2>
              {!isLoading && <p className="text-[10px] text-gray-400 mt-0.5">{totalOrders} total orders</p>}
            </div>
            <Link href="/orders" className="text-xs font-bold text-[#6B7F59] hover:underline">Manage →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {isLoading
              ? Array.from({ length: 5 }).map((_, i) => <div key={i} className="h-14 mx-4 my-2 rounded-xl animate-shimmer" />)
              : ["placed", "confirmed", "shipped", "delivered", "cancelled"].map((status) => {
                  const count = ordersByStatus[status] ?? 0;
                  return (
                    <div key={status} className="flex items-center justify-between px-5 py-3">
                      <AdminBadge variant={STATUS_VARIANT[status] ?? "gray"} dot>{status}</AdminBadge>
                      <span className="text-sm font-black text-gray-900">{count}</span>
                    </div>
                  );
                })
            }
            {!isLoading && totalOrders === 0 && (
              <div className="px-5 py-8 text-center text-xs text-gray-400">No orders yet 🎉</div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
