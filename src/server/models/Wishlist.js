import mongoose from "mongoose";

const { Schema } = mongoose;

const WishlistSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    productIds: { type: [Number], default: [] }, // Product.numericId
  },
  { timestamps: true }
);

const Wishlist = mongoose.models.Wishlist || mongoose.model("Wishlist", WishlistSchema);
export default Wishlist;
