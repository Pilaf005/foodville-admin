import { ok, withRoute } from "@/server/utils/apiResponse";
import { notFound, badRequest } from "@/server/utils/apiError";
import DistributorApplication from "@/server/models/DistributorApplication";

export const runtime = "nodejs";

// GET /api/admin/distributor-applications/:id
export const GET = withRoute(async (req, { params }) => {
  const { id } = await params;
  const doc = await DistributorApplication.findById(id).lean();
  if (!doc) throw notFound("Distributor application not found");
  return ok(doc);
});

// PATCH /api/admin/distributor-applications/:id (Update status and internal notes)
export const PATCH = withRoute(async (req, { params }) => {
  const { id } = await params;
  const body = await req.json();
  const { status, internalNotes } = body;

  const validStatuses = ["pending", "contacted", "under_review", "approved", "rejected"];
  if (status && !validStatuses.includes(status)) {
    throw badRequest("Invalid status provided");
  }

  const update = {};
  if (status) update.status = status;
  if (internalNotes !== undefined) update.internalNotes = internalNotes;

  const doc = await DistributorApplication.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true }
  ).lean();

  if (!doc) throw notFound("Distributor application not found");

  return ok(doc);
});

// DELETE /api/admin/distributor-applications/:id
export const DELETE = withRoute(async (req, { params }) => {
  const { id } = await params;
  const doc = await DistributorApplication.findByIdAndDelete(id);
  if (!doc) throw notFound("Distributor application not found");
  return ok({ message: "Distributor application deleted successfully" });
});

