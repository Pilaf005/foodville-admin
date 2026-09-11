import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import GlobalExportInquiry from "@/server/models/GlobalExportInquiry";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withRoute(async (req) => {
  await requireAdmin(req);

  const { searchParams } = req.nextUrl;
  const status = searchParams.get("status");
  const country = searchParams.get("country");
  const incoterms = searchParams.get("incoterms");
  const search = searchParams.get("search") || "";

  const filter = {};
  if (status && status !== "all") {
    filter.status = status;
  }
  if (country && country !== "all") {
    filter.country = new RegExp(`^${country}$`, "i");
  }
  if (incoterms && incoterms !== "all") {
    filter.incoterms = incoterms;
  }

  if (search) {
    const rx = new RegExp(search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [
      { inquiryId: rx },
      { fullName: rx },
      { companyName: rx },
      { country: rx },
      { destinationPort: rx },
      { email: rx },
      { phone: rx },
      { productInterest: rx },
      { message: rx },
    ];
  }

  const items = await GlobalExportInquiry.find(filter)
    .sort({ createdAt: -1 })
    .lean();

  const stats = {
    total: await GlobalExportInquiry.countDocuments({}),
    pending: await GlobalExportInquiry.countDocuments({ status: "pending" }),
    contacted: await GlobalExportInquiry.countDocuments({ status: "contacted" }),
    quoted: await GlobalExportInquiry.countDocuments({ status: "quoted" }),
    contract_signed: await GlobalExportInquiry.countDocuments({ status: "contract_signed" }),
    closed: await GlobalExportInquiry.countDocuments({ status: "closed" }),
  };

  return ok({ items, stats });
});
