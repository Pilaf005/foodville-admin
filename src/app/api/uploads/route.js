import { ok, withRoute } from "@/server/utils/apiResponse";
import { badRequest, forbidden } from "@/server/utils/apiError";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/utils/rateLimit";
import {
  uploadImage,
  deleteObject,
  keyFromUrl,
  UPLOAD_FOLDERS,
  MEDIA_ROOT,
} from "@/server/services/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Decide where this caller is allowed to write.
 *  - "users"  → only their OWN avatar (ownerId is forced to their user id)
 *  - anything else (products/categories/blogs) → admins only
 */
function authorizeTarget(auth, folder, ownerId) {
  if (!UPLOAD_FOLDERS.includes(folder)) throw badRequest("Unknown upload folder.");

  if (folder === "users") return auth.userId; // ignore any client-supplied id

  if (auth.role !== "admin") throw forbidden("Only admins can upload catalog images.");
  if (!ownerId) throw badRequest("An ownerId (e.g. the product slug) is required.");
  return ownerId;
}

/**
 * POST /api/uploads   (multipart/form-data)
 *   file        the image
 *   folder      products | categories | blogs | users
 *   ownerId     product/category/blog slug (ignored for "users")
 *   replaceUrl  optional — the previous image URL, deleted after a successful upload
 * → { key, url }
 */
export const POST = withRoute(async (req) => {
  const auth = await requireAuth(req);
  rateLimit(req, { key: "upload", limit: 30, windowMs: 60_000 });

  const form = await req.formData().catch(() => null);
  if (!form) throw badRequest("Expected a multipart/form-data upload.");

  const file = form.get("file");
  if (!file || typeof file.arrayBuffer !== "function") throw badRequest("No file was uploaded.");

  const folder = String(form.get("folder") || "products");
  const ownerId = authorizeTarget(auth, folder, String(form.get("ownerId") || "catalog"));
  const replaceUrl = form.get("replaceUrl") ? String(form.get("replaceUrl")) : null;

  const buffer = Buffer.from(await file.arrayBuffer());

  const result = await uploadImage({
    buffer,
    declaredType: file.type || "",
    folder,
    ownerId,
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
