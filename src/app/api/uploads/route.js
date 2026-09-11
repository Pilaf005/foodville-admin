import { ok, withRoute } from "@/server/utils/apiResponse";
import { badRequest, forbidden } from "@/server/utils/apiError";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/utils/rateLimit";
import {
  uploadMedia,
  deleteObject,
  keyFromUrl,
  UPLOAD_FOLDERS,
  MEDIA_ROOT,
} from "@/server/services/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const maxDuration = 60; // 60 seconds timeout for large video uploads

/**
 * Decide where this caller is allowed to write.
 *  - "users"  → only their OWN avatar (ownerId is forced to their user id)
 *  - anything else (products/categories/blogs) → admins only
 */
function authorizeTarget(auth, folder, ownerId) {
  if (!UPLOAD_FOLDERS.includes(folder)) throw badRequest("Unknown upload folder.");

  if (folder === "users") return auth.userId; // ignore any client-supplied id

  if (auth.role !== "admin") throw forbidden("Only admins can upload catalog media.");
  if (!ownerId) throw badRequest("An ownerId (e.g. the product slug) is required.");
  return ownerId;
}

/**
 * POST /api/uploads   (multipart/form-data)
 *   file        the image or video file
 *   folder      products | categories | blogs | users
 *   ownerId     product/category/blog slug (ignored for "users")
 *   replaceUrl  optional — the previous media URL, deleted after a successful upload
 * → { key, url }
 */
export const POST = withRoute(async (req) => {
  const auth = await requireAuth(req);
  rateLimit(req, { key: "upload", limit: 30, windowMs: 60_000 });

  const contentType = req.headers.get("content-type") || "";

  let buffer = null;
  let declaredType = "";
  let fileName = "";
  let folder = "products";
  let ownerId = "catalog";
  let replaceUrl = null;

  if (contentType.includes("multipart/form-data")) {
    try {
      const form = await req.formData();
      const file = form.get("file");
      if (file && typeof file.arrayBuffer === "function") {
        buffer = Buffer.from(await file.arrayBuffer());
        declaredType = file.type || "";
        fileName = file.name || "";
      }
      folder = String(form.get("folder") || "products");
      ownerId = String(form.get("ownerId") || "catalog");
      replaceUrl = form.get("replaceUrl") ? String(form.get("replaceUrl")) : null;
    } catch (err) {
      console.warn("[upload] req.formData() failed, trying raw body buffer:", err?.message);
      buffer = Buffer.from(await req.arrayBuffer());
      folder = req.headers.get("x-folder") || "products";
      ownerId = req.headers.get("x-owner-id") || "catalog";
      fileName = req.headers.get("x-file-name") || "file";
      replaceUrl = req.headers.get("x-replace-url") || null;
      declaredType = req.headers.get("x-file-type") || contentType;
    }
  } else {
    // Direct raw binary body upload (bypasses 10MB Undici FormData cap)
    buffer = Buffer.from(await req.arrayBuffer());
    folder = req.headers.get("x-folder") || "products";
    ownerId = req.headers.get("x-owner-id") || "catalog";
    fileName = req.headers.get("x-file-name") || "file";
    replaceUrl = req.headers.get("x-replace-url") || null;
    declaredType = req.headers.get("x-file-type") || contentType;
  }

  if (!buffer || buffer.length === 0) {
    throw badRequest("No file content was received.");
  }

  const validOwnerId = authorizeTarget(auth, folder, ownerId);

  const result = await uploadMedia({
    buffer,
    declaredType,
    fileName,
    folder,
    ownerId: validOwnerId,
    replaceUrl,
  });

  return ok(result, { status: 201 });
});

/**
 * DELETE /api/uploads?key=media/... (or ?url=https://...)
 * Users may only delete objects under their own media/users/<id>/ prefix.
 */
export const DELETE = withRoute(async (req) => {
  const auth = await requireAuth(req);

  const params = req.nextUrl.searchParams;
  const key = params.get("key") || keyFromUrl(params.get("url"));
  if (!key) throw badRequest("A key or url is required.");
  if (!key.startsWith(`${MEDIA_ROOT}/`)) throw badRequest("Invalid media key.");

  const ownPrefix = `${MEDIA_ROOT}/users/${auth.userId}/`;
  if (auth.role !== "admin" && !key.startsWith(ownPrefix)) {
    throw forbidden("You can only remove your own images.");
  }

  return ok(await deleteObject(key));
});
