import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateCategory, adminDeleteCategory } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/admin/categories/:slug
export const PUT = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { slug } = await params;
  const body = await req.json().catch(() => ({}));
  return ok(await adminUpdateCategory(slug, body));
});

// DELETE /api/admin/categories/:slug — refused while products still use it
export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { slug } = await params;
  return ok(await adminDeleteCategory(slug));
});
