"use client";

import { useState, useRef } from "react";
import { toast } from "sonner";

/**
 * MultiImageUpload
 *
 * Props:
 *   images       — String[]  — ordered array of all R2 image URLs
 *   primaryIndex — Number    — index of the primary (card thumbnail) image
 *   ownerId      — String    — product slug used as R2 ownerId
 *   onChange     — ({ images: String[], primaryIndex: Number }) => void
 */
export default function MultiImageUpload({ images = [], primaryIndex = 0, ownerId = "catalog", onChange }) {
  const [dragging, setDragging] = useState(false);
  const [uploadingFiles, setUploadingFiles] = useState([]); // [{ name }]
  const inputRef = useRef(null);

  // ── Upload helpers ──────────────────────────────────────────────────────────

  async function uploadFile(file) {
    if (!file.type.startsWith("image/")) {
      toast.error(`"${file.name}" is not an image. Skipped.`);
      return null;
    }
    if (file.size > 4 * 1024 * 1024) {
      toast.error(`"${file.name}" exceeds 4 MB. Skipped.`);
      return null;
    }

    const formData = new FormData();
    formData.append("file", file);
    formData.append("folder", "products");
    formData.append("ownerId", ownerId || "catalog");

    try {
      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Upload failed.");
      return json.data?.url || null;
    } catch (err) {
      toast.error(`"${file.name}": ${err.message || "Upload failed."}`);
      return null;
    }
  }

  async function processFiles(files) {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);

    // Add spinner placeholders
    setUploadingFiles(fileArray.map((f) => ({ name: f.name })));

    let updatedImages = [...images];
    const wasEmpty = updatedImages.length === 0;
    let updatedPrimary = primaryIndex;

    for (let i = 0; i < fileArray.length; i++) {
      const url = await uploadFile(fileArray[i]);
      if (url) {
        updatedImages = [...updatedImages, url];
        // First ever image auto-becomes primary
        if (wasEmpty && updatedImages.length === 1) updatedPrimary = 0;
      }
      setUploadingFiles((prev) => prev.slice(1));
    }

    setUploadingFiles([]);
    onChange({ images: updatedImages, primaryIndex: updatedPrimary });
  }

  function handleFileChange(e) {
    processFiles(e.target.files);
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFiles(e.dataTransfer.files);
  }

  // ── Image actions ───────────────────────────────────────────────────────────

  function setPrimary(index) {
    onChange({ images, primaryIndex: index });
  }

  function moveLeft(index) {
    if (index === 0) return;
    const next = [...images];
    [next[index - 1], next[index]] = [next[index], next[index - 1]];
    let newPrimary = primaryIndex;
    if (primaryIndex === index) newPrimary = index - 1;
    else if (primaryIndex === index - 1) newPrimary = index;
    onChange({ images: next, primaryIndex: newPrimary });
  }

  function moveRight(index) {
    if (index === images.length - 1) return;
    const next = [...images];
    [next[index], next[index + 1]] = [next[index + 1], next[index]];
    let newPrimary = primaryIndex;
    if (primaryIndex === index) newPrimary = index + 1;
    else if (primaryIndex === index + 1) newPrimary = index;
    onChange({ images: next, primaryIndex: newPrimary });
  }

  async function handleRemove(index) {
    const urlToDelete = images[index];

    // 1. Update UI immediately
    const newImages = images.filter((_, i) => i !== index);
    let newPrimary = primaryIndex;
    if (index === primaryIndex) {
      newPrimary = 0;
    } else if (index < primaryIndex) {
      newPrimary = primaryIndex - 1;
    }
    onChange({ images: newImages, primaryIndex: newPrimary });

    // 2. Delete from R2 in background (best-effort)
    if (urlToDelete) {
      try {
        const res = await fetch(`/api/uploads?url=${encodeURIComponent(urlToDelete)}`, {
          method: "DELETE",
        });
        if (!res.ok) throw new Error("Server error");
      } catch {
        toast.warning("Image removed from product, but couldn't delete from storage.");
      }
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  const hasImages = images.length > 0 || uploadingFiles.length > 0;
  const isUploading = uploadingFiles.length > 0;

  return (
    <div className="space-y-4">
      {/* Drop Zone / Upload Button */}
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={handleDrop}
        onClick={() => !isUploading && inputRef.current?.click()}
        className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-150 p-5 ${
          dragging
            ? "border-[#6B7F59] bg-[#6B7F59]/8 cursor-copy"
            : "border-gray-200 bg-gray-50 hover:border-[#6B7F59]/60 hover:bg-[#6B7F59]/3 cursor-pointer"
        } ${isUploading ? "opacity-60 cursor-wait pointer-events-none" : ""}`}
      >
        {isUploading ? (
          <>
            <svg className="animate-spin h-5 w-5 text-[#6B7F59]" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
            </svg>
            <p className="text-xs font-bold text-gray-500">
              Uploading {uploadingFiles[0]?.name}…
            </p>
          </>
        ) : (
          <>
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#6B7F59" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round">
              <rect width="18" height="18" x="3" y="3" rx="2" />
              <circle cx="9" cy="9" r="2" />
              <path d="m21 15-5-5L5 21" />
            </svg>
            <div className="text-center">
              <p className="text-xs font-bold text-gray-600">
                {dragging ? "Drop images here" : "Click to upload or drag & drop"}
              </p>
              <p className="text-[10px] text-gray-400 mt-0.5">
                Select <strong>multiple files</strong> at once · JPG, PNG, WEBP, AVIF · Max 4 MB each
              </p>
            </div>
          </>
        )}
        <input
          ref={inputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFileChange}
        />
      </div>

      {/* Image Grid */}
      {hasImages && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {/* Uploaded image tiles */}
          {images.map((url, idx) => {
            const isPrimary = idx === primaryIndex;
            const isFirst = idx === 0;
            const isLast = idx === images.length - 1;
            return (
              <div
                key={url}
                className={`relative rounded-xl overflow-hidden border aspect-square bg-gray-50 shadow-sm transition-all ${
                  isPrimary
                    ? "border-amber-400 ring-2 ring-amber-300/50"
                    : "border-gray-200 hover:border-gray-300"
                }`}
              >
                {/* Image */}
                <img
                  src={url}
                  alt={`Product image ${idx + 1}`}
                  className="w-full h-full object-cover"
                  onError={(e) => { e.currentTarget.style.opacity = "0.3"; }}
                />

                {/* Primary star — top left */}
                <button
                  type="button"
                  onClick={() => !isPrimary && setPrimary(idx)}
                  title={isPrimary ? "Primary image (card thumbnail)" : "Set as primary image"}
                  className={`absolute top-1.5 left-1.5 flex items-center gap-0.5 px-1.5 py-0.5 rounded-md text-[9px] font-black shadow-md transition-all ${
                    isPrimary
                      ? "bg-amber-400 text-white cursor-default"
                      : "bg-white/85 text-gray-400 hover:bg-amber-400 hover:text-white cursor-pointer"
                  }`}
                >
                  <svg width="9" height="9" viewBox="0 0 24 24" fill={isPrimary ? "currentColor" : "none"} stroke="currentColor" strokeWidth="2.2">
                    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" />
                  </svg>
                  {isPrimary && <span>PRIMARY</span>}
                </button>

                {/* Remove — top right */}
                <button
                  type="button"
                  onClick={() => handleRemove(idx)}
                  title="Remove image (deletes from storage)"
                  className="absolute top-1.5 right-1.5 w-6 h-6 flex items-center justify-center bg-white/85 hover:bg-red-50 text-gray-500 hover:text-red-500 rounded-lg shadow-md transition cursor-pointer"
                >
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                    <line x1="18" y1="6" x2="6" y2="18" />
                    <line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>

                {/* Reorder arrows — bottom centre */}
                <div className="absolute bottom-1.5 left-0 right-0 flex items-center justify-center gap-1">
                  <button
                    type="button"
                    onClick={() => moveLeft(idx)}
                    disabled={isFirst}
                    title="Move left"
                    className="w-6 h-6 flex items-center justify-center bg-white/85 hover:bg-[#6B7F59] hover:text-white text-gray-600 rounded-lg shadow-md transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="15 18 9 12 15 6" />
                    </svg>
                  </button>
                  <span className="text-[9px] font-black text-white drop-shadow select-none leading-none">{idx + 1}</span>
                  <button
                    type="button"
                    onClick={() => moveRight(idx)}
                    disabled={isLast}
                    title="Move right"
                    className="w-6 h-6 flex items-center justify-center bg-white/85 hover:bg-[#6B7F59] hover:text-white text-gray-600 rounded-lg shadow-md transition disabled:opacity-30 disabled:cursor-not-allowed cursor-pointer"
                  >
                    <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                      <polyline points="9 18 15 12 9 6" />
                    </svg>
                  </button>
                </div>
              </div>
            );
          })}

          {/* Spinner placeholder tiles for files currently uploading */}
          {uploadingFiles.map((f, idx) => (
            <div
              key={`uploading-${idx}`}
              className="relative rounded-xl overflow-hidden border border-gray-200 aspect-square bg-gray-50 shadow-sm flex flex-col items-center justify-center gap-1.5"
            >
              <svg className="animate-spin h-5 w-5 text-[#6B7F59]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              <p className="text-[9px] text-gray-400 font-bold text-center px-2 truncate w-full">{f.name}</p>
            </div>
          ))}
        </div>
      )}

      {/* Empty hint */}
      {!hasImages && (
        <p className="text-[11px] text-gray-400 italic text-center py-0.5">
          No images yet. Upload at least one — it will be used as the product card thumbnail.
        </p>
      )}

      {/* Helper caption */}
      {images.length > 0 && (
        <p className="text-[10px] text-gray-400 leading-relaxed">
          <span className="text-amber-500 font-bold">⭐ PRIMARY</span> = shown on product card &amp; search results.&nbsp;
          Use <strong>←</strong> <strong>→</strong> to reorder.&nbsp;
          Removing an image <span className="text-red-500 font-semibold">permanently deletes it from storage</span>.
        </p>
      )}
    </div>
  );
}
