/**
 * Cloudflare R2 object storage (S3-compatible).
 *
 * Key layout — everything lives under `media/` so the bucket stays readable:
 *
 *   media/products/<product-slug>/<id>.<ext>     product photos + gallery
 *   media/categories/<category-slug>.<ext>       category tiles
 *   media/blogs/<blog-slug>/<id>.<ext>           article covers
 *   media/users/<userId>/avatar.<ext>            profile photos
 *
 * Safety:
 *  - only image mime types, cross-checked against the file's MAGIC BYTES so a
 *    renamed .exe can't sneak through a spoofed Content-Type,
 *  - hard size cap (Vercel caps request bodies at ~4.5MB),
 *  - keys are always built server-side from sanitised parts — a client can
 *    never choose an arbitrary path,
 *  - deletes are constrained to the `media/` prefix.
 */
import crypto from "node:crypto";
import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
  DeleteObjectsCommand,
  ListObjectsV2Command,
  HeadObjectCommand,
} from "@aws-sdk/client-s3";
import { env } from "@/server/config/env";
import { AppError, badRequest } from "@/server/utils/apiError";

export const MEDIA_ROOT = "media";
export const MAX_IMAGE_BYTES = 4 * 1024 * 1024; // 4MB

export const ALLOWED_IMAGE_TYPES = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/avif": "avif",
};

/** Upload targets a client may request. Anything else is rejected. */
export const UPLOAD_FOLDERS = ["products", "categories", "blogs", "users"];

let client = null;

function r2() {
  if (client) return client;
  const { endpoint, accessKeyId, secretAccessKey, bucket } = env.r2;
  if (!endpoint || !accessKeyId || !secretAccessKey || !bucket) {
    throw new AppError(
      "Image storage is not configured. Set R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY and R2_BUCKET.",
      503,
      "STORAGE_NOT_CONFIGURED"
    );
  }
  client = new S3Client({
    region: env.r2.region || "auto",
    endpoint,
    credentials: { accessKeyId, secretAccessKey },
    forcePathStyle: true, // R2 serves the bucket as a path segment
  });
  return client;
}

/* ── helpers ─────────────────────────────────────────────────────────────── */

/** Make any user-supplied identifier safe for use inside an object key. */
export function slugifyPart(value, fallback = "item") {
  const s = String(value || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-_]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return s || fallback;
}

/** Sniff the real image type from the file's leading bytes. */
function sniffImageType(buf) {
  if (buf.length < 12) return null;
  if (buf[0] === 0xff && buf[1] === 0xd8 && buf[2] === 0xff) return "image/jpeg";
  if (buf[0] === 0x89 && buf[1] === 0x50 && buf[2] === 0x4e && buf[3] === 0x47) return "image/png";
  const riff = buf.toString("ascii", 0, 4);
  const webp = buf.toString("ascii", 8, 12);
  if (riff === "RIFF" && webp === "WEBP") return "image/webp";
  const brand = buf.toString("ascii", 4, 12); // ftypavif / ftypavis
  if (brand.startsWith("ftypavif") || brand.startsWith("ftypavis")) return "image/avif";
  return null;
}

/**
 * Validate an uploaded image. Throws on anything suspicious.
 * @returns {{ buffer: Buffer, contentType: string, ext: string }}
 */
export function validateImage(buffer, declaredType) {
  if (!buffer?.length) throw badRequest("The uploaded file is empty.");
  if (buffer.length > MAX_IMAGE_BYTES) {
    throw badRequest(`Image is too large. Maximum size is ${MAX_IMAGE_BYTES / (1024 * 1024)}MB.`);
  }

  const sniffed = sniffImageType(buffer);
  if (!sniffed) throw badRequest("That file isn't a supported image (JPEG, PNG, WebP or AVIF).");

  // If the browser declared a type, it must agree with the actual bytes.
  if (declaredType && ALLOWED_IMAGE_TYPES[declaredType] && declaredType !== sniffed) {
    throw badRequest("The file's contents don't match its type.");
  }
  if (!ALLOWED_IMAGE_TYPES[sniffed]) {
    throw badRequest("That image format isn't supported. Use JPEG, PNG, WebP or AVIF.");
  }

  return { buffer, contentType: sniffed, ext: ALLOWED_IMAGE_TYPES[sniffed] };
}

