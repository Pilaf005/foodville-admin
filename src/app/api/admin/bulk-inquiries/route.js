import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import BulkInquiry from "@/server/models/BulkInquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

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
      { companyName: rx },
      { email: rx },
      { phone: rx },
      { productName: rx },
      { inquiryId: rx },
    ];
  }

  const items = await BulkInquiry.find(filter).sort({ createdAt: -1 }).lean();

  const stats = {
    total: await BulkInquiry.countDocuments({}),
    pending: await BulkInquiry.countDocuments({ status: "pending" }),
    contacted: await BulkInquiry.countDocuments({ status: "contacted" }),
    quoted: await BulkInquiry.countDocuments({ status: "quoted" }),
    closed: await BulkInquiry.countDocuments({ status: "closed" }),
  };

  return ok({ items, stats });
});
