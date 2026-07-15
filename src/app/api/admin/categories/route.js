import { ok, created, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminListCategories, adminCreateCategory } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/categories — includes a productCount per category
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  return ok(await adminListCategories());
});

// POST /api/admin/categories
export const POST = withRoute(async (req) => {
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  return created(await adminCreateCategory(body));
});
