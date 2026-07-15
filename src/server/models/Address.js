/**
 * Saved delivery address — Amazon-style fields, India only (no country field).
 * The map/coordinates flow was removed: the customer types the address.
 *
 * `label` ("Saved address at") is kept per product decision: Home/Work/Hotel/Other.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const AddressSchema = new Schema(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },

    label: { type: String, enum: ["Home", "Work", "Hotel", "Other"], default: "Home" },

    receiverName: { type: String, required: true, trim: true }, // Full name (First and Last)
    phone: { type: String, required: true, trim: true },        // Mobile number (10 digits)
    pincode: { type: String, required: true, trim: true },      // 6-digit PIN
    houseFlat: { type: String, required: true, trim: true },    // Flat, House no., Building, Company, Apartment
    area: { type: String, required: true, trim: true },         // Area, Street, Sector, Village
    landmark: { type: String, default: "", trim: true },        // E.g. near Apollo Hospital
    city: { type: String, required: true, trim: true },         // Town/City
    state: { type: String, required: true, trim: true },        // Indian state / UT

    isDefault: { type: Boolean, default: false },
  },
  { timestamps: true }
);

AddressSchema.index({ user: 1, isDefault: -1 });

const Address = mongoose.models.Address || mongoose.model("Address", AddressSchema);
export default Address;
