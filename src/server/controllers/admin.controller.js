/**
 * Admin operations. Every caller is already proven to be role="admin" by both
 * the edge proxy and requireAdmin() in the route handler.
 */
import Product from "@/server/models/Product";
import Order, { ORDER_STATUSES } from "@/server/models/Order";
import User from "@/server/models/User";
import Category from "@/server/models/Category";
import Blog from "@/server/models/Blog";
import { badRequest, notFound } from "@/server/utils/apiError";
import { serializeProduct, serializeProducts, serializeBlog } from "@/server/utils/serialize";
import { serializeOrder, cancelOrder } from "@/server/controllers/order.controller";
import { cacheClear } from "@/server/utils/cache";
import { deleteByUrl } from "@/server/services/storage.service";

/* ── Dashboard ───────────────────────────────────────────────────────────── */

export async function getStats() {
  const [
    totalOrders,
    paidAgg,
    totalUsers,
    pendingLeads,
    totalProducts,
    outOfStock,
    statusAgg,
    recentOrders,
  ] = await Promise.all([
    Order.countDocuments({ isDraft: { $ne: true } }),
    Order.aggregate([
      { $match: { paymentStatus: "paid", isDraft: { $ne: true } } },
      { $group: { _id: null, revenue: { $sum: "$amounts.total" }, count: { $sum: 1 } } },
    ]),
    User.countDocuments({ status: "active" }),
    User.countDocuments({ status: "pending" }), // captured emails that never verified
    Product.countDocuments({ isActive: true }),
    Product.countDocuments({ isActive: true, stock: { $lte: 0 } }),
    Order.aggregate([
      { $match: { isDraft: { $ne: true } } },
      { $group: { _id: "$status", count: { $sum: 1 } } }
    ]),
    Order.find({ isDraft: { $ne: true } }).sort({ placedAt: -1 }).limit(8).populate("user", "email fullName").lean(),
  ]);

  return {
    revenue: paidAgg[0]?.revenue ?? 0,
    paidOrders: paidAgg[0]?.count ?? 0,
    totalOrders,
    totalUsers,
    pendingLeads,
    totalProducts,
    outOfStock,
    ordersByStatus: Object.fromEntries(statusAgg.map((s) => [s._id, s.count])),
    recentOrders: recentOrders.map((o) => ({
      ...serializeOrder(o),
      customer: { email: o.user?.email ?? "", name: o.user?.fullName ?? "" },
    })),
  };
}

/* ── Products ────────────────────────────────────────────────────────────── */

