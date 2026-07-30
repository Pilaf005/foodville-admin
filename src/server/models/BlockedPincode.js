import mongoose from "mongoose";

const { Schema } = mongoose;

const BlockedPincodeSchema = new Schema(
  {
    pincode: { type: String, required: true, unique: true, trim: true, index: true },
    reason: { type: String, default: "Non-serviceable location", trim: true },
    blockType: { type: String, enum: ["ALL", "COD"], default: "ALL" }, // "ALL" blocks delivery entirely, "COD" blocks Cash on Delivery only
    isEntirePincodeBlocked: { type: Boolean, default: true },          // true = block all areas, false = block only blockedAreas
    blockedAreas: [{ type: String, trim: true }],                      // e.g. ["Okhla Industrial Estate", "Badarpur"]
    availableAreas: [{ type: String, trim: true }],                    // all fetched sub-areas under this pincode
    isActive: { type: Boolean, default: true, index: true }
  },
  { timestamps: true }
);

export default mongoose.models.BlockedPincode || mongoose.model("BlockedPincode", BlockedPincodeSchema);
