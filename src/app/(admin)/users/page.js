"use client";

import { useState } from "react";
import { useAdminUsers } from "@/features/admin/hooks/useAdmin";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/feedback/Skeleton";

function Pagination({ meta, page, setPage }) {
  if (!meta || meta.totalPages <= 1) return null;
  return (
    <div className="flex items-center justify-center gap-2 pt-2">
      <button disabled={page <= 1} onClick={() => setPage(page - 1)}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition">
        ← Prev
      </button>
      <span className="text-xs text-gray-500 font-semibold">Page {page} of {meta.totalPages}</span>
      <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}
        className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition">
        Next →
      </button>
    </div>
  );
}


export default function AdminUsersPage() {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [page, setPage] = useState(1);
  const debounced = useDebounce(search.trim(), 300);

  const { users, meta, isPending } = useAdminUsers({
    ...(debounced ? { search: debounced } : {}),
    ...(status ? { status } : {}),
    page,
    limit: 20,
  });

  return (
    <div className="space-y-4">
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
            <table className="w-full min-w-[620px] text-left text-xs">
              <thead className="bg-cream/60 text-[11px] uppercase tracking-wider text-muted">
                <tr>
                  <th className="px-4 py-2.5 font-bold">Email</th>
                  <th className="px-4 py-2.5 font-bold">Name</th>
                  <th className="px-4 py-2.5 font-bold">Phone</th>
                  <th className="px-4 py-2.5 font-bold">Role</th>
                  <th className="px-4 py-2.5 font-bold">Status</th>
                  <th className="px-4 py-2.5 font-bold">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr key={u.id} className="border-t border-cardline/60">
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
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && <Pagination meta={meta} page={page} setPage={setPage} />}
    </div>
  );
}