export async function adminListProducts({ search, category, page = 1, limit = 20 }) {
  const filter = {};
  if (category) {
    filter.$or = [
      { category },
      { extraCategories: category }
    ];
  }
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ name: rx }, { slug: rx }];
  }

  const [docs, total] = await Promise.all([
    Product.find(filter).sort({ numericId: 1 }).skip((page - 1) * limit).limit(limit).lean(),
    Product.countDocuments(filter),
  ]);

  return {
    items: serializeProducts(docs),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function adminCreateProduct(data) {
  if (!data.name || !data.slug || !data.category || data.price == null) {
    throw badRequest("Name, slug, category and price are required.");
  }
  if (await Product.exists({ slug: data.slug })) {
    throw badRequest("A product with that slug already exists.");
  }

  // Continue the numeric id sequence the catalog already uses.
  const highest = await Product.findOne().sort({ numericId: -1 }).select("numericId").lean();
  const numericId = (highest?.numericId ?? 0) + 1;

  const doc = await Product.create({ ...data, numericId });
  cacheClear();
  return serializeProduct(doc.toObject());
}

export async function adminUpdateProduct(numericId, data) {
  const existing = await Product.findOne({ numericId: Number(numericId) });
  if (!existing) throw notFound("Product not found.");

  // If the main image was replaced, remove the old file from R2.
  if (data.image && existing.image && data.image !== existing.image) {
    await deleteByUrl(existing.image).catch(() => {});
  }
  // Same for gallery images that were dropped.
  if (Array.isArray(data.images)) {
    const removed = (existing.images || []).filter((url) => !data.images.includes(url));
    await Promise.all(removed.map((url) => deleteByUrl(url).catch(() => {})));
  }

  const { numericId: _ignore, ...safe } = data;
  const doc = await Product.findOneAndUpdate(
    { numericId: Number(numericId) },
    { $set: safe },
    { new: true }
  ).lean();

  cacheClear();
  return serializeProduct(doc);
}

export async function adminDeleteProduct(numericId) {
  const doc = await Product.findOne({ numericId: Number(numericId) });
  if (!doc) throw notFound("Product not found.");

  // Clean up its images so the bucket doesn't accumulate orphans.
  const urls = [doc.image, ...(doc.images || [])].filter(Boolean);
  await Promise.all(urls.map((url) => deleteByUrl(url).catch(() => {})));

  await Product.deleteOne({ numericId: Number(numericId) });
  cacheClear();
  return { deleted: true, numericId: Number(numericId) };
}

/* ── Orders ──────────────────────────────────────────────────────────────── */

export async function adminListOrders({ status, search, page = 1, limit = 20 }) {
  const filter = { isDraft: { $ne: true } };
  if (status) filter.status = status;
  if (search) filter.orderId = new RegExp(String(search), "i");

  const [docs, total] = await Promise.all([
    Order.find(filter).sort({ placedAt: -1 }).skip((page - 1) * limit).limit(limit)
      .populate("user", "email fullName").lean(),
    Order.countDocuments(filter),
  ]);

  return {
    items: docs.map((o) => ({
      ...serializeOrder(o),
      customer: { email: o.user?.email ?? "", name: o.user?.fullName ?? "" },
    })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function adminUpdateOrderStatus(orderId, status, note = "", deliveryData = null) {
  if (!ORDER_STATUSES.includes(status)) throw badRequest("Unknown order status.");
 
  const order = await Order.findOne({ orderId, isDraft: { $ne: true } });
  if (!order) throw notFound("Order not found.");
 
  // Terminal states never move again.
  if (order.status === "cancelled") throw badRequest("This order is cancelled — its status can't change.");
  if (order.status === "delivered" && status !== "delivered") {
    throw badRequest("This order is delivered — its status can't change.");
  }
 
  // Cancelling goes through the shared path (stock restore + auto-refund).
  if (status === "cancelled") {
    return cancelOrder(order, { by: "admin", note });
  }
 
  // An online order that was never paid (pending/failed payment) must not be
  // packed or shipped — the only valid transition is cancellation.
  if (order.paymentMethod === "razorpay" && order.paymentStatus !== "paid") {
    throw badRequest(
      `Payment is ${order.paymentStatus} — an unpaid order can only be cancelled, not moved to "${status.replace(/_/g, " ")}".`
    );
  }
 
  // If marking local delivery details
  if (deliveryData && deliveryData.deliveryMethod === "local") {
    order.shipping = order.shipping || {};
    order.shipping.deliveryMethod = "local";
    if (deliveryData.localDelivery) {
      order.shipping.localDelivery = {
        deliveryBoyName: deliveryData.localDelivery.deliveryBoyName || "",
        deliveryBoyPhone: deliveryData.localDelivery.deliveryBoyPhone || "",
      };
    }
  }
 
  // If local delivery is delivered, mark COD payment paid automatically
  if (status === "delivered" && order.shipping?.deliveryMethod === "local" && order.paymentMethod === "cod") {
    order.paymentStatus = "paid";
  }
 
  order.status = status;
 
  // Create timeline note
  let timelineNote = note;
  if (!timelineNote) {
    if (status === "shipped" && order.shipping?.deliveryMethod === "local") {
      const boy = order.shipping.localDelivery?.deliveryBoyName || "Local Delivery Executive";
      const phone = order.shipping.localDelivery?.deliveryBoyPhone;
      timelineNote = `Shipped locally via ${boy}${phone ? ` (Phone: ${phone})` : ""}`;
    } else if (status === "out_for_delivery" && order.shipping?.deliveryMethod === "local") {
      const boy = order.shipping.localDelivery?.deliveryBoyName || "Local Delivery Executive";
      timelineNote = `Out for delivery locally via ${boy}`;
    } else if (status === "delivered" && order.shipping?.deliveryMethod === "local") {
      const boy = order.shipping.localDelivery?.deliveryBoyName || "Local Delivery Executive";
      timelineNote = `Delivered locally via ${boy}`;
    } else {
      timelineNote = `Marked ${status.replace(/_/g, " ")}`;
    }
  }
 
  order.timeline.push({ status, at: new Date(), note: timelineNote });
  await order.save();
 
  return serializeOrder(order.toObject());
}

/* ── Users ───────────────────────────────────────────────────────────────── */

export async function adminListUsers({ status, search, page = 1, limit = 20 }) {
  const filter = {};
  if (status) filter.status = status;
  if (search) filter.email = new RegExp(String(search), "i");

  const [docs, total] = await Promise.all([
    User.find(filter).sort({ createdAt: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    User.countDocuments(filter),
  ]);

  return {
    items: docs.map((u) => ({
      id: String(u._id),
      email: u.email,
      fullName: u.fullName || "",
      phone: u.phone || "",
      role: u.role,
      status: u.status, // "pending" = a captured lead who never verified
      createdAt: u.createdAt,
      lastLoginAt: u.lastLoginAt,
    })),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

/* ── Categories (full CRUD) ──────────────────────────────────────────────── */

const serializeCategoryAdmin = (c) => ({
  id: c.slug,
  slug: c.slug,
  name: c.name,
  image: c.image || "",
  bgColor: c.bgColor || "",
  order: c.order ?? 0,
  isActive: c.isActive !== false,
});

export async function adminListCategories() {
  const docs = await Category.find().sort({ order: 1, name: 1 }).lean();
  // Show how many products each category holds — deleting a non-empty one is unsafe.
  const counts = await Product.aggregate([
    {
      $project: {
        allCats: { $concatArrays: [["$category"], { $ifNull: ["$extraCategories", []] }] }
      }
    },
    { $unwind: "$allCats" },
    { $group: { _id: "$allCats", count: { $sum: 1 } } }
  ]);
  const byCat = Object.fromEntries(counts.map((c) => [c._id, c.count]));
  return docs.map((c) => ({ ...serializeCategoryAdmin(c), productCount: byCat[c.slug] ?? 0 }));
}

export async function adminCreateCategory(data) {
  if (!data.name || !data.slug) throw badRequest("A name and slug are required.");
  if (await Category.exists({ slug: data.slug })) {
    throw badRequest("A category with that slug already exists.");
  }
  const last = await Category.findOne().sort({ order: -1 }).select("order").lean();
  const doc = await Category.create({ ...data, order: data.order ?? (last?.order ?? -1) + 1 });
  cacheClear();
  return serializeCategoryAdmin(doc.toObject());
}

export async function adminUpdateCategory(oldSlug, data) {
  const existing = await Category.findOne({ slug: oldSlug });
  if (!existing) throw notFound("Category not found.");
 
  // Replaced tile image → drop the old object from R2.
  if (data.image && existing.image && data.image !== existing.image) {
    await deleteByUrl(existing.image).catch(() => {});
  }
 
  const newSlug = data.slug ? String(data.slug).trim() : oldSlug;
  if (newSlug !== oldSlug) {
    const duplicate = await Category.findOne({ slug: newSlug });
    if (duplicate) throw badRequest("A category with that new slug already exists.");
  }
 
  const safe = {
    name: data.name,
    image: data.image,
    slug: newSlug,
    isActive: data.isActive ?? existing.isActive,
    order: data.order ?? existing.order,
  };
 
  const doc = await Category.findOneAndUpdate({ slug: oldSlug }, { $set: safe }, { new: true }).lean();
 
  // If slug changed, update all products referencing the old category slug to keep them in sync
  if (newSlug !== oldSlug) {
    await Product.updateMany({ category: oldSlug }, { $set: { category: newSlug } });
    await Product.updateMany(
      { extraCategories: oldSlug },
      { $set: { "extraCategories.$[elem]": newSlug } },
      { arrayFilters: [{ elem: oldSlug }] }
    );
  }
 
  cacheClear();
  return serializeCategoryAdmin(doc);
}

export async function adminDeleteCategory(slug) {
  const doc = await Category.findOne({ slug });
  if (!doc) throw notFound("Category not found.");

  // Refuse to orphan products — the storefront filters by category slug.
  const inUse = await Product.countDocuments({
    $or: [{ category: slug }, { extraCategories: slug }]
  });
  if (inUse > 0) {
    throw badRequest(
      `Can't delete "${doc.name}" — ${inUse} product${inUse === 1 ? " is" : "s are"} still in it. Move or delete them first.`
    );
  }

  if (doc.image) await deleteByUrl(doc.image).catch(() => {});
  await Category.deleteOne({ slug });
  cacheClear();
  return { deleted: true, slug };
}

/* ── Blogs (full CRUD) ───────────────────────────────────────────────────── */

export async function adminListBlogs({ search, page = 1, limit = 20 } = {}) {
  const filter = {};
  if (search) {
    const rx = new RegExp(String(search).replace(/[.*+?^${}()|[\]\\]/g, "\\$&"), "i");
    filter.$or = [{ title: rx }, { slug: rx }];
  }

  const [docs, total] = await Promise.all([
    Blog.find(filter).sort({ numericId: -1 }).skip((page - 1) * limit).limit(limit).lean(),
    Blog.countDocuments(filter),
  ]);

  return {
    items: docs.map(serializeBlog),
    meta: { page, limit, total, totalPages: Math.max(1, Math.ceil(total / limit)) },
  };
}

export async function adminCreateBlog(data) {
  if (!data.title || !data.slug) throw badRequest("A title and slug are required.");
  if (await Blog.exists({ slug: data.slug })) {
    throw badRequest("An article with that slug already exists.");
  }
  const highest = await Blog.findOne().sort({ numericId: -1 }).select("numericId").lean();
  const doc = await Blog.create({ ...data, numericId: (highest?.numericId ?? 0) + 1 });
  cacheClear();
  return serializeBlog(doc.toObject());
}

export async function adminUpdateBlog(numericId, data) {
  const existing = await Blog.findOne({ numericId: Number(numericId) });
  if (!existing) throw notFound("Article not found.");

  if (data.image && existing.image && data.image !== existing.image) {
    await deleteByUrl(existing.image).catch(() => {});
  }

  const { numericId: _ignore, ...safe } = data;
  const doc = await Blog.findOneAndUpdate(
    { numericId: Number(numericId) },
    { $set: safe },
    { new: true }
  ).lean();
  cacheClear();
  return serializeBlog(doc);
}

export async function adminDeleteBlog(numericId) {
  const doc = await Blog.findOne({ numericId: Number(numericId) });
  if (!doc) throw notFound("Article not found.");

  if (doc.image) await deleteByUrl(doc.image).catch(() => {});
  await Blog.deleteOne({ numericId: Number(numericId) });
  cacheClear();
  return { deleted: true, numericId: Number(numericId) };
}
