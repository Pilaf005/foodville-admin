import { ok, withRoute } from "@/server/utils/apiResponse";
import { badRequest, forbidden } from "@/server/utils/apiError";
import { requireAuth } from "@/server/middleware/auth";
import { rateLimit } from "@/server/utils/rateLimit";
import {
  getPresignedUploadUrl,
  UPLOAD_FOLDERS,
} from "@/server/services/storage.service";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorizeTarget(auth, folder, ownerId) {
  if (!UPLOAD_FOLDERS.includes(folder)) throw badRequest("Unknown upload folder.");
  if (folder === "users") return auth.userId;
  if (auth.role !== "admin") throw forbidden("Only admins can upload catalog media.");
  if (!ownerId) throw badRequest("An ownerId (e.g. the product slug) is required.");
  return ownerId;
}

/**
 * POST /api/uploads/presigned
 * Body: { folder, ownerId, ext, contentType, replaceUrl }
 * Returns: { uploadUrl, publicUrl, key }
 */
export const POST = withRoute(async (req) => {
  const auth = await requireAuth(req);
  rateLimit(req, { key: "upload-presigned", limit: 60, windowMs: 60_000 });

  const body = await req.json().catch(() => ({}));
  const folder = String(body.folder || "products");
  const ownerId = String(body.ownerId || "catalog");
  const ext = String(body.ext || "mp4").replace(/^\./, "");
  const contentType = String(body.contentType || "video/mp4");
  const replaceUrl = body.replaceUrl ? String(body.replaceUrl) : null;

  const validOwnerId = authorizeTarget(auth, folder, ownerId);

  const data = await getPresignedUploadUrl({
    folder,
    ownerId: validOwnerId,
    ext,
    contentType,
    replaceUrl,
  });

  return ok(data, { status: 200 });
});
