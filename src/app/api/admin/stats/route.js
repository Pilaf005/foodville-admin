import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { getStats } from "@/server/controllers/admin.controller";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  return ok(await getStats());
});
