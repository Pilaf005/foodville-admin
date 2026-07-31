import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import FranchiseApplication from "@/server/models/FranchiseApplication";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const PHONE_REGEX = /^[6-9]\d{9}$/;
const PINCODE_REGEX = /^[1-9]\d{5}$/;

export const GET = withRoute(async (req) => {
  await requireAdmin(req);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const search = searchParams.get("search") || "";

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { fullName: rx },
      { email: rx },
      { phone: rx },
      { city: rx },
      { state: rx },
      { pincode: rx },
      { applicationId: rx },
    ];
  }

  const items = await FranchiseApplication.find(filter).sort({ createdAt: -1 }).lean();

  const stats = {
    total: await FranchiseApplication.countDocuments({}),
    pending: await FranchiseApplication.countDocuments({ status: "pending" }),
    contacted: await FranchiseApplication.countDocuments({ status: "contacted" }),
    under_review: await FranchiseApplication.countDocuments({ status: "under_review" }),
    approved: await FranchiseApplication.countDocuments({ status: "approved" }),
    rejected: await FranchiseApplication.countDocuments({ status: "rejected" }),
  };

  return ok({ items, stats });
});

// DELETE /api/admin/franchise-applications (Purge invalid bot spam leads)
export const DELETE = withRoute(async (req) => {
  await requireAdmin(req);

  const allApps = await FranchiseApplication.find({});
  let deletedCount = 0;

  for (const app of allApps) {
    const cleanPhone = String(app.phone || "").trim().replace(/\D/g, "");
    const cleanPin = String(app.pincode || "").trim().replace(/\D/g, "");

    const isInvalidPhone = !PHONE_REGEX.test(cleanPhone);
    const isInvalidPin = !PINCODE_REGEX.test(cleanPin);

    if (isInvalidPhone || isInvalidPin) {
      await FranchiseApplication.deleteOne({ _id: app._id });
      deletedCount++;
    }
  }

  return ok({ success: true, purgedCount: deletedCount });
});
