import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminUpdateBlog, adminDeleteBlog } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// PUT /api/admin/blogs/:numericId
export const PUT = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  const body = await req.json().catch(() => ({}));
  return ok(await adminUpdateBlog(id, body));
});

// DELETE /api/admin/blogs/:numericId — also removes its R2 cover image
export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
  return ok(await adminDeleteBlog(id));
});
