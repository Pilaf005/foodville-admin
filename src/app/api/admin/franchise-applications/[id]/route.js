import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { notFound, badRequest } from "@/server/utils/apiError";
import FranchiseApplication from "@/server/models/FranchiseApplication";

export const runtime = "nodejs";

export const PATCH = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
 
  const body = await req.json().catch(() => ({}));
  const { status, internalNotes } = body;
 
  const validStatuses = ["pending", "contacted", "under_review", "approved", "rejected"];
  if (status && !validStatuses.includes(status)) {
    throw badRequest("Invalid application status.");
  }
 
  const update = {};
  if (status !== undefined) update.status = status;
  if (internalNotes !== undefined) update.internalNotes = internalNotes;
 
  const doc = await FranchiseApplication.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: false }
  );
 
  if (!doc) throw notFound("Franchise application not found");
 
  return ok({ success: true, item: doc });
});
