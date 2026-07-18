import mongoose from "mongoose";

const BulkInquirySchema = new mongoose.Schema(
  {
    inquiryId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    companyName: { type: String, trim: true, default: "" },
    gstin: { type: String, trim: true, default: "" },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    productName: { type: String, required: true, trim: true },
    quantityKg: { type: Number, required: true },
    deliveryPincode: { type: String, required: true, trim: true },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "contacted", "quoted", "closed"],
      default: "pending",
      index: true,
    },
    internalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

const BulkInquiry =
  mongoose.models.BulkInquiry ||
  mongoose.model("BulkInquiry", BulkInquirySchema);

export default BulkInquiry;
