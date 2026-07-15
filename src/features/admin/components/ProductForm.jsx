"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCategories, useAdminMutations } from "@/features/admin/hooks/useAdmin";
import ImageUploadField from "@/features/admin/components/ui/ImageUploadField";

const EMPTY = {
  name: "", slug: "", category: "", description: "",
  price: "", mrp: "", stock: "", unit: "100g", brand: "Foodville", tags: "",
  image: "", images: [],
  highlights: {
    shelfLife: "", storage: "", origin: "India", form: "",
    ingredients: "", foodType: "100% Vegetarian / Vegan Friendly",
    manufacturedBy: "Foodville Consumer Products Private Limited",
  },
};

function Section({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">{title}</h3>
      </div>
      <div className="p-5 space-y-4">{children}</div>
    </div>
  );
}

function Field({ label, required, children }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
        {label}{required && <span className="text-red-400 ml-0.5">*</span>}
      </label>
      {children}
    </div>
  );
}

const ic = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30 focus:border-[#6B7F59] transition";

export default function ProductForm({ product, isNew }) {
  const router = useRouter();
  const { categories } = useAdminCategories();
  const { createProduct, updateProduct } = useAdminMutations();

  const [form, setForm] = useState(() => {
    if (isNew) return EMPTY;
    return {
      ...EMPTY, ...product,
      tags:   Array.isArray(product?.tags)   ? product.tags.join(", ") : (product?.tags ?? ""),
      images: Array.isArray(product?.images) ? product.images : (product?.images ? [product.images] : []),
      highlights: { ...EMPTY.highlights, ...(product?.highlights ?? {}) },
    };
  });

  const isPending = createProduct.isPending || updateProduct.isPending;

  function set(key, val)   { setForm((p) => ({ ...p, [key]: val })); }
  function setHL(key, val) { setForm((p) => ({ ...p, highlights: { ...p.highlights, [key]: val } })); }

  function handleSave(e) {
    e.preventDefault();
    const payload = {
      ...form,
      price:  Number(form.price),
      mrp:    Number(form.mrp),
      stock:  Number(form.stock),
      tags:   form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      images: form.images.map((u) => u.trim()).filter(Boolean),
    };
    if (isNew) {
      createProduct.mutate(payload, { onSuccess: () => router.push("/products") });
    } else {
      const id = product.id ?? product.numericId;
      updateProduct.mutate({ id, data: payload }, { onSuccess: () => router.push("/products") });
    }
  }

  return (
    <form onSubmit={handleSave} className="space-y-5">
      {/* Basic Info */}
      <Section title="Basic Info">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          <Field label="Product Name" required>
            <input required type="text" value={form.name} onChange={(e) => set("name", e.target.value)} placeholder="e.g. Kashmiri Red Chilli Powder" className={ic} />
          </Field>
          <Field label="Slug" required>
            <input required type="text" value={form.slug} onChange={(e) => set("slug", e.target.value)} placeholder="kashmiri-red-chilli-powder" className={ic} />
          </Field>
          <Field label="Category" required>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={ic}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </Field>
          <Field label="Unit">
            <input type="text" value={form.unit} onChange={(e) => set("unit", e.target.value)} placeholder="100g" className={ic} />
          </Field>
          <Field label="Brand">
            <input type="text" value={form.brand} onChange={(e) => set("brand", e.target.value)} className={ic} />
          </Field>
          <Field label="Tags (comma separated)">
            <input type="text" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="spice, powder, bestseller" className={ic} />
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Full product description…" className={`${ic} resize-none`} />
        </Field>
      </Section>

      {/* Pricing & Stock */}
      <Section title="Pricing & Stock">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-4">
          <Field label="Selling Price (₹)" required>
            <input required type="number" min="0" value={form.price} onChange={(e) => set("price", e.target.value)} placeholder="149" className={ic} />
          </Field>
          <Field label="MRP (₹)" required>
            <input required type="number" min="0" value={form.mrp} onChange={(e) => set("mrp", e.target.value)} placeholder="179" className={ic} />
          </Field>
          <Field label="Stock Quantity" required>
            <input required type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="50" className={ic} />
          </Field>
        </div>
        {form.price && form.mrp && Number(form.mrp) > Number(form.price) && (
          <p className="text-xs text-[#6B7F59] font-semibold">
            Discount: {Math.round(((form.mrp - form.price) / form.mrp) * 100)}% off
          </p>
        )}
      </Section>

      {/* Images */}
      <Section title="Images">
        <ImageUploadField
          label="Primary Image"
          required
          value={form.image}
          onChange={(v) => set("image", v)}
        />
        <div className="space-y-3">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Additional Images
          </label>
          {form.images.map((url, idx) => (
            <div key={idx} className="flex items-start gap-2">
              <div className="flex-1">
                <ImageUploadField
                  label={`Image ${idx + 2}`}
                  value={url}
                  previewSize="sm"
                  onChange={(v) => {
                    const nextImages = [...form.images];
                    nextImages[idx] = v;
                    set("images", nextImages);
                  }}
                />
              </div>
              <button
                type="button"
                onClick={() => {
                  const nextImages = form.images.filter((_, i) => i !== idx);
                  set("images", nextImages);
                }}
                className="mt-7 p-2 rounded-lg text-red-500 hover:bg-red-50 transition shrink-0"
                aria-label="Remove image"
              >
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                </svg>
              </button>
            </div>
          ))}
          <button
            type="button"
            onClick={() => set("images", [...form.images, ""])}
            className="flex items-center gap-1.5 text-xs font-bold text-[#6B7F59] border border-[#6B7F59]/40 rounded-xl px-3 py-2 hover:bg-[#6B7F59]/5 transition"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M12 5v14M5 12h14"/></svg>
            Add Another Image
          </button>
        </div>
      </Section>

      {/* Details & Highlights */}
      <Section title="Details & Highlights">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {[
            ["shelfLife", "Shelf Life", "9 Months from Packaging"],
            ["origin", "Origin", "India"],
            ["form", "Product Form", "Fine Ground Powder"],
            ["ingredients", "Ingredients", "100% Pure…"],
            ["foodType", "Food Type", "Vegetarian / Vegan"],
            ["manufacturedBy", "Manufactured By", "Foodville Consumer Products…"],
          ].map(([key, label, ph]) => (
            <Field key={key} label={label}>
              <input type="text" value={form.highlights[key] ?? ""} onChange={(e) => setHL(key, e.target.value)} placeholder={ph} className={ic} />
            </Field>
          ))}
        </div>
        <Field label="Storage Instructions">
          <textarea rows={2} value={form.highlights.storage ?? ""} onChange={(e) => setHL("storage", e.target.value)} placeholder="Store in a cool, dry place…" className={`${ic} resize-none`} />
        </Field>
      </Section>

      <div className="flex gap-3 pt-2">
        <button type="submit" disabled={isPending}
          className="bg-[#6B7F59] hover:bg-[#5a6b4a] disabled:opacity-60 active:scale-[0.98] text-white text-sm font-bold px-8 py-3 rounded-xl transition shadow-sm">
          {isPending ? "Saving…" : isNew ? "Create Product" : "Save Changes"}
        </button>
        <button type="button" onClick={() => router.push("/products")}
          className="border-2 border-gray-200 text-gray-600 hover:border-gray-400 text-sm font-bold px-6 py-3 rounded-xl transition active:scale-[0.98]">
          Cancel
        </button>
      </div>
    </form>
  );
}
