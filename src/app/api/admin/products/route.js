import { ok, created, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { adminListProducts, adminCreateProduct } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/products?search=&category=&page=&limit=
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  const sp = req.nextUrl.searchParams;
  const result = await adminListProducts({
    search: sp.get("search") || undefined,
    category: sp.get("category") || undefined,
    page: Math.max(1, Number(sp.get("page")) || 1),
    limit: Math.min(100, Number(sp.get("limit")) || 20),
  });
  return ok(result.items, { meta: result.meta });
});

// POST /api/admin/products
export const POST = withRoute(async (req) => {
  await requireAdmin(req);
  const body = await req.json().catch(() => ({}));
  return created(await adminCreateProduct(body));
});
