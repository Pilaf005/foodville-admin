import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { notFound, badRequest } from "@/server/utils/apiError";
import BulkInquiry from "@/server/models/BulkInquiry";

export const runtime = "nodejs";

export const PATCH = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;
 
  const body = await req.json().catch(() => ({}));
  const { status, internalNotes } = body;
 
  if (status && !["pending", "contacted", "quoted", "closed"].includes(status)) {
    throw badRequest("Invalid inquiry status.");
  }
 
  const update = {};
  if (status !== undefined) update.status = status;
  if (internalNotes !== undefined) update.internalNotes = internalNotes;
 
  const doc = await BulkInquiry.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: false }
  );
 
  if (!doc) throw notFound("Bulk inquiry not found");
 
  return ok({ success: true, item: doc });
});
