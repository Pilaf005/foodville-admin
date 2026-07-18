/**
 * Order.
 *
 * Items and the delivery address are stored as SNAPSHOTS: if a product's price
 * or the customer's address changes tomorrow, the order still shows what was
 * actually bought and where it was sent. Money is stored in whole rupees.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

export const ORDER_STATUSES = [
  "pending",
  "placed",
  "confirmed",
  "packed",
  "shipped",
  "out_for_delivery",
  "delivered",
  "cancelled",
];

export const PAYMENT_STATUSES = ["pending", "paid", "failed", "refunded"];
export const PAYMENT_METHODS = ["cod", "razorpay"];

const OrderItemSchema = new Schema(
  {
    productId: { type: Number, required: true },
    slug: { type: String, default: "" },
    name: { type: String, required: true },
    image: { type: String, default: "" },
    unit: { type: String, default: "" },
    price: { type: Number, required: true }, // paid price per unit
    mrp: { type: Number },
    qty: { type: Number, required: true, min: 1 },
  },
  { _id: false }
);

const AddressSnapshotSchema = new Schema(
  {
    label: String,
    receiverName: String,
    phone: String,
    houseFlat: String,
    area: String, // Area, Street, Sector, Village
    landmark: String,
    city: String,
    state: String,
    pincode: String,
  },
  { _id: false }
);

const TimelineEntrySchema = new Schema(
  {
    status: { type: String, enum: ORDER_STATUSES, required: true },
    at: { type: Date, default: Date.now },
    note: { type: String, default: "" },
  },
  { _id: false }
);

const OrderSchema = new Schema(
  {
    orderId: { type: String, required: true, unique: true, index: true }, // e.g. FV100023
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    items: { type: [OrderItemSchema], required: true },

    amounts: {
      subtotal: { type: Number, required: true },
      savings: { type: Number, default: 0 },
      baseDeliveryCharge: { type: Number, default: 0 },
      codCharge: { type: Number, default: 0 },
      gst: { type: Number, default: 0 },
      deliveryCharge: { type: Number, default: 0 },
      total: { type: Number, required: true },
    },

    address: { type: AddressSnapshotSchema, required: true },

    paymentMethod: { type: String, enum: PAYMENT_METHODS, required: true },
    paymentStatus: { type: String, enum: PAYMENT_STATUSES, default: "pending", index: true },

    razorpay: {
      orderId: { type: String, index: true },
      paymentId: { type: String },
      signature: { type: String },
    },

    status: { type: String, enum: ORDER_STATUSES, default: "pending", index: true },
    timeline: { type: [TimelineEntrySchema], default: [] },

    shipping: {
      deliveryMethod: { type: String, enum: ["shiprocket", "local"], default: "shiprocket" },
      localDelivery: {
        deliveryBoyName: { type: String, default: "" },
        deliveryBoyPhone: { type: String, default: "" },
      },
      shiprocketOrderId: { type: String },
      shiprocketShipmentId: { type: String },
      awbCode: { type: String, index: true },
      courierName: { type: String },
      labelUrl: { type: String },
      manifestUrl: { type: String },
      weight: { type: Number },
      dimensions: {
        length: { type: Number },
        width: { type: Number },
        height: { type: Number }
      }
    },

    isDraft: { type: Boolean, default: false, index: true },
    placedAt: { type: Date, default: Date.now, index: true },
  },
  { timestamps: true }
);

OrderSchema.index({ user: 1, placedAt: -1 });

const Order = mongoose.models.Order || mongoose.model("Order", OrderSchema);
export default Order;
