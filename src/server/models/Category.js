/**
 * Category model. `slug` is the canonical id used across the UI ("powders",
 * "seasoning", ...). `image`/`bgColor` power the home category cards.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const CategorySchema = new Schema(
  {
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    name: { type: String, required: true, trim: true },
    image: { type: String, default: "" },
    bgColor: { type: String, default: "" }, // tailwind class used by home cards
    order: { type: Number, default: 0, index: true },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

const Category = mongoose.models.Category || mongoose.model("Category", CategorySchema);
export default Category;
