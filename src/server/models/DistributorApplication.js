import mongoose from "mongoose";

const DistributorApplicationSchema = new mongoose.Schema(
  {
    applicationId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    firmName: { type: String, required: true, trim: true },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    city: { type: String, required: true, trim: true },
    state: { type: String, required: true, trim: true },
    pincode: { type: String, required: true, trim: true },
    territoryCovered: { type: String, default: "", trim: true },
    distributorType: {
      type: String,
      required: true,
      enum: [
        "area_distributor",
        "super_stockist",
        "wholesaler_stockist",
        "modern_trade_partner",
        "institutional_supplier",
      ],
      default: "area_distributor",
    },
    investmentBudget: {
      type: String,
      default: "Flexible / As Per Territory",
    },
    godownSpace: {
      type: String,
      enum: ["below_500", "500_1500", "1500_3000", "3000_plus"],
      default: "500_1500",
    },
    vehiclesCount: { type: String, default: "1-2" },
    salesTeamSize: { type: String, default: "1-3" },
    existingBrands: { type: String, default: "" },
    yearsInBusiness: { type: String, default: "1-3 years" },
    companyGstin: { type: String, default: "", trim: true },
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

const DistributorApplication =
  mongoose.models.DistributorApplication ||
  mongoose.model("DistributorApplication", DistributorApplicationSchema);

export default DistributorApplication;
