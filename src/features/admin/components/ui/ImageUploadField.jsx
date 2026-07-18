"use client";

import { useState, useRef, useEffect } from "react";

/**
 * ImageUploadField
 * Uploads files via the /api/uploads R2 storage endpoint.
 */
export default function ImageUploadField({
  value,
  onChange,
  label = "Image",
  required = false,
  previewSize = "md",
  folder = "products",
  ownerId = "catalog",
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [isHovered, setIsHovered] = useState(false);
  const inputRef = useRef(null);

  const preview = value || null;
  const thumbCls = previewSize === "sm" ? "w-16 h-16" : "w-24 h-24";

  // Global paste handler active only when hovering over this field
  useEffect(() => {
    function handleGlobalPaste(e) {
      if (!isHovered || uploading) return;
      const items = e.clipboardData?.items;
      if (!items) return;
      for (const item of items) {
        if (item.type.startsWith("image/")) {
          const file = item.getAsFile();
          if (file) {
            e.preventDefault();
            processFile(file);
            break;
          }
        }
      }
    }
    window.addEventListener("paste", handleGlobalPaste);
    return () => window.removeEventListener("paste", handleGlobalPaste);
  }, [isHovered, uploading]);

  async function processFile(file) {
    setError("");
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      setError("Please select an image file (JPG, PNG, WEBP, GIF).");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError("File is too large. Max size is 5 MB.");
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder || "products");
      formData.append("ownerId", ownerId || "catalog");
      if (value) formData.append("replaceUrl", value);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Upload failed.");
      onChange(json.data?.url || "");
    } catch (err) {
      setError(err.message || "Upload failed. Try again.");
    } finally {
      setUploading(false);
    }
  }

  function handleFileChange(e) { processFile(e.target.files?.[0]); }

  function handleDrop(e) {
    e.preventDefault();
    setDragging(false);
    processFile(e.dataTransfer.files?.[0]);
  }

  function handleRemove() {
    onChange("");
    setError("");
    if (inputRef.current) inputRef.current.value = "";
  }

  return (
    <div className="space-y-2">
      {/* Label */}
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
      </div>

      {/* File Upload Area */}
      <div>
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed cursor-pointer transition-all duration-150 p-6 ${
            dragging || isHovered
              ? "border-[#6B7F59] bg-[#6B7F59]/5"
              : "border-gray-200 bg-gray-50 hover:border-[#6B7F59]/60 hover:bg-[#6B7F59]/3"
          } ${uploading ? "opacity-60 cursor-wait" : ""}`}
        >
          {uploading ? (
            <>
              <svg className="animate-spin h-6 w-6 text-[#6B7F59]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              <p className="text-xs font-bold text-gray-500">Uploading image…</p>
            </>
          ) : (
            <>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#6B7F59" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round">
                <rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-5-5L5 21"/>
              </svg>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-600">
                  {dragging ? "Drop image here" : "Click to upload or drag & drop"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">JPG, PNG, WEBP · Max 5 MB</p>
              </div>
            </>
          )}
          <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={handleFileChange} />
        </div>
      </div>

      {/* Error */}
      {error && (
        <p className="text-[11px] text-red-500 flex items-center gap-1">
          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <circle cx="12" cy="12" r="10"/><line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
          </svg>
          {error}
        </p>
      )}

      {/* Preview */}
      {preview && (
        <div className="flex items-center gap-3 mt-1">
          <div className={`${thumbCls} rounded-xl overflow-hidden border border-gray-200 bg-gray-100 shrink-0`}>
            <img src={preview} alt="Preview" className="w-full h-full object-cover"
              onError={(e) => { e.currentTarget.style.display = "none"; }} />
          </div>
          <div className="space-y-1">
            <p className="text-[10px] text-gray-500 font-medium">Uploaded image</p>
            <button type="button" onClick={handleRemove}
              className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Remove
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