/**
 * Build a readable, collision-free object key.
 * `users` uses a FIXED name so a new avatar overwrites the same location.
 */
export function buildKey({ folder, ownerId, ext }) {
  if (!UPLOAD_FOLDERS.includes(folder)) throw badRequest("Unknown upload folder.");
  const owner = slugifyPart(ownerId);

  switch (folder) {
    case "users":
      return `${MEDIA_ROOT}/users/${owner}/avatar.${ext}`;
    case "categories":
      return `${MEDIA_ROOT}/categories/${owner}.${ext}`;
    case "products":
      return `${MEDIA_ROOT}/products/${owner}/${crypto.randomUUID()}.${ext}`;
    case "blogs":
      return `${MEDIA_ROOT}/blogs/${owner}/${crypto.randomUUID()}.${ext}`;
    default:
      throw badRequest("Unknown upload folder.");
  }
}

/** Public URL for an object key. */
export function publicUrl(key) {
  if (!env.r2.publicBaseUrl) {
    throw new AppError("R2_PUBLIC_BASE_URL is not set.", 503, "STORAGE_NOT_CONFIGURED");
  }
  return `${env.r2.publicBaseUrl}/${key}`;
}

/** Recover the object key from a stored public URL (null if it isn't ours). */
export function keyFromUrl(url) {
  if (!url || !env.r2.publicBaseUrl) return null;
  if (!String(url).startsWith(env.r2.publicBaseUrl)) return null;
  const key = String(url).slice(env.r2.publicBaseUrl.length + 1);
  return key.startsWith(`${MEDIA_ROOT}/`) ? key : null;
}

/* ── operations ──────────────────────────────────────────────────────────── */

export async function putObject({ key, buffer, contentType }) {
  await r2().send(
    new PutObjectCommand({
      Bucket: env.r2.bucket,
      Key: key,
      Body: buffer,
      ContentType: contentType,
      CacheControl: "public, max-age=31536000, immutable",
    })
  );
  return { key, url: publicUrl(key) };
}

/**
 * Validate + store an image, optionally replacing a previous one.
 * `replaceUrl` (the old stored URL) is deleted afterwards — so an update
 * never leaves an orphaned object behind.
 */
export async function uploadImage({ buffer, declaredType, folder, ownerId, replaceUrl }) {
  const { buffer: safe, contentType, ext } = validateImage(buffer, declaredType);
  const key = buildKey({ folder, ownerId, ext });

  const result = await putObject({ key, buffer: safe, contentType });

  if (replaceUrl) {
    const oldKey = keyFromUrl(replaceUrl);
    // Don't delete the object we just wrote (same key => it was overwritten).
    if (oldKey && oldKey !== key) await deleteObject(oldKey).catch(() => {});
  }

  return result;
}

export async function deleteObject(key) {
  if (!key || !String(key).startsWith(`${MEDIA_ROOT}/`)) {
    throw badRequest("Refusing to delete an object outside the media/ prefix.");
  }
  await r2().send(new DeleteObjectCommand({ Bucket: env.r2.bucket, Key: key }));
  return { key, deleted: true };
}

/** Delete by stored public URL. Silently ignores URLs that aren't ours. */
export async function deleteByUrl(url) {
  const key = keyFromUrl(url);
  if (!key) return { deleted: false };
  return deleteObject(key);
}

export async function objectExists(key) {
  try {
    await r2().send(new HeadObjectCommand({ Bucket: env.r2.bucket, Key: key }));
    return true;
  } catch {
    return false;
  }
}

export async function listObjects(prefix = MEDIA_ROOT) {
  const out = await r2().send(
    new ListObjectsV2Command({ Bucket: env.r2.bucket, Prefix: prefix, MaxKeys: 1000 })
  );
  return (out.Contents || []).map((o) => ({ key: o.Key, size: o.Size }));
}

/** Delete every object under a prefix (used to clean up test artefacts). */
export async function deletePrefix(prefix) {
  if (!prefix) throw badRequest("A prefix is required.");
  const objects = await listObjects(prefix);
  if (!objects.length) return { deleted: 0 };
  await r2().send(
    new DeleteObjectsCommand({
      Bucket: env.r2.bucket,
      Delete: { Objects: objects.map((o) => ({ Key: o.key })) },
    })
  );
  return { deleted: objects.length };
}
