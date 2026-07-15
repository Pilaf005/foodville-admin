import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateProduct, adminDeleteProduct } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/admin/products/:numericId — replaced images are removed from R2
export const PUT = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return ok(await adminUpdateProduct(id, body));
});

// DELETE /api/admin/products/:numericId — also deletes its R2 images
export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  return ok(await adminDeleteProduct(id));
});
