import mongoose from "mongoose";

const { Schema } = mongoose;

const CouponSchema = new Schema(
  {
    code: { type: String, required: true, unique: true, uppercase: true, trim: true, index: true },
    title: { type: String, required: true },
    description: { type: String, default: "" },
    discountType: { type: String, enum: ["percentage", "flat"], default: "percentage" },
    discountValue: { type: Number, required: true }, // e.g. 10 = 10%, 50 = ₹50
    maxDiscount: { type: Number, default: null }, // e.g. 500 cap
    minSubtotal: { type: Number, default: 0 }, // minimum cart value to unlock
    firstOrderOnly: { type: Boolean, default: false },
    oncePerUser: { type: Boolean, default: false },
    showInCards: { type: Boolean, default: true },
    isActive: { type: Boolean, default: true, index: true },
    expiresAt: { type: Date, default: null }, // optional expiry date
    usageLimit: { type: Number, default: null }, // max total uses (null = unlimited)
    usageCount: { type: Number, default: 0 }, // current number of redemptions
  },
  { timestamps: true }
);

const Coupon = mongoose.models.Coupon || mongoose.model("Coupon", CouponSchema);
export default Coupon;
