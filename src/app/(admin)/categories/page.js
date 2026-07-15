"use client";

import { useState } from "react";
import { useAdminCategories, useAdminMutations } from "@/features/admin/hooks/useAdmin";
import ConfirmDialog from "@/features/admin/components/ui/ConfirmDialog";
import ImageUploadField from "@/features/admin/components/ui/ImageUploadField";

const EMPTY_FORM = { slug: "", name: "", image: "" };

function CategoryModal({ isOpen, initial, onClose, onSave, isPending }) {
  const [form, setForm] = useState(initial ? { slug: initial.slug, name: initial.name, image: initial.image || "" } : EMPTY_FORM);
  if (!isOpen) return null;

  function handleSave(e) {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSave({
      name: form.name,
      slug: form.slug || form.name.toLowerCase().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, ""),
      image: form.image,
    });
  }

  const ic = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30 focus:border-[#6B7F59] transition";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.45)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{initial ? "Edit Category" : "Add Category"}</h3>
          <button onClick={onClose} className="p-1.5 rounded-lg hover:bg-gray-100 text-gray-500 transition">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M18 6 6 18M6 6l12 12"/></svg>
          </button>
        </div>
        <form onSubmit={handleSave} className="p-5 space-y-4">
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Category Name <span className="text-red-400">*</span></label>
            <input required type="text" value={form.name} onChange={(e) => setForm((p) => ({ ...p, name: e.target.value }))} placeholder="e.g. Spice Powders" className={ic} />
          </div>
          <div className="space-y-1.5">
            <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Slug</label>
            <input type="text" value={form.slug} onChange={(e) => setForm((p) => ({ ...p, slug: e.target.value }))} placeholder="auto-generated from name" className={ic} />
          </div>
          <ImageUploadField
            label="Category Image"
            value={form.image}
            previewSize="sm"
            onChange={(v) => setForm((p) => ({ ...p, image: v }))}
          />
          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={isPending}
              className="flex-1 bg-[#6B7F59] hover:bg-[#5a6b4a] disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition active:scale-[0.98]">
              {isPending ? "Saving…" : initial ? "Save Changes" : "Add Category"}
            </button>
            <button type="button" onClick={onClose}
              className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:border-gray-400 transition active:scale-[0.98]">
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function AdminCategoriesPage() {
  const { categories, isLoading }         = useAdminCategories();
  const { createCategory, updateCategory, deleteCategory } = useAdminMutations();

  const [modal,        setModal]        = useState(null);   // null | "add" | category object
  const [deleteTarget, setDeleteTarget] = useState(null);

  function handleSave(data) {
    if (modal === "add") {
      createCategory.mutate(data, { onSuccess: () => setModal(null) });
    } else {
      updateCategory.mutate({ slug: modal.slug, data }, { onSuccess: () => setModal(null) });
    }
  }

  function handleDeleteConfirm() {
    deleteCategory.mutate(deleteTarget.slug, { onSuccess: () => setDeleteTarget(null) });
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-black text-gray-900 uppercase tracking-tight">Categories</h2>
          <p className="text-xs text-gray-400 mt-0.5">{categories.length} categories</p>
        </div>
        <button onClick={() => setModal("add")}
          className="flex items-center gap-2 bg-[#6B7F59] hover:bg-[#5a6b4a] text-white text-sm font-bold px-4 py-2.5 rounded-xl transition shadow-sm active:scale-[0.98]">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
          Add Category
        </button>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="h-24 rounded-2xl animate-shimmer" />)}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          {categories.length === 0 && (
            <div className="col-span-full text-center py-16 text-sm text-gray-400">No categories yet. Add one!</div>
          )}
          {categories.map((cat) => (
            <div key={cat.slug} className="bg-white rounded-2xl border border-gray-200 shadow-sm p-4 flex items-center gap-4 hover:shadow-md transition-shadow">
              <div className="w-14 h-14 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                {cat.image
                  ? <img src={cat.image} alt={cat.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />
                  : <div className="w-full h-full flex items-center justify-center text-gray-400 text-xl">🏷️</div>
                }
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-gray-900 truncate">{cat.name}</p>
                <p className="text-[10px] text-gray-400 mt-0.5">slug: <code className="bg-gray-100 px-1 rounded">{cat.slug}</code></p>
                <p className="text-[10px] text-[#6B7F59] font-semibold mt-0.5">{cat.productCount ?? 0} products</p>
              </div>
              <div className="flex flex-col gap-1.5 shrink-0">
                <button onClick={() => setModal(cat)} className="text-[11px] font-bold text-blue-600 hover:underline">Edit</button>
                <button onClick={() => setDeleteTarget(cat)} className="text-[11px] font-bold text-red-500 hover:underline">Delete</button>
              </div>
            </div>
          ))}
        </div>
      )}

      <CategoryModal
        isOpen={modal !== null}
        initial={modal === "add" ? null : modal}
        onClose={() => setModal(null)}
        onSave={handleSave}
        isPending={createCategory.isPending || updateCategory.isPending}
      />

      <ConfirmDialog
        isOpen={deleteTarget !== null}
        title="Delete Category"
        message={`Delete "${deleteTarget?.name}"? This cannot be undone.`}
        confirmLabel="Delete Category"
        onConfirm={handleDeleteConfirm}
        onCancel={() => setDeleteTarget(null)}
      />
    </div>
  );
}
