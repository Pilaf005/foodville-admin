/**
 * Blog model — "New Reads" articles. `fullContent` is an ordered list of
 * heading/paragraph blocks the article page renders in sequence.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const ContentBlockSchema = new Schema(
  {
    type: { type: String, enum: ["heading", "paragraph"], required: true },
    text: { type: String, required: true },
  },
  { _id: false }
);

const BlogSchema = new Schema(
  {
    numericId: { type: Number, required: true, unique: true, index: true },
    slug: { type: String, required: true, unique: true, index: true, lowercase: true, trim: true },
    title: { type: String, required: true, trim: true },
    category: { type: String, default: "" },
    categoryColor: { type: String, default: "" }, // tailwind classes used by the badge
    date: { type: String, default: "" }, // human string ("July 2, 2026")
    readTime: { type: String, default: "" },
    image: { type: String, default: "" },
    preview: { type: String, default: "" },
    fullContent: { type: [ContentBlockSchema], default: [] },
    isActive: { type: Boolean, default: true, index: true },
  },
  { timestamps: true }
);

BlogSchema.index({ title: "text", preview: "text" });

const Blog = mongoose.models.Blog || mongoose.model("Blog", BlogSchema);
export default Blog;
