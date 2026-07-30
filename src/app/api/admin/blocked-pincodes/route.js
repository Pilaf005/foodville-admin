import { ok, created, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import {
  adminListBlockedPincodes,
  adminCreateBlockedPincodes,
  adminDeleteBlockedPincode,
  adminToggleBlockedPincode
} from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/blocked-pincodes?q=search
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  const search = req.nextUrl.searchParams.get("q") || "";
  return ok(await adminListBlockedPincodes(search));
});

// POST /api/admin/blocked-pincodes
export const POST = withRoute(async (req) => {
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  return created(await adminCreateBlockedPincodes(body));
});

// DELETE /api/admin/blocked-pincodes?id=xxx
export const DELETE = withRoute(async (req) => {
  await requireAdmin(req);
  const id = req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("pincode");
  if (!id) throw new Error("Pincode or ID parameter is required");
  return ok(await adminDeleteBlockedPincode(id));
});

// PATCH /api/admin/blocked-pincodes?id=xxx
export const PATCH = withRoute(async (req) => {
  await requireAdmin(req);
  const id = req.nextUrl.searchParams.get("id") || req.nextUrl.searchParams.get("pincode");
  if (!id) throw new Error("Pincode or ID parameter is required");
  return ok(await adminToggleBlockedPincode(id));
});
