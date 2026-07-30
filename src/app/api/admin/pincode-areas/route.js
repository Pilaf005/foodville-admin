import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

// GET /api/admin/pincode-areas?pincode=110044
export const GET = withRoute(async (req) => {
  await requireAdmin(req);
  const pincode = req.nextUrl.searchParams.get("pincode");
  const cleanPin = String(pincode || "").replace(/\D/g, "");

  if (!cleanPin || cleanPin.length !== 6) {
    return ok({ pincode: cleanPin, areas: [] });
  }

  try {
    const res = await fetch(`https://api.postalpincode.in/pincode/${cleanPin}`, {
      next: { revalidate: 86400 } // cache for 24h
    });

    if (!res.ok) {
      return ok({ pincode: cleanPin, areas: [] });
    }

    const data = await res.json();
    const postOffices = data?.[0]?.PostOffice || [];
    
    // Extract unique Post Office area names
    const areaSet = new Set();
    for (const po of postOffices) {
      if (po.Name) areaSet.add(po.Name.trim());
    }

    return ok({
      pincode: cleanPin,
      district: postOffices[0]?.District || "",
      state: postOffices[0]?.State || "",
      areas: Array.from(areaSet)
    });
  } catch (err) {
    console.error("[Pincode Areas API Error]", err);
    return ok({ pincode: cleanPin, areas: [] });
  }
});
