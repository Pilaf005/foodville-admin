import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { notFound, badRequest } from "@/server/utils/apiError";
import GlobalExportInquiry from "@/server/models/GlobalExportInquiry";

export const runtime = "nodejs";

export const PATCH = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { status, internalNotes } = body;

  const validStatuses = [
    "pending",
    "contacted",
    "quoted",
    "contract_signed",
    "closed",
  ];

  if (status && !validStatuses.includes(status)) {
    throw badRequest("Invalid export inquiry status.");
  }

  const update = {};
  if (status !== undefined) update.status = status;
  if (internalNotes !== undefined) update.internalNotes = internalNotes;

  const doc = await GlobalExportInquiry.findByIdAndUpdate(
    id,
    { $set: update },
    { new: true, runValidators: false }
  );

  if (!doc) throw notFound("Export inquiry not found");

  return ok({ success: true, item: doc });
});

export const DELETE = withRoute(async (req, { params }) => {
  await requireAdmin(req);
  const { id } = await params;

  const doc = await GlobalExportInquiry.findByIdAndDelete(id);
  if (!doc) throw notFound("Export inquiry not found");

  return ok({ success: true, message: "Export inquiry deleted successfully." });
});
