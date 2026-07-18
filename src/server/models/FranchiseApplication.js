import mongoose from "mongoose";

const FranchiseApplicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    investmentBudget: {
      type: String,
      required: true,
      enum: ["5L - 10L", "10L - 25L", "25L - 50L", "50L+"],
    },
    propertyStatus: {
      type: String,
      enum: ["owned", "rented", "looking_for_space"],
      default: "looking_for_space",
    },
    experience: { type: String, default: "" },
    companyName: { type: String, default: "" },
    companyGstin: { type: String, default: "" },
    notes: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "contacted", "under_review", "approved", "rejected"],
      default: "pending",
      index: true,
    },
    internalNotes: { type: String, default: "" },
  },
  { timestamps: true }
);

const FranchiseApplication =
  mongoose.models.FranchiseApplication ||
  mongoose.model("FranchiseApplication", FranchiseApplicationSchema);

export default FranchiseApplication;
