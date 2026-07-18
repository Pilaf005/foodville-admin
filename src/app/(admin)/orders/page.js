"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAdminOrders, useAdminMutations } from "@/features/admin/hooks/useAdmin";
import { useQueryClient } from "@tanstack/react-query";
import AdminBadge from "@/features/admin/components/ui/AdminBadge";
import ConfirmDialog from "@/features/admin/components/ui/ConfirmDialog";
import { queryKeys } from "@/lib/queryKeys";

const ORDER_STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_VARIANT = { delivered: "green", shipped: "blue", confirmed: "olive", placed: "amber", cancelled: "red" };
const PAYMENT_LABEL  = { gpay: "Google Pay", phonepe: "PhonePe", amazonpay: "Amazon Pay", cod: "COD", card: "Card", netbanking: "Net Banking", razorpay: "Online" };

function fmtDate(d) { return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
function fmt(n)     { return "₹" + Number(n).toLocaleString("en-IN"); }

const ic = "border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30 focus:border-[#6B7F59] transition bg-white";

export default function AdminOrdersPage() {
  const qc = useQueryClient();
  const { orders, isLoading, refetch } = useAdminOrders({ limit: 200 });
  const { deleteOrder } = useAdminMutations();
  const [statusFilter, setStatusFilter] = useState("all");
  const [search,       setSearch]       = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
 
  function handleDeleteConfirm() {
    if (!deleteTarget) return;
    deleteOrder.mutate(deleteTarget.orderId, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  const filtered = useMemo(() =>
    orders
      .filter((o) => statusFilter === "all" || o.status === statusFilter)
      .filter((o) => !search.trim() ||
        o.orderId?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.name?.toLowerCase().includes(search.toLowerCase()) ||
        o.customer?.email?.toLowerCase().includes(search.toLowerCase())
      ),
    [orders, statusFilter, search]
  );

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Orders</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {orders.length} orders</p>
        </div>
        <button
          onClick={() => refetch()}
          className="flex items-center gap-2 px-4 py-2 bg-[#6B7F59] hover:bg-[#5a6b4a] text-white text-xs font-bold rounded-xl transition shadow-sm active:scale-[0.98]"
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8"/><path d="M21 3v5h-5"/>
            <path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16"/><path d="M8 16H3v5"/>
          </svg>
          Refresh
        </button>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search order ID or customer…" className={`${ic} w-64`} />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className={ic}>
          <option value="all">All Statuses</option>
          {ORDER_STATUSES.map((s) => <option key={s} value={s}>{s.charAt(0).toUpperCase() + s.slice(1)}</option>)}
        </select>
        <div className="flex gap-2 flex-wrap">
          {ORDER_STATUSES.map((s) => {
            const count = orders.filter((o) => o.status === s).length;
            return (
              <button key={s} onClick={() => setStatusFilter(statusFilter === s ? "all" : s)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border transition ${statusFilter === s ? "bg-[#6B7F59] text-white border-[#6B7F59]" : "bg-white text-gray-600 border-gray-200 hover:border-gray-400"}`}>
                {s} <span className="opacity-75">({count})</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[800px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {["Order ID", "Customer", "Date", "Items", "Amount", "Payment", "Status", "Action"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading
                ? Array.from({ length: 6 }).map((_, i) => <tr key={i}><td colSpan={8} className="px-4 py-3"><div className="h-9 rounded-xl animate-shimmer"/></td></tr>)
                : filtered.length === 0
                  ? <tr><td colSpan={8} className="px-4 py-16 text-center text-sm text-gray-400">No orders found.</td></tr>
                  : filtered.map((o) => (
                      <tr key={o.id} className="hover:bg-gray-50/60 transition-colors">
                        <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{o.orderId}</td>
                        <td className="px-4 py-3">
                          <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">{o.customer?.name || "—"}</p>
                          <p className="text-[10px] text-gray-400 truncate max-w-[180px]">{o.customer?.email}</p>
                        </td>
                        <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{fmtDate(o.placedAt)}</td>
                        <td className="px-4 py-3 text-xs text-gray-600">{o.items?.length} item{o.items?.length !== 1 ? "s" : ""}</td>
                        <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">{fmt(o.amounts?.total ?? 0)}</td>
                        <td className="px-4 py-3">
                          <AdminBadge variant={o.paymentStatus === "paid" ? "green" : "amber"} dot>{o.paymentStatus}</AdminBadge>
                          <p className="text-[10px] text-gray-400 mt-0.5">{PAYMENT_LABEL[o.paymentMethod] ?? o.paymentMethod}</p>
                        </td>
                        <td className="px-4 py-3"><AdminBadge variant={STATUS_VARIANT[o.status] ?? "gray"} dot>{o.status}</AdminBadge></td>
                        <td className="px-4 py-3 whitespace-nowrap">
                          <div className="flex items-center gap-3">
                            <Link href={`/orders/${o.orderId}`} className="text-xs font-bold text-[#6B7F59] hover:underline">View</Link>
                            <button
                              onClick={() => setDeleteTarget(o)}
                              className="text-xs font-bold text-red-500 hover:underline cursor-pointer bg-transparent border-none p-0 active:scale-95 transition"
                            >
                              Delete
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
              }
            </tbody>
          </table>
        </div>
      </div>
 
      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Order"
        message={`Are you sure you want to delete order "${deleteTarget?.orderId}"? This will permanently remove the order and all associated gateway payment logs.`}
        confirmLabel="Delete Order"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
