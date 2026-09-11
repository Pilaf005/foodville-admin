import { ok, withRoute } from "@/server/utils/apiResponse";
import DistributorApplication from "@/server/models/DistributorApplication";

export const runtime = "nodejs";

// GET /api/admin/distributor-applications
export const GET = withRoute(async (req) => {
  const { searchParams } = new URL(req.url);
  const status = searchParams.get("status");
  const search = searchParams.get("search");

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }

  if (search) {
    const regex = new RegExp(search.trim(), "i");
    filter.$or = [
      { applicationId: regex },
      { fullName: regex },
      { firmName: regex },
      { email: regex },
      { phone: regex },
      { city: regex },
      { state: regex },
      { pincode: regex },
      { companyGstin: regex },
    ];
  }

  const items = await DistributorApplication.find(filter).sort({ createdAt: -1 }).lean();

  const stats = {
    total: await DistributorApplication.countDocuments({}),
    pending: await DistributorApplication.countDocuments({ status: "pending" }),
    contacted: await DistributorApplication.countDocuments({ status: "contacted" }),
    under_review: await DistributorApplication.countDocuments({ status: "under_review" }),
    approved: await DistributorApplication.countDocuments({ status: "approved" }),
    rejected: await DistributorApplication.countDocuments({ status: "rejected" }),
  };

  return ok({ items, stats });
});

// DELETE /api/admin/distributor-applications (Purge invalid bot spam leads)
export const DELETE = withRoute(async () => {
  const PHONE_REGEX = /^[6-9]\d{9}$/;
  const PINCODE_REGEX = /^[1-9]\d{5}$/;

  const allApps = await DistributorApplication.find({});
  let purgedCount = 0;

  for (const app of allApps) {
    const rawPhone = String(app.phone || "").trim();
    const rawPincode = String(app.pincode || "").trim();
    const cleanName = String(app.fullName || "").trim();

    const isBot =
      !PHONE_REGEX.test(rawPhone) ||
      !PINCODE_REGEX.test(rawPincode) ||
      (!cleanName.includes(" ") && /[A-Z].*[A-Z].*[A-Z]/.test(cleanName) && cleanName.length > 12);

    if (isBot) {
      await DistributorApplication.deleteOne({ _id: app._id });
      purgedCount++;
    }
  }

  return ok({
    purgedCount,
    message: `Purged ${purgedCount} invalid bot spam leads successfully.`,
  });
});

