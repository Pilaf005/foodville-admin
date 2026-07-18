"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAdminCategories, useAdminMutations, useAdminProducts } from "@/features/admin/hooks/useAdmin";
import ImageUploadField from "@/features/admin/components/ui/ImageUploadField";
import { toast } from "sonner";
 
const slugify = (s) =>
  String(s)
    .toLowerCase()
    .trim()
    .replace(/[^\w\s-]/g, "")
    .replace(/[\s_-]+/g, "-")
    .replace(/^-+|-+$/g, "");

const EMPTY = {
  name: "", slug: "", category: "", extraCategories: [], description: "",
  price: "", mrp: "", stock: "", unit: "100g", brand: "Foodville", tags: "",
  image: "", images: [],
  units: [],
  comboIncludes: [],
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
  const { products = [] } = useAdminProducts({ limit: 500 });
  const { createProduct, updateProduct } = useAdminMutations();

  const [form, setForm] = useState(() => {
    if (isNew) return EMPTY;
    return {
      ...EMPTY, ...product,
      tags:   Array.isArray(product?.tags)   ? product.tags.join(", ") : (product?.tags ?? ""),
      images: Array.isArray(product?.images) ? product.images : (product?.images ? [product.images] : []),
      units:  Array.isArray(product?.units)  ? product.units : [],
      comboIncludes: Array.isArray(product?.comboIncludes) ? product.comboIncludes : [],
      extraCategories: Array.isArray(product?.extraCategories) ? product.extraCategories : [],
      highlights: { ...EMPTY.highlights, ...(product?.highlights ?? {}) },
    };
  });

  const isPending = createProduct.isPending || updateProduct.isPending;
  const [isSlugManual, setIsSlugManual] = useState(false);
  const isCombo = form.category === "combos" || (form.extraCategories || []).includes("combos");
 
  function set(key, val)   { setForm((p) => ({ ...p, [key]: val })); }
  function setHL(key, val) { setForm((p) => ({ ...p, highlights: { ...p.highlights, [key]: val } })); }
 
  function handleNameChange(val) {
    set("name", val);
    if (isNew && !isSlugManual) {
      set("slug", slugify(val));
    }
  }

  function handleSave(e) {
    e.preventDefault();

    if (!form.units || form.units.length === 0) {
      toast.error("Please add at least one Pack Size / Variation in the list below.");
      return;
    }

    const parsedUnits = form.units.map((u) => ({
      unit: u.unit?.trim(),
      price: Number(u.price),
      mrp: u.mrp ? Number(u.mrp) : undefined,
      // standard fields
      ...(form.category !== "bulk" ? {
        packaging: u.packaging?.trim() || undefined
      } : {}),
      // bulk fields
      ...(form.category === "bulk" ? {
        perUnit: u.perUnit ? Number(u.perUnit) : undefined,
        savings: u.savings ? Number(u.savings) : undefined
      } : {})
    }));

    if (parsedUnits.some((u) => !u.unit || isNaN(u.price))) {
      toast.error("Please ensure all pack variations have a valid unit label and price.");
      return;
    }

    const firstUnit = parsedUnits[0];

    const payload = {
      ...form,
      price:  firstUnit.price,
      mrp:    firstUnit.mrp || firstUnit.price,
      unit:   firstUnit.unit,
      stock:  Number(form.stock),
      tags:   form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      images: form.images.map((u) => u.trim()).filter(Boolean),
      units:  parsedUnits,
      extraCategories: (form.extraCategories || []).filter((c) => c !== form.category),
      comboIncludes: isCombo ? (form.comboIncludes || []).map((c) => ({
        name: c.name,
        qty: c.qty,
        isFree: !!c.isFree
      })) : undefined,
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
            <input required type="text" value={form.name} onChange={(e) => handleNameChange(e.target.value)} placeholder="e.g. Kashmiri Red Chilli Powder" className={ic} />
          </Field>
          <Field label="Slug" required>
            <input required type="text" value={form.slug} onChange={(e) => { setIsSlugManual(true); set("slug", slugify(e.target.value)); }} placeholder="kashmiri-red-chilli-powder" className={ic} />
          </Field>
          <Field label="Category" required>
            <select value={form.category} onChange={(e) => set("category", e.target.value)} className={ic}>
              <option value="">Select category…</option>
              {categories.map((c) => (
                <option key={c.slug} value={c.slug}>{c.name}</option>
              ))}
            </select>
          </Field>

          <Field label="Brand">
            <input type="text" value={form.brand} onChange={(e) => set("brand", e.target.value)} className={ic} />
          </Field>
          <Field label="Stock Quantity" required>
            <input required type="number" min="0" value={form.stock} onChange={(e) => set("stock", e.target.value)} placeholder="50" className={ic} />
          </Field>
          <Field label="Tags (comma separated)">
            <input type="text" value={form.tags} onChange={(e) => set("tags", e.target.value)} placeholder="spice, powder, bestseller" className={ic} />
          </Field>
        </div>
        <Field label="Description">
          <textarea rows={4} value={form.description} onChange={(e) => set("description", e.target.value)} placeholder="Full product description…" className={`${ic} resize-none`} />
        </Field>

        <div className="pt-4 border-t border-gray-100 space-y-2">
          <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
            Additional Categories
          </label>
          <div className="flex flex-wrap gap-x-6 gap-y-2 pt-1">
            {categories
              .filter((c) => c.slug !== form.category)
              .map((c) => {
                const checked = (form.extraCategories || []).includes(c.slug);
                return (
                  <label key={c.slug} className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer select-none">
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={(e) => {
                        const next = e.target.checked
                          ? [...(form.extraCategories || []), c.slug]
                          : (form.extraCategories || []).filter((slug) => slug !== c.slug);
                        set("extraCategories", next);
                      }}
                      className="rounded border-gray-300 text-[#6B7F59] focus:ring-[#6B7F59] transition"
                    />
                    <span>{c.name}</span>
                  </label>
                );
              })}
          </div>
          <p className="text-[10px] text-gray-400">
            Select additional categories if you want this product to appear in multiple categories on the storefront.
          </p>
        </div>
      </Section>


      {/* Pack Sizes (Units) */}
      <Section title={form.category === "bulk" ? "Bulk Pack Variations" : "Product Pack Sizes / Variations"}>
        <div className="space-y-4">
          <p className="text-xs text-gray-500">
            {form.category === "bulk" 
              ? "Define the bulk packs (e.g., Pack of 2, Pack of 4) with their wholesale pricing." 
              : "Define the weight or packaging variations (e.g., 100g, 200g, 500g) for this product."}
          </p>
          
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="py-2 pr-4">Unit Label</th>
                  <th className="py-2 pr-4">Selling Price (₹)</th>
                  <th className="py-2 pr-4">MRP (₹)</th>
                  {form.category === "bulk" ? (
                    <>
                      <th className="py-2 pr-4">Per Unit Price (₹)</th>
                      <th className="py-2 pr-4">Savings (₹)</th>
                    </>
                  ) : (
                    <>
                      <th className="py-2 pr-4">Packaging Type</th>
                    </>
                  )}
                  <th className="py-2 w-10"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50 text-sm">
                {(form.units || []).map((item, idx) => (
                  <tr key={idx} className="group">
                    <td className="py-2 pr-2">
                      <input
                        type="text"
                        value={item.unit || ""}
                        onChange={(e) => {
                          const next = [...form.units];
                          next[idx].unit = e.target.value;
                          set("units", next);
                        }}
                        placeholder={form.category === "bulk" ? "e.g. Pack of 4 (100g each)" : "e.g. 200g"}
                        className="w-full bg-transparent border-b border-gray-200/40 group-hover:border-gray-300 focus:border-[#6B7F59] py-1 px-1 focus:outline-none"
                        required
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={item.price || ""}
                        onChange={(e) => {
                          const next = [...form.units];
                          next[idx].price = e.target.value;
                          if (form.category === "bulk" && next[idx].mrp && e.target.value) {
                            next[idx].savings = String(Number(next[idx].mrp) - Number(e.target.value));
                          }
                          set("units", next);
                        }}
                        placeholder="268"
                        className="w-full bg-transparent border-b border-gray-200/40 group-hover:border-gray-300 focus:border-[#6B7F59] py-1 px-1 focus:outline-none"
                        required
                      />
                    </td>
                    <td className="py-2 pr-2">
                      <input
                        type="number"
                        min="0"
                        value={item.mrp || ""}
                        onChange={(e) => {
                          const next = [...form.units];
                          next[idx].mrp = e.target.value;
                          if (form.category === "bulk" && e.target.value && next[idx].price) {
                            next[idx].savings = String(Number(e.target.value) - Number(next[idx].price));
                          }
                          set("units", next);
                        }}
                        placeholder="322"
                        className="w-full bg-transparent border-b border-gray-200/40 group-hover:border-gray-300 focus:border-[#6B7F59] py-1 px-1 focus:outline-none"
                      />
                    </td>
                    {form.category === "bulk" ? (
                      <>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            min="0"
                            value={item.perUnit || ""}
                            onChange={(e) => {
                              const next = [...form.units];
                              next[idx].perUnit = e.target.value;
                              set("units", next);
                            }}
                            placeholder="84"
                            className="w-full bg-transparent border-b border-gray-200/40 group-hover:border-gray-300 focus:border-[#6B7F59] py-1 px-1 focus:outline-none"
                          />
                        </td>
                        <td className="py-2 pr-2">
                          <input
                            type="number"
                            value={item.mrp && item.price ? Number(item.mrp) - Number(item.price) : ""}
                            readOnly
                            placeholder="Auto"
                            className="w-full bg-transparent border-b border-gray-200/40 py-1 px-1 text-gray-400 focus:outline-none cursor-not-allowed font-medium"
                          />
                        </td>
                      </>
                    ) : (
                      <>
                        <td className="py-2 pr-2">
                          <input
                            type="text"
                            value={item.packaging || ""}
                            onChange={(e) => {
                              const next = [...form.units];
                              next[idx].packaging = e.target.value;
                              set("units", next);
                            }}
                            placeholder="Jar 27x7.5"
                            className="w-full bg-transparent border-b border-gray-200/40 group-hover:border-gray-300 focus:border-[#6B7F59] py-1 px-1 focus:outline-none"
                          />
                        </td>
                      </>
                    )}
                    <td className="py-2 text-right">
                      <button
                        type="button"
                        onClick={() => {
                          set("units", form.units.filter((_, i) => i !== idx));
                        }}
                        className="text-red-500 hover:text-red-700 p-1 hover:bg-red-50 rounded transition cursor-pointer"
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                          <line x1="18" y1="6" x2="6" y2="18"></line>
                          <line x1="6" y1="6" x2="18" y2="18"></line>
                        </svg>
                      </button>
                    </td>
                  </tr>
                ))}
                {(!form.units || form.units.length === 0) && (
                  <tr>
                    <td colSpan={form.category === "bulk" ? 6 : 6} className="py-4 text-center text-xs text-gray-400 italic">
                      No variations added yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <button
            type="button"
            onClick={() => {
              const newUnit = form.category === "bulk"
                ? { unit: "", price: "", mrp: "", perUnit: "", savings: "" }
                : { unit: "", price: "", mrp: "", packaging: "" };
              set("units", [...(form.units || []), newUnit]);
            }}
            className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 hover:border-gray-400 text-xs font-bold text-gray-600 rounded-lg transition cursor-pointer"
          >
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"></line>
              <line x1="5" y1="12" x2="19" y2="12"></line>
            </svg>
            Add Pack Size
          </button>
        </div>
      </Section>

      {/* Combo Contents */}
      {isCombo && (
        <Section title="Combo Pack Contents">
          <div className="space-y-4">
            <p className="text-xs text-gray-500">
              List the products included in this combo pack. Customers will see this list on the product detail page.
            </p>

            <div className="space-y-2">
              {(form.comboIncludes || []).map((item, idx) => (
                <div key={idx} className="flex flex-col sm:flex-row gap-3 items-start sm:items-center bg-gray-50 p-3 rounded-xl border border-gray-200/60">
                  <div className="flex-1 w-full space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Select Product</label>
                    <select
                      value={item.name}
                      onChange={(e) => {
                        const next = [...form.comboIncludes];
                        next[idx].name = e.target.value;
                        set("comboIncludes", next);
                      }}
                      className={ic}
                      required
                    >
                      <option value="">Select a product...</option>
                      {products
                        .filter((p) => p.category !== "combos" && p.slug !== form.slug)
                        .map((p) => (
                          <option key={p.id || p.numericId} value={p.name}>
                            {p.name}
                          </option>
                        ))
                      }
                      {item.name && !products.some((p) => p.name === item.name) && (
                        <option value={item.name}>{item.name} (Custom)</option>
                      )}
                    </select>
                  </div>
                  
                  <div className="w-full sm:w-36 space-y-1">
                    <label className="block text-[9px] font-black text-gray-400 uppercase tracking-widest">Quantity/Label</label>
                    <input
                      type="text"
                      value={item.qty}
                      onChange={(e) => {
                        const next = [...form.comboIncludes];
                        next[idx].qty = e.target.value;
                        set("comboIncludes", next);
                      }}
                      placeholder="e.g. 1 unit, 100g"
                      className={ic}
                      required
                    />
                  </div>

                  <div className="flex items-center gap-2 pt-4 sm:pt-6">
                    <input
                      type="checkbox"
                      id={`free-${idx}`}
                      checked={item.isFree || false}
                      onChange={(e) => {
                        const next = [...form.comboIncludes];
                        next[idx].isFree = e.target.checked;
                        set("comboIncludes", next);
                      }}
                      className="rounded border-gray-300 text-[#6B7F59] focus:ring-[#6B7F59]"
                    />
                    <label htmlFor={`free-${idx}`} className="text-xs text-gray-600 font-bold uppercase tracking-wider select-none cursor-pointer">
                      Free
                    </label>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      set("comboIncludes", form.comboIncludes.filter((_, i) => i !== idx));
                    }}
                    className="text-red-500 hover:text-red-700 p-2 bg-white border border-gray-200 hover:bg-red-50 rounded-xl transition shadow-sm mt-0 sm:mt-5 self-end sm:self-center cursor-pointer"
                    title="Remove Item"
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                      <line x1="18" y1="6" x2="6" y2="18"></line>
                      <line x1="6" y1="6" x2="18" y2="18"></line>
                    </svg>
                  </button>
                </div>
              ))}

              {(!form.comboIncludes || form.comboIncludes.length === 0) && (
                <p className="text-xs text-gray-400 italic py-2 text-center bg-gray-50 border border-dashed border-gray-200 rounded-xl">
                  No combo items added yet. Click the button below to bundle items.
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={() => {
                set("comboIncludes", [...(form.comboIncludes || []), { name: "", qty: "1 unit", isFree: false }]);
              }}
              className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-gray-300 hover:border-gray-400 text-xs font-bold text-gray-600 rounded-lg transition cursor-pointer"
            >
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19"></line>
                <line x1="5" y1="12" x2="19" y2="12"></line>
              </svg>
              Add Bundle Item
            </button>
          </div>
        </Section>
      )}

      {/* Images */}
      <Section title="Images">
        <ImageUploadField
          label="Primary Image"
          required
          value={form.image}
          onChange={(v) => set("image", v)}
        />
        <div className="space-y-4">
          <ImageUploadField
            label="Additional Images"
            value=""
            previewSize="sm"
            onChange={(url) => {
              if (url) {
                set("images", [...form.images.filter(Boolean), url]);
              }
            }}
          />
 
          {form.images.filter(Boolean).length > 0 && (
            <div className="space-y-2">
              <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest">
                Uploaded Additional Images ({form.images.filter(Boolean).length})
              </p>
              <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-3">
                {form.images.filter(Boolean).map((url, idx) => (
                  <div key={idx} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-50 aspect-square flex flex-col justify-between shadow-sm animate-fade-in">
                    <img src={url} alt={`Extra ${idx + 1}`} className="w-full h-full object-cover" />
                    <button
                      type="button"
                      onClick={() => {
                        const nextImages = form.images.filter((_, i) => i !== idx);
                        set("images", nextImages);
                      }}
                      className="absolute top-1.5 right-1.5 p-1.5 bg-white/90 hover:bg-red-50 text-red-500 rounded-lg shadow-md transition hover:scale-105 active:scale-95 cursor-pointer"
                      title="Remove Image"
                    >
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                        <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
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
            ["netWeight", "Net Weight (per packet/unit)", "e.g. 100g per packet"],
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
