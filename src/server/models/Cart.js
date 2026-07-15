/**
 * Server-side cart for a signed-in user (one per user).
 * Guests keep their cart in localStorage; it is merged into this on login.
 * Only productId/qty/unit are stored — price is always re-read from the
 * catalog at read/checkout time so a stale client can't dictate the price.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const CartItemSchema = new Schema(
  {
    productId: { type: Number, required: true }, // Product.numericId
    qty: { type: Number, required: true, min: 1, default: 1 },
    unit: { type: String, default: "" }, // selected variant label
  },
  { _id: false }
);

const CartSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    items: { type: [CartItemSchema], default: [] },
  },
  { timestamps: true }
);

const Cart = mongoose.models.Cart || mongoose.model("Cart", CartSchema);
export default Cart;
