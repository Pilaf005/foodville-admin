/**
 * Product model — polymorphic across three shapes that share one collection:
 *   - "standard" (powders/seasoning/seeds/dryfruits/wellness): brand/gtin/packaging + shopBy
 *   - "bulk": units carry perUnit/savings
 *   - "combos": comboIncludes[] + a combo-specific highlights key set
 *
 * The schema keeps every field the finalized UI reads (exact names preserved).
 * `highlights` is Mixed to allow the differing key sets without data loss.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

export const PRODUCT_CATEGORIES = [
  "powders",
  "seasoning",
  "seeds",
  "dryfruits",
  "wellness",
  "combos",
  "bulk",
];

export const SHOP_BY_VALUES = ["bestseller", "trending", "newlyIn", "valueBuys"];

const UnitSchema = new Schema(
  {
    unit: { type: String, required: true }, // "100g", "Pack of 2", "Pack of 2 (250g each)"
    price: { type: Number, required: true },
    mrp: { type: Number },
    // standard-only
    gtin: { type: String },
    packaging: { type: String },
    // bulk-only
    perUnit: { type: Number },
    savings: { type: Number },
  },
  { _id: false }
);

// NOTE: this store has no customer reviews. `rating` below is a static catalog
// value used for display and for sorting (top sellers / "rating" sort) — it is
// not computed from user feedback.

const ComboIncludeSchema = new Schema(
  {
    name: { type: String, required: true },
    qty: { type: String, default: "" }, // string in the data ("1 unit")
    isFree: { type: Boolean, default: false },
  },
  { _id: false }
);

const ProductSchema = new Schema(
  {
    // Original numeric id from products.js — UI routes/lookups use this + slug.
    numericId: { type: Number, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },

    category: { type: String, required: true, enum: PRODUCT_CATEGORIES, index: true },
    extraCategories: { type: [String], default: [], index: true },
    shopBy: { type: String, enum: SHOP_BY_VALUES, index: true }, // absent on combos/bulk

    unit: { type: String, default: "" }, // default/selected unit label
    price: { type: Number, required: true, index: true },
    mrp: { type: Number },

    image: { type: String, default: "" }, // card thumbnail
    images: { type: [String], default: [] }, // gallery
    video: { type: String, default: "" }, // primary product video clip
    videos: { type: [String], default: [] }, // gallery video clips
    description: { type: String, default: "" },
    details: { type: String, default: "" },

    stock: { type: Number, default: 0 },
    rating: { type: Number, default: 0, index: true },
    tags: { type: [String], default: [], index: true },

    highlights: { type: Schema.Types.Mixed, default: {} }, // varying key set per product type
    units: { type: [UnitSchema], default: [] },

    // combo-only
    comboIncludes: { type: [ComboIncludeSchema], default: undefined },

    // standard-only top-level
    brand: { type: String },
    gtin: { type: String },
    packaging: { type: String },

    // admin / lifecycle
    isActive: { type: Boolean, default: true, index: true },
  },
  {
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true },
    minimize: false, // keep empty highlights object
  }
);

// Text index powering search across name / description / tags.
ProductSchema.index({ name: "text", description: "text", tags: "text" });
// Common sort/filter combos.
ProductSchema.index({ category: 1, price: 1 });
ProductSchema.index({ shopBy: 1, rating: -1 });

// Expose a stable `id` (numericId) to the client so the UI keeps working.
ProductSchema.virtual("id").get(function () {
  return this.numericId;
});

if (process.env.NODE_ENV === "development" && mongoose.models.Product) {
  delete mongoose.models.Product;
}
const Product = mongoose.models.Product || mongoose.model("Product", ProductSchema);
export default Product;
