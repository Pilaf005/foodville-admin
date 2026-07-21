"use client";

import { useState, useRef } from "react";

const MAX_SIZE_MB = 100;
// FFmpeg core files are served from /public/ffmpeg/ (same origin — no CSP issues)
const FFMPEG_BASE = "/ffmpeg";

/**
 * VideoUploadField
 * Accepts ANY video format (MP4, MOV, WebM, AVI, MKV, Instagram, iPhone HEVC…)
 * and automatically transcodes it to web-safe H.264 MP4 before uploading to R2.
 */
export default function VideoUploadField({
  value,
  onChange,
  label = "Video",
  required = false,
  folder = "products",
  ownerId = "catalog",
}) {
  const [dragging, setDragging] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);
  const [urlInput, setUrlInput] = useState("");
  const [showUrlInput, setShowUrlInput] = useState(false);
  const inputRef = useRef(null);
  const ffmpegRef = useRef(null);

  const preview = value || null;

  /** Load FFmpeg WASM lazily from CDN (single-threaded, no SharedArrayBuffer needed) */
  async function loadFFmpeg() {
    if (ffmpegRef.current) return ffmpegRef.current;
    const { FFmpeg } = await import("@ffmpeg/ffmpeg");
    const { toBlobURL } = await import("@ffmpeg/util");
    const ff = new FFmpeg();
    ff.on("progress", ({ progress: p }) => {
      setProgress(Math.round(p * 100));
    });
    setStatusMsg("Loading video converter (first time only)…");
    await ff.load({
      coreURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.js`, "text/javascript"),
      wasmURL: await toBlobURL(`${FFMPEG_BASE}/ffmpeg-core.wasm`, "application/wasm"),
    });
    ffmpegRef.current = ff;
    return ff;
  }

  /** Transcode any video file to browser-safe H.264 MP4 */
  async function transcodeToH264(file) {
    const { fetchFile } = await import("@ffmpeg/util");
    const ff = await loadFFmpeg();

    setStatusMsg("Converting to H.264 MP4…");
    setProgress(0);

    await ff.writeFile("input", await fetchFile(file));
    await ff.exec([
      "-i", "input",
      "-c:v", "libx264",        // H.264 video codec (100% browser compatible)
      "-preset", "fast",         // Fast encoding preset
      "-crf", "23",              // Quality (23 = good balance of size and quality)
      "-c:a", "aac",             // AAC audio
      "-b:a", "128k",            // 128kbps audio bitrate
      "-movflags", "+faststart", // Web-optimized: metadata at file start for instant play
      "-pix_fmt", "yuv420p",     // Maximum compatibility pixel format
      "output.mp4",
    ]);
    const data = await ff.readFile("output.mp4");
    await ff.deleteFile("input");
    await ff.deleteFile("output.mp4");

    return new File([data.buffer], "video.mp4", { type: "video/mp4" });
  }

  async function processFile(rawFile) {
    setError("");
    setProgress(0);
    if (!rawFile) return;
    if (!rawFile.type.startsWith("video/") && !/\.(mp4|webm|mov|mkv|avi|m4v|3gp|ts|flv|wmv)$/i.test(rawFile.name)) {
      setError("Please select a video file (MP4, MOV, WebM, AVI, MKV…).");
      return;
    }
    if (rawFile.size > MAX_SIZE_MB * 1024 * 1024) {
      setError(`File is too large. Max size is ${MAX_SIZE_MB} MB.`);
      return;
    }

    setUploading(true);
    try {
      // Check if it's already a standard H.264 MP4. If so, skip transcode.
      let file = rawFile;
      const needsTranscode = !(rawFile.type === "video/mp4" && rawFile.name.endsWith(".mp4"))
        || rawFile.type === "video/quicktime"   // MOV/iPhone
        || rawFile.name.match(/\.(mov|mkv|avi|m4v|3gp|ts|flv|wmv)$/i);

      if (needsTranscode) {
        setStatusMsg("Detected non-standard format. Auto-converting to H.264 MP4…");
        file = await transcodeToH264(rawFile);
      } else {
        // Still transcode to ensure web-safe codec even for "mp4" files (e.g. HEVC mp4)
        setStatusMsg("Verifying codec compatibility…");
        file = await transcodeToH264(rawFile);
      }

      setStatusMsg("Uploading to cloud storage…");
      setProgress(0);

      const formData = new FormData();
      formData.append("file", file);
      formData.append("folder", folder || "products");
      formData.append("ownerId", ownerId || "catalog");
      if (value) formData.append("replaceUrl", value);

      const res = await fetch("/api/uploads", { method: "POST", body: formData });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.error?.message || "Upload failed.");
      onChange(json.data?.url || "");
      setStatusMsg("");
    } catch (err) {
      setError(err.message || "Upload or conversion failed. Try again.");
      setStatusMsg("");
    } finally {
      setUploading(false);
      setProgress(0);
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
    setUrlInput("");
    setStatusMsg("");
    if (inputRef.current) inputRef.current.value = "";
  }

  function handleUrlSubmit(e) {
    if (e?.preventDefault) e.preventDefault();
    if (urlInput.trim()) {
      onChange(urlInput.trim());
      setShowUrlInput(false);
      setUrlInput("");
    }
  }

  return (
    <div className="space-y-2">
      {/* Label & Toggle */}
      <div className="flex items-center justify-between">
        <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
          {label}{required && <span className="text-red-400 ml-0.5">*</span>}
        </label>
        <button
          type="button"
          onClick={() => setShowUrlInput(!showUrlInput)}
          className="text-[10px] font-bold text-[#6B7F59] hover:underline"
          disabled={uploading}
        >
          {showUrlInput ? "← Upload file" : "+ Add via URL"}
        </button>
      </div>

      {showUrlInput ? (
        <div className="flex gap-2">
          <input
            type="url"
            value={urlInput}
            onChange={(e) => setUrlInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleUrlSubmit(e); }
            }}
            placeholder="Paste direct video URL (e.g. https://.../video.mp4)"
            className="flex-1 rounded-xl border border-gray-200 bg-gray-50 px-3 py-2 text-xs focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30"
          />
          <button
            type="button"
            onClick={handleUrlSubmit}
            className="px-4 py-2 bg-[#6B7F59] text-white text-xs font-bold rounded-xl hover:bg-[#5a6b4a] transition cursor-pointer"
          >
            Add
          </button>
        </div>
      ) : (
        /* File Upload Area */
        <div
          onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
          onDragLeave={() => setDragging(false)}
          onDrop={handleDrop}
          onClick={() => !uploading && inputRef.current?.click()}
          className={`relative flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed transition-all duration-150 p-6 ${
            dragging
              ? "border-[#6B7F59] bg-[#6B7F59]/5"
              : "border-gray-200 bg-gray-50 hover:border-[#6B7F59]/60 hover:bg-[#6B7F59]/3"
          } ${uploading ? "opacity-75 cursor-wait" : "cursor-pointer"}`}
        >
          {uploading ? (
            <div className="w-full flex flex-col items-center gap-3">
              {/* Spinner */}
              <svg className="animate-spin h-7 w-7 text-[#6B7F59]" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
              </svg>
              {/* Status text */}
              <p className="text-xs font-bold text-gray-600 text-center">{statusMsg || "Processing…"}</p>
              {/* Progress bar */}
              {progress > 0 && (
                <div className="w-full max-w-xs bg-gray-200 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-[#6B7F59] h-1.5 rounded-full transition-all duration-300"
                    style={{ width: `${progress}%` }}
                  />
                </div>
              )}
              {progress > 0 && (
                <p className="text-[10px] text-gray-400">{progress}%</p>
              )}
            </div>
          ) : (
            <>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={dragging ? "#6B7F59" : "#9ca3af"} strokeWidth="1.8" strokeLinecap="round">
                <rect width="18" height="14" x="3" y="5" rx="2"/><polygon points="10 9 15 12 10 15 10 9"/>
              </svg>
              <div className="text-center">
                <p className="text-xs font-bold text-gray-600">
                  {dragging ? "Drop video here" : "Click to upload product video or drag & drop"}
                </p>
                <p className="text-[10px] text-gray-400 mt-0.5">
                  Any format accepted — MP4, MOV, WebM, AVI, MKV, Instagram, iPhone · Max 100 MB
                </p>
                <p className="text-[9px] text-[#6B7F59] font-semibold mt-1">
                  ✓ Auto-converts to H.264 MP4 for universal browser playback
                </p>
              </div>
            </>
          )}
          <input
            ref={inputRef}
            type="file"
            accept="video/*"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
      )}

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
        <div className="space-y-2 pt-2 border-t border-gray-100">
          <div className="flex items-center justify-between">
            <p className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Video Preview</p>
            <button
              type="button"
              onClick={handleRemove}
              className="flex items-center gap-1 text-[11px] font-bold text-red-500 hover:text-red-600 transition"
            >
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                <path d="M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"/>
              </svg>
              Remove Video
            </button>
          </div>
          <div className="rounded-xl overflow-hidden border border-gray-200 bg-black aspect-video max-w-sm shadow-sm">
            <video
              key={preview}
              src={preview}
              controls
              playsInline
              preload="metadata"
              className="w-full h-full object-contain"
            />
          </div>
          <a
            href={preview}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-[11px] font-bold text-[#6B7F59] hover:underline"
          >
            ↗ Open / Download Video File
          </a>
        </div>
      )}
    </div>
  );
}
