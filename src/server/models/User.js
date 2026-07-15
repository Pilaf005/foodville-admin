/**
 * User — passwordless (OTP email login).
 *
 * `status: "pending"` is the LEAD-CAPTURE state: the record is created the
 * moment someone submits their email and hits Next, before they verify. So an
 * abandoned signup still leaves us their email, and a returning visitor is
 * recognised as "requested a code but never verified".
 * `status: "active"` is set on the first successful OTP verification.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const UserSchema = new Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, index: true },
    status: { type: String, enum: ["pending", "active"], default: "pending", index: true },
    role: { type: String, enum: ["user", "admin"], default: "user", index: true },

    fullName: { type: String, default: "" },
    phone: { type: String, default: "" },
    gender: { type: String, enum: ["male", "female", "other", "prefer_not_to_say"], default: "prefer_not_to_say" },
    dateOfBirth: { type: String, default: "" },
    language: { type: String, default: "English" },
    avatarUrl: { type: String, default: "" },
    isVerified: { type: Boolean, default: false },


    otpRequestedAt: { type: Date }, // when they last asked for a code (lead capture)
    // Durable OTP request quota (survives serverless restarts, unlike memory).
    otpRequestCount: { type: Number, default: 0 },
    otpWindowStartedAt: { type: Date },
    lastLoginAt: { type: Date },
  },
  { timestamps: true, minimize: false }
);

const User = mongoose.models.User || mongoose.model("User", UserSchema);
export default User;
