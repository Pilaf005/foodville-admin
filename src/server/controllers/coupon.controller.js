/**
 * Coupon CRUD controller for the Admin Panel.
 */
import Coupon from "@/server/models/Coupon";
import { badRequest, notFound } from "@/server/utils/apiError";

function serializeCoupon(doc) {
  return {
    _id: String(doc._id),
    code: doc.code,
    title: doc.title,
    description: doc.description || "",
    discountType: doc.discountType,
    discountValue: doc.discountValue,
    maxDiscount: doc.maxDiscount ?? null,
    minSubtotal: doc.minSubtotal ?? 0,
    firstOrderOnly: doc.firstOrderOnly ?? false,
    oncePerUser: doc.oncePerUser ?? false,
    showInCards: doc.showInCards !== false,
    isActive: doc.isActive !== false,
    expiresAt: doc.expiresAt ? doc.expiresAt.toISOString() : null,
    usageLimit: doc.usageLimit ?? null,
    usageCount: doc.usageCount ?? 0,
    createdAt: doc.createdAt?.toISOString?.() ?? doc.createdAt,
    updatedAt: doc.updatedAt?.toISOString?.() ?? doc.updatedAt,
  };
}

/**
 * List all coupons with optional search and pagination.
 */
export async function adminListCoupons({ search, page = 1, limit = 50 } = {}) {
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ code: rx }, { title: rx }];
  }

  const [docs, total] = await Promise.all([
    Coupon.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Coupon.countDocuments(filter),
  ]);

  return {
    items: docs.map(serializeCoupon),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/**
 * Create a new coupon.
 */
export async function adminCreateCoupon(data) {
  if (!data.code || !data.title) {
    throw badRequest("Coupon code and title are required.");
  }
  if (data.discountValue == null || Number(data.discountValue) <= 0) {
    throw badRequest("Discount value must be greater than 0.");
  }

  const code = String(data.code).trim().toUpperCase();
  if (await Coupon.exists({ code })) {
    throw badRequest(`Coupon code "${code}" already exists.`);
  }

  const doc = await Coupon.create({
    code,
    title: data.title,
    description: data.description || "",
    discountType: data.discountType || "percentage",
    discountValue: Number(data.discountValue),
    maxDiscount: data.maxDiscount != null ? Number(data.maxDiscount) : null,
    minSubtotal: data.minSubtotal != null ? Number(data.minSubtotal) : 0,
    firstOrderOnly: data.firstOrderOnly === true,
    oncePerUser: data.oncePerUser === true,
    showInCards: data.showInCards !== false,
    isActive: data.isActive !== false,
    expiresAt: data.expiresAt ? new Date(data.expiresAt) : null,
    usageLimit: data.usageLimit != null ? Number(data.usageLimit) : null,
    usageCount: 0,
  });

  return serializeCoupon(doc.toObject());
}

/**
 * Update an existing coupon by its MongoDB _id.
 */
export async function adminUpdateCoupon(id, data) {
  const existing = await Coupon.findById(id);
  if (!existing) throw notFound("Coupon not found.");

  // If code is being changed, check uniqueness
  if (data.code && data.code.toUpperCase() !== existing.code) {
    const dup = await Coupon.exists({ code: data.code.toUpperCase() });
    if (dup) throw badRequest(`Coupon code "${data.code.toUpperCase()}" already exists.`);
  }

  const updates = {};
  if (data.code != null) updates.code = String(data.code).trim().toUpperCase();
  if (data.title != null) updates.title = data.title;
  if (data.description != null) updates.description = data.description;
  if (data.discountType != null) updates.discountType = data.discountType;
  if (data.discountValue != null) updates.discountValue = Number(data.discountValue);
  if (data.maxDiscount !== undefined) updates.maxDiscount = data.maxDiscount != null ? Number(data.maxDiscount) : null;
  if (data.minSubtotal !== undefined) updates.minSubtotal = data.minSubtotal != null ? Number(data.minSubtotal) : 0;
  if (data.firstOrderOnly != null) updates.firstOrderOnly = data.firstOrderOnly === true;
  if (data.oncePerUser != null) updates.oncePerUser = data.oncePerUser === true;
  if (data.showInCards != null) updates.showInCards = data.showInCards !== false;
  if (data.isActive != null) updates.isActive = data.isActive !== false;
  if (data.expiresAt !== undefined) updates.expiresAt = data.expiresAt ? new Date(data.expiresAt) : null;
  if (data.usageLimit !== undefined) updates.usageLimit = data.usageLimit != null ? Number(data.usageLimit) : null;

  const doc = await Coupon.findByIdAndUpdate(id, { $set: updates }, { new: true }).lean();
  return serializeCoupon(doc);
}

/**
 * Delete a coupon by its MongoDB _id.
 */
export async function adminDeleteCoupon(id) {
  const doc = await Coupon.findById(id);
  if (!doc) throw notFound("Coupon not found.");
  await Coupon.deleteOne({ _id: id });
  return { deleted: true, code: doc.code };
}
