/**
 * One-time passcode for email login.
 *
 * The code is NEVER stored in plaintext — only an HMAC (peppered with
 * OTP_SECRET). Documents self-destruct via a TTL index on `expiresAt`.
 * `lastSentAt` powers the resend cooldown, and `attempts` blocks brute force.
 * These live in the DB (not memory) so the limits hold across serverless
 * instances.
 */
import mongoose from "mongoose";

const { Schema } = mongoose;

const OtpSchema = new Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true, index: true },
    codeHash: { type: String, required: true },
    expiresAt: { type: Date, required: true },
    attempts: { type: Number, default: 0 },
    lastSentAt: { type: Date, default: Date.now },
    consumed: { type: Boolean, default: false },
  },
  { timestamps: true }
);

// Auto-purge expired codes.
OtpSchema.index({ expiresAt: 1 }, { expireAfterSeconds: 0 });
OtpSchema.index({ email: 1, consumed: 1 });

const Otp = mongoose.models.Otp || mongoose.model("Otp", OtpSchema);
export default Otp;
