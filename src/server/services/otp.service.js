/**
 * OTP generation + constant-time verification.
 * Codes are hashed with an HMAC peppered by OTP_SECRET, so a database leak
 * never exposes usable codes.
 */
import crypto from "node:crypto";
import { env } from "@/server/config/env";

export function generateOtp(length = env.otpLength) {
  const max = 10 ** length;
  return String(crypto.randomInt(0, max)).padStart(length, "0");
}

export function hashOtp(code) {
  return crypto.createHmac("sha256", env.otpSecret).update(String(code)).digest("hex");
}

/** Timing-safe comparison (prevents leaking the code via response timing). */
export function safeEqual(a, b) {
  const bufA = Buffer.from(String(a));
  const bufB = Buffer.from(String(b));
  if (bufA.length !== bufB.length) return false;
  return crypto.timingSafeEqual(bufA, bufB);
}
