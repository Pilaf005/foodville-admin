"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useAdminProducts, useAdminMutations, useAdminCategories } from "@/features/admin/hooks/useAdmin";
import AdminBadge from "@/features/admin/components/ui/AdminBadge";
import ConfirmDialog from "@/features/admin/components/ui/ConfirmDialog";

function stockVariant(s) { return s === 0 ? "red" : s <= 10 ? "amber" : "green"; }
function stockLabel(s)   { return s === 0 ? "Out of Stock" : s <= 10 ? "Low Stock" : "In Stock"; }

const inputCls = "border border-gray-200 rounded-xl px-3 py-2 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30 focus:border-[#6B7F59] transition bg-white";

export default function AdminProductsPage() {
  const { products, isLoading } = useAdminProducts({ limit: 200 });
  const { categories }          = useAdminCategories();
  const { deleteProduct }       = useAdminMutations();

  const [search,       setSearch]      = useState("");
  const [catFilter,    setCatFilter]   = useState("all");
  const [deleteTarget, setDeleteTarget] = useState(null);

  const filtered = useMemo(() =>
    products
      .filter((p) => catFilter === "all" || p.category === catFilter)
      .filter((p) => !search.trim() || p.name.toLowerCase().includes(search.toLowerCase())),
    [products, search, catFilter]
  );

  function handleDeleteConfirm() {
    deleteProduct.mutate(deleteTarget.numericId ?? deleteTarget.id, {
      onSuccess: () => setDeleteTarget(null),
    });
  }

  return (
    <div className="space-y-5 max-w-7xl">
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Products</h2>
          <p className="text-xs text-gray-400 mt-0.5">{filtered.length} of {products.length} products</p>
        </div>
        <Link href="/products/new"
          className="flex items-center gap-2 bg-[#6B7F59] hover:bg-[#5a6b4a] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm active:scale-[0.98]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Product
        </Link>
      </div>

      <div className="flex flex-wrap gap-3 items-center bg-white rounded-2xl border border-gray-200 p-4 shadow-sm">
        <input type="search" value={search} onChange={(e) => setSearch(e.target.value)}
          placeholder="Search products…" className={`${inputCls} w-60`} />
        <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)} className={inputCls}>
          <option value="all">All Categories</option>
          {categories.map((c) => <option key={c.slug} value={c.slug}>{c.name}</option>)}
        </select>
        {(search || catFilter !== "all") && (
          <button onClick={() => { setSearch(""); setCatFilter("all"); }}
            className="text-xs font-bold text-gray-400 hover:text-gray-700 transition px-2">Clear</button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm min-w-[700px]">
            <thead><tr className="bg-gray-50 border-b border-gray-100">
              {["Product", "Category", "Price", "MRP", "Stock", "Status", "Actions"].map((h) => (
                <th key={h} className="px-4 py-3 text-left text-[10px] font-black text-gray-400 uppercase tracking-widest whitespace-nowrap">{h}</th>
              ))}
            </tr></thead>
            <tbody className="divide-y divide-gray-50">
              {isLoading ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i}><td colSpan={7} className="px-4 py-3"><div className="h-9 rounded-xl animate-shimmer" /></td></tr>
                ))
              ) : filtered.length === 0 ? (
                <tr><td colSpan={7} className="px-4 py-16 text-center text-sm text-gray-400">No products found.</td></tr>
              ) : filtered.map((p) => {
                const pid = p.numericId ?? p.id;
                return (
                  <tr key={pid} className="hover:bg-gray-50/60 transition-colors">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                          {p.image && <img src={p.image} alt={p.name} className="w-full h-full object-cover"
                            onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                        </div>
                        <div>
                          <p className="text-xs font-bold text-gray-900 max-w-[200px] truncate">{p.name}</p>
                          <p className="text-[10px] text-gray-400">ID: {pid}</p>
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3"><AdminBadge variant="olive">{p.category}</AdminBadge></td>
                    <td className="px-4 py-3 text-xs font-bold text-gray-900 whitespace-nowrap">₹{p.price}</td>
                    <td className="px-4 py-3 text-xs text-gray-400 line-through whitespace-nowrap">₹{p.mrp}</td>
                    <td className="px-4 py-3 text-xs font-semibold text-gray-700">{p.stock}</td>
                    <td className="px-4 py-3"><AdminBadge variant={stockVariant(p.stock)} dot>{stockLabel(p.stock)}</AdminBadge></td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <Link href={`/products/${pid}`} className="text-xs font-bold text-[#6B7F59] hover:underline">Edit</Link>
                        <button onClick={() => setDeleteTarget(p)} className="text-xs font-bold text-red-500 hover:underline">Delete</button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Product"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Product"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
