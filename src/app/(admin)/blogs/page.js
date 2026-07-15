"use client";

import { useState } from "react";
import { toast } from "sonner";
import { useAdminBlogs, useAdminMutations } from "@/features/admin/hooks/useAdmin";
import { useImageUpload } from "@/features/profile/hooks/useProfile";
import { useDebounce } from "@/hooks/useDebounce";
import { Skeleton } from "@/components/feedback/Skeleton";
import Modal from "@/components/ui/Modal";

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


const slugify = (s) =>
  String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");

const CATEGORY_COLORS = {
  Health: "bg-green-100 text-green-700",
  Nutrition: "bg-amber-100 text-amber-700",
  Recipes: "bg-rose-100 text-rose-700",
  Wellness: "bg-blue-100 text-blue-700",
  Tips: "bg-purple-100 text-purple-700",
};

const EMPTY = {
  title: "", slug: "", category: "Health", readTime: "4 min read",
  date: "", image: "", preview: "", body: "",
};

/** The editor uses one plain textarea; blank lines separate blocks. A line
 *  starting with "# " becomes a heading. That maps onto fullContent[]. */
const bodyToBlocks = (text) =>
  String(text)
    .split(/\n\s*\n/)
    .map((chunk) => chunk.trim())
    .filter(Boolean)
    .map((chunk) =>
      chunk.startsWith("# ")
        ? { type: "heading", text: chunk.slice(2).trim() }
        : { type: "paragraph", text: chunk }
    );

const blocksToBody = (blocks = []) =>
  blocks.map((b) => (b.type === "heading" ? `# ${b.text}` : b.text)).join("\n\n");

