import mongoose from "mongoose";

const GlobalExportInquirySchema = new mongoose.Schema(
  {
    inquiryId: { type: String, required: true, unique: true, index: true },
    fullName: { type: String, required: true, trim: true },
    companyName: { type: String, required: true, trim: true },
    country: { type: String, required: true, trim: true },
    destinationPort: { type: String, trim: true, default: "" },
    email: { type: String, required: true, lowercase: true, trim: true },
    phone: { type: String, required: true, trim: true },
    productInterest: { type: [String], default: [] },
    quantity: { type: String, required: true, trim: true },
    incoterms: {
      type: String,
      enum: ["FOB", "CIF", "CFR", "DDP", "EXW", "Other"],
      default: "FOB",
    },
    customPackaging: { type: Boolean, default: false },
    message: { type: String, default: "" },
    status: {
      type: String,
      enum: ["pending", "contacted", "quoted", "contract_signed", "closed"],
      default: "pending",
      index: true,
    },
    internalNotes: { type: String, default: "" },
    lastContactedAt: { type: Date },
    emailHistory: [
      {
        subject: { type: String, required: true },
        message: { type: String, required: true },
        quotationTerms: {
          priceQuote: { type: String, default: "" },
          incoterms: { type: String, default: "" },
          port: { type: String, default: "" },
          validity: { type: String, default: "" },
          paymentTerms: { type: String, default: "" },
        },
        sentAt: { type: Date, default: Date.now },
        sentBy: { type: String, default: "Admin" },
      },
    ],
  },
  { timestamps: true }
);

const GlobalExportInquiry =
  mongoose.models.GlobalExportInquiry ||
  mongoose.model("GlobalExportInquiry", GlobalExportInquirySchema);

export default GlobalExportInquiry;
