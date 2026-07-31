"use client";
 
import { useState, useEffect } from "react";
import { useAdminUsers } from "@/features/admin/hooks/useAdmin";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/feedback/Skeleton";
import toast from "react-hot-toast";
 
function Pagination({ meta, page, setPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition cursor-pointer">
        ← Prev
      </button>
      <span className="text-xs text-gray-500 font-semibold">Page {page} of {meta.totalPages}</span>
      <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition cursor-pointer">
        Next →
      </button>
    </div>
  );
}
 
function CustomerDetailsModal({ userId, onClose, onRequestDelete }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 
  useEffect(() => {
    if (!userId) return;
    async function load() {
      try {
        setLoading(true);
        const res = await fetch(`/api/admin/users/${userId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.message || "Failed to load customer details.");
        setData(json.data);
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [userId]);
 
  if (!userId) return null;
 
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/45 backdrop-blur-[2px]" onClick={onClose}>
      <div className="w-full max-w-2xl bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh] animate-fade-in" onClick={(e) => e.stopPropagation()}>
        
        {/* Modal Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100 bg-gray-50/50">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Customer Profile</h3>
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                onRequestDelete({ id: userId, email: data?.user?.email || "customer" });
                onClose();
              }}
              className="px-3 py-1 bg-red-50 hover:bg-red-100 text-red-600 border border-red-200 text-xs font-bold rounded-lg transition cursor-pointer"
            >
              Delete Customer
            </button>
            <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition cursor-pointer">
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
            </button>
          </div>
        </div>
 
        {/* Modal Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          {loading ? (
            <div className="space-y-4 animate-pulse">
              <div className="h-12 bg-gray-100 rounded-xl w-3/4"></div>
              <div className="grid grid-cols-2 gap-4">
                <div className="h-20 bg-gray-100 rounded-xl"></div>
                <div className="h-20 bg-gray-100 rounded-xl"></div>
              </div>
              <div className="h-32 bg-gray-100 rounded-xl"></div>
            </div>
          ) : error ? (
            <p className="text-center text-xs font-bold text-red-500 py-6">{error}</p>
          ) : !data ? (
            <p className="text-center text-xs text-gray-400 py-6">No data found.</p>
          ) : (
            <>
              {/* Profile summary card */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-[#6B7F59]/5 border border-[#6B7F59]/20 p-5 rounded-2xl">
                <div>
                  <h4 className="text-base font-black text-gray-900">{data.user.fullName || "Unnamed Customer"}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">{data.user.email}</p>
                  {data.user.phone && <p className="text-xs text-gray-700 mt-1 font-semibold">📞 {data.user.phone}</p>}
                </div>
                <div className="flex flex-wrap gap-2">
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    data.user.role === "admin" ? "bg-red-100 text-red-700" : "bg-gray-100 text-gray-800"
                  }`}>
                    {data.user.role}
                  </span>
                  <span className={`px-2.5 py-1 rounded-xl text-[10px] font-black uppercase tracking-wider ${
                    data.user.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                  }`}>
                    {data.user.status === "active" ? "Verified" : "Lead"}
                  </span>
                </div>
              </div>
 
              {/* Stats overview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Orders</p>
                  <p className="text-xl font-black text-gray-900 mt-1">{data.stats.totalOrders}</p>
                </div>
                <div className="p-4 rounded-xl bg-gray-50 border border-gray-200/80">
                  <p className="text-[10px] font-black uppercase tracking-wider text-gray-400">Total Spent</p>
                  <p className="text-xl font-black text-[#6B7F59] mt-1">₹{data.stats.totalSpent.toFixed(2)}</p>
                </div>
              </div>
 
              {/* Addresses */}
              <div className="space-y-2">
                <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">Saved Addresses ({data.addresses.length})</h5>
                {data.addresses.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No saved addresses.</p>
                ) : (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {data.addresses.map((addr) => (
                      <div key={addr._id} className="border border-gray-200 p-3 rounded-xl space-y-1 relative bg-white shadow-sm">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="px-1.5 py-0.5 bg-gray-100 text-gray-600 text-[9px] font-bold rounded">
                            {addr.label}
                          </span>
                          {addr.isDefault && (
                            <span className="px-1.5 py-0.5 bg-green-50 text-green-600 text-[9px] font-bold rounded">
                              Default
                            </span>
                          )}
                        </div>
                        <p className="text-xs font-bold text-gray-900 mt-1">{addr.receiverName}</p>
                        <p className="text-[11px] text-gray-500">{addr.phone}</p>
                        <p className="text-[11px] text-gray-600 leading-normal">
                          {addr.houseFlat}, {addr.area}
                          {addr.landmark && `, near ${addr.landmark}`}
                        </p>
                        <p className="text-[11px] text-gray-600 font-semibold">
                          {addr.city}, {addr.state} - {addr.pincode}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
 
              {/* Recent Orders */}
              <div className="space-y-2 pt-2">
                <h5 className="text-xs font-black text-gray-900 uppercase tracking-wider">Recent Orders</h5>
                {data.orders.length === 0 ? (
                  <p className="text-[11px] text-gray-400 italic">No orders placed yet.</p>
                ) : (
                  <div className="border border-gray-200 rounded-xl overflow-hidden bg-white shadow-sm">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-gray-50 text-[10px] text-gray-400 font-bold uppercase tracking-wider border-b">
                        <tr>
                          <th className="p-3">Order ID</th>
                          <th className="p-3">Date</th>
                          <th className="p-3 text-right">Amount</th>
                          <th className="p-3 text-center">Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100 text-gray-700 font-medium">
                        {data.orders.slice(0, 5).map((o) => (
                          <tr key={o.orderId} className="hover:bg-gray-50/50">
                            <td className="p-3 font-bold text-[#6B7F59] hover:underline">
                              <a href={`/orders/${o.orderId}`} target="_blank" rel="noreferrer">
                                {o.orderId}
                              </a>
                            </td>
                            <td className="p-3 text-gray-500">
                              {new Date(o.createdAt).toLocaleDateString("en-IN")}
                            </td>
                            <td className="p-3 text-right font-semibold text-gray-900">
                              ₹{o.total.toFixed(2)}
                            </td>
                            <td className="p-3 text-center">
                              <span className={`px-1.5 py-0.5 rounded text-[9px] font-bold capitalize ${
                                o.status === "delivered" ? "bg-green-50 text-green-700" :
                                o.status === "cancelled" ? "bg-red-50 text-red-700" : "bg-blue-50 text-blue-700"
                              }`}>
                                {o.status}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
 
export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [purging, setPurging] = useState(false);

  // Custom Modal States
  const [deleteUserTarget, setDeleteUserTarget] = useState(null); // { id, email }
  const [isPurgingModalOpen, setIsPurgingModalOpen] = useState(false);

  const debounced = useDebounce(search.trim(), 300);
 
  const { users, meta, isPending, refetch } = useAdminUsers({
    ...(debounced ? { search: debounced } : {}),
    ...(status ? { status } : {}),
    page,
    limit: 20,
  });

  const confirmPurgeUnverified = async () => {
    setIsPurgingModalOpen(false);
    setPurging(true);
    try {
      const res = await fetch("/api/admin/users", { method: "DELETE" });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Purged ${data.data.purgedCount} unverified spam account(s)!`);
        if (refetch) refetch();
      }
    } catch (err) {
      toast.error("Failed to purge unverified users.");
    } finally {
      setPurging(false);
    }
  };

  const confirmDeleteUser = async () => {
    if (!deleteUserTarget) return;
    try {
      const res = await fetch(`/api/admin/users/${deleteUserTarget.id}`, { method: "DELETE" });
      if (res.ok) {
        toast.success("Customer account deleted.");
        setDeleteUserTarget(null);
        if (refetch) refetch();
      }
    } catch (err) {
      toast.error("Failed to delete customer account.");
    }
  };
 
  return (
    <div className="space-y-4">
      {/* Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Customer Management</h2>
          <p className="text-xs text-gray-500 font-medium">Manage registered customers and unverified OTP leads.</p>
        </div>

        <button
          onClick={() => setIsPurgingModalOpen(true)}
          disabled={purging}
          className="inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          {purging ? "Purging..." : "Purge Unverified Spam Users"}
        </button>
      </div>

      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search by email…"
          className="w-full rounded-2xl border border-cardline bg-white px-4 py-2.5 text-sm outline-none
                     transition focus:border-olive focus:ring-2 focus:ring-olive/20"
        />
        <select
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          className="rounded-2xl border border-cardline bg-white px-4 py-2.5 text-sm text-ink outline-none
                     transition focus:border-olive sm:w-60"
        >
          <option value="">All customers</option>
          <option value="active">Verified</option>
          <option value="pending">Leads (never verified)</option>
        </select>
      </div>
 
      <div className="overflow-hidden rounded-2xl border border-cardline bg-white">
        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-12 rounded-xl" />)}
          </div>
        ) : users.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No customers found.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[620px] text-left text-xs border-collapse">
              <thead className="bg-cream/60 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Email</th>
                  <th className="px-4 py-2.5 font-bold">Name</th>
                  <th className="px-4 py-2.5 font-bold">Phone</th>
                  <th className="px-4 py-2.5 font-bold">Role</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Joined</th>
                  <th className="px-4 py-2.5 font-bold text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-cardline/60 hover:bg-gray-50/50 transition-colors">
                    <td className="px-4 py-3 font-bold text-ink">{u.email}</td>
                    <td className="px-4 py-3 text-muted">{u.fullName || "—"}</td>
                    <td className="px-4 py-3 text-muted">{u.phone || "—"}</td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.role === "admin" ? "bg-terracotta/15 text-terracotta" : "bg-cardline/60 text-ink"
                      }`}>
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        u.status === "active" ? "bg-green-100 text-green-700" : "bg-amber-100 text-amber-700"
                      }`}>
                        {u.status === "active" ? "verified" : "lead"}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-muted">
                      {u.createdAt ? new Date(u.createdAt).toLocaleDateString("en-IN") : "—"}
                    </td>
                    <td className="px-4 py-3 text-center space-x-2">
                      <button
                        onClick={() => setSelectedUserId(u.id)}
                        className="px-3 py-1.5 bg-[#6B7F59] hover:bg-[#5a6b4a] text-white text-[11px] font-bold rounded-lg transition active:scale-95 cursor-pointer shadow-sm"
                      >
                        View Details
                      </button>
                      <button
                        onClick={() => setDeleteUserTarget({ id: u.id, email: u.email })}
                        className="px-2.5 py-1.5 text-red-600 hover:bg-red-50 text-[11px] font-bold rounded-lg transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
 
      {meta && meta.totalPages > 1 && <Pagination meta={meta} page={page} setPage={setPage} />}
 
      {/* Customer profile details modal */}
      <CustomerDetailsModal
        userId={selectedUserId}
        onClose={() => setSelectedUserId(null)}
        onRequestDelete={(target) => setDeleteUserTarget(target)}
      />

      {/* User-Friendly Delete Single Customer Confirmation Modal */}
      {deleteUserTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete Customer Account?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to permanently delete the account for <strong className="font-mono text-red-600">{deleteUserTarget.email}</strong>?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteUserTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteUser}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User-Friendly Purge All Spam Users Confirmation Modal */}
      {isPurgingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Purge Unverified Spam Accounts?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                This will safely delete all unverified lead accounts (<span className="font-semibold text-amber-700">status: pending</span>) that have <strong>0 orders placed</strong>.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPurgingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurgeUnverified}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                Purge Accounts
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