export default function AdminBlogsPage() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [editing, setEditing] = useState(null);
  const debounced = useDebounce(search.trim(), 300);

  const { blogs, meta, isPending } = useAdminBlogs({
    ...(debounced ? { search: debounced } : {}),
    page,
    limit: 20,
  });
  const { deleteBlog } = useAdminMutations();

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-2 sm:flex-row">
        <input
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search articles…"
          className="w-full rounded-2xl border border-cardline bg-white px-4 py-2.5 text-sm outline-none
                     transition focus:border-olive focus:ring-2 focus:ring-olive/20"
        />
        <button
          onClick={() => setEditing({ ...EMPTY })}
          className="shrink-0 rounded-2xl bg-olive px-5 py-2.5 text-xs font-bold uppercase tracking-wide text-white
                     transition hover:bg-olive-dark active:scale-[0.98]"
        >
          + New article
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-cardline bg-white">
        {isPending ? (
          <div className="space-y-2 p-4">
            {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-14 rounded-xl" />)}
          </div>
        ) : blogs.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted">No articles found.</p>
        ) : (
          <div className="divide-y divide-cardline/60">
            {blogs.map((b) => (
              <div key={b.id} className="flex items-center gap-3 p-4 transition hover:bg-cream/40">
                <span className="h-12 w-16 shrink-0 overflow-hidden rounded-lg border border-cardline bg-cream">
                  {b.image && <img src={b.image} alt="" className="h-full w-full object-cover" />}
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-bold text-ink">{b.title}</p>
                  <div className="mt-0.5 flex flex-wrap items-center gap-2">
                    <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold ${CATEGORY_COLORS[b.category] || "bg-cardline/60 text-ink"}`}>
                      {b.category}
                    </span>
                    <span className="text-[11px] text-muted">{b.readTime}</span>
                    <span className="truncate text-[11px] text-muted">/{b.slug}</span>
                  </div>
                </div>
                <div className="flex shrink-0 gap-2">
                  <button
                    onClick={() => setEditing({ ...b, body: blocksToBody(b.fullContent) })}
                    className="rounded-xl border border-cardline px-3 py-1.5 text-[11px] font-bold text-ink transition hover:border-olive hover:text-olive"
                  >
                    Edit
                  </button>
                  <button
                    onClick={() => {
                      if (confirm(`Delete "${b.title}"? Its cover image will be removed too.`)) {
                        deleteBlog.mutate(b.id);
                      }
                    }}
                    className="rounded-xl border border-red-200 px-3 py-1.5 text-[11px] font-bold text-red-500 transition hover:bg-red-50"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {meta && meta.totalPages > 1 && <Pagination meta={meta} page={page} setPage={setPage} />}

      {editing && <BlogModal blog={editing} onClose={() => setEditing(null)} />}
    </div>
  );
}

function BlogModal({ blog, onClose }) {
  const isNew = !blog.id;
  const [form, setForm] = useState({ ...EMPTY, ...blog });
  const { createBlog, updateBlog } = useAdminMutations();
  const upload = useImageUpload();

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const busy = createBlog.isPending || updateBlog.isPending || upload.isPending;

  async function handleImage(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const slug = form.slug || slugify(form.title);
    if (!slug) return toast.error("Enter a title first.");

    const result = await upload.mutateAsync({
      file,
      folder: "blogs",
      ownerId: slug,
      replaceUrl: form.image || undefined,
    });
    if (result?.url) set("image", result.url);
  }

  async function handleSave(e) {
    e.preventDefault();
    const slug = form.slug || slugify(form.title);
    if (!form.title) return toast.error("A title is required.");

    const payload = {
      title: form.title,
      slug,
      category: form.category,
      categoryColor: CATEGORY_COLORS[form.category] || "bg-cardline/60 text-ink",
      readTime: form.readTime,
      date: form.date || new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" }),
      image: form.image,
      preview: form.preview,
      fullContent: bodyToBlocks(form.body),
    };

    if (isNew) await createBlog.mutateAsync(payload);
    else await updateBlog.mutateAsync({ id: blog.id, data: payload });
    onClose();
  }

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={isNew ? "New article" : "Edit article"}
      subtitle={isNew ? "Publish a new read for your customers" : `Editing “${blog.title}”`}
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSave} className="space-y-3">
          <Field label="Title">
            <input value={form.title} onChange={(e) => set("title", e.target.value)} className={inputCls} required />
          </Field>

          <div className="grid gap-3 sm:grid-cols-3">
            <Field label="Slug">
              <input
                value={form.slug}
                onChange={(e) => set("slug", slugify(e.target.value))}
                placeholder={slugify(form.title) || "auto"}
                className={inputCls}
              />
            </Field>
            <Field label="Category">
              <select value={form.category} onChange={(e) => set("category", e.target.value)} className={inputCls}>
                {Object.keys(CATEGORY_COLORS).map((c) => <option key={c} value={c}>{c}</option>)}
              </select>
            </Field>
            <Field label="Read time">
              <input value={form.readTime} onChange={(e) => set("readTime", e.target.value)} className={inputCls} />
            </Field>
          </div>

          <Field label="Preview (the lead paragraph)">
            <textarea value={form.preview} onChange={(e) => set("preview", e.target.value)} rows={2} className={inputCls} />
          </Field>

          <Field label='Body — blank line between blocks; start a line with "# " for a heading'>
            <textarea
              value={form.body}
              onChange={(e) => set("body", e.target.value)}
              rows={8}
              placeholder={"# Why moringa works\n\nMoringa is packed with…\n\n# How to use it\n\nAdd a teaspoon…"}
              className={`${inputCls} font-mono text-xs leading-relaxed`}
            />
          </Field>

          <Field label="Cover image">
            <div className="flex items-center gap-3">
              <span className="h-16 w-24 shrink-0 overflow-hidden rounded-xl border border-cardline bg-cream">
                {form.image && <img src={form.image} alt="" className="h-full w-full object-cover" />}
              </span>
              <input
                type="file"
                accept="image/jpeg,image/png,image/webp,image/avif"
                onChange={handleImage}
                disabled={upload.isPending}
                className="text-xs text-muted file:mr-2 file:rounded-xl file:border-0 file:bg-olive file:px-3 file:py-2
                           file:text-xs file:font-bold file:text-white hover:file:bg-olive-dark"
              />
            </div>
            {upload.isPending && <p className="mt-1 text-[11px] text-muted">Uploading…</p>}
          </Field>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-2xl border border-cardline py-2.5 text-xs font-bold uppercase text-ink transition hover:border-olive"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy}
              className="flex-1 rounded-2xl bg-olive py-2.5 text-xs font-bold uppercase text-white transition
                         hover:bg-olive-dark active:scale-[0.98] disabled:opacity-60"
            >
              {busy ? "Saving…" : isNew ? "Publish" : "Save changes"}
            </button>
          </div>
      </form>
    </Modal>
  );
}

const inputCls =
  "w-full rounded-xl border border-cardline bg-white px-3 py-2 text-sm text-ink outline-none transition focus:border-olive focus:ring-2 focus:ring-olive/20";

function Field({ label, children }) {
  return (
    <label className="block">
      <span className="mb-1 block text-[11px] font-bold uppercase tracking-wider text-muted">{label}</span>
      {children}
    </label>
  );
}
