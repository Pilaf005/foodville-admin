/**
 * Passwordless OTP auth.
 *
 * requestOtp()  → upserts the user as `pending` (LEAD CAPTURE: we keep the email
 *                 even if they abandon before verifying), then issues a code.
 *                 A returning visitor with an unverified code hits the resend
 *                 cooldown instead of spamming a new one.
 * verifyOtp()   → validates the code, flips the user to `active` (creating the
 *                 account on first success), grants admin if the email is in
 *                 ADMIN_EMAILS, and returns a signed JWT.
 */
import User from "@/server/models/User";
import Otp from "@/server/models/Otp";
import { env } from "@/server/config/env";
import { badRequest, tooManyRequests, unauthorized } from "@/server/utils/apiError";
import { generateOtp, hashOtp, safeEqual } from "@/server/services/otp.service";
import { sendOtpEmail } from "@/server/services/email.service";
import { signAuthToken } from "@/server/services/token.service";

export function serializeUser(u) {
  if (!u) return null;
  return {
    id: String(u._id),
    email: u.email,
    status: u.status,
    role: u.role,
    fullName: u.fullName || "",
    phone: u.phone || "",
    gender: u.gender,
    dateOfBirth: u.dateOfBirth || "",
    language: u.language,
    // Our own bundled SVG (drawn in-house, no copyright concerns) so new users
    // never see an empty avatar container.
    avatarUrl: u.avatarUrl || "/images/default-avatar.svg",
    isVerified: !!u.isVerified,
    memberSince: u.createdAt
      ? new Date(u.createdAt).toLocaleDateString("en-IN", { month: "long", year: "numeric" })
      : "",
  };
}

export async function requestOtp(email) {
  const now = new Date();

  // ── LEAD CAPTURE ──────────────────────────────────────────────────────────
  // Create/record the user the instant they submit their email, before any
  // verification. If they close the tab now, we still have them as "pending".
  const user = await User.findOneAndUpdate(
    { email },
    { $setOnInsert: { email, status: "pending" }, $set: { otpRequestedAt: now } },
    { upsert: true, new: true, setDefaultsOnInsert: true }
  );

  // Returning visitor who asked for a code but never verified → cooldown.
  const existing = await Otp.findOne({ email, consumed: false, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (existing) {
    const elapsed = (now.getTime() - new Date(existing.lastSentAt).getTime()) / 1000;
    const wait = Math.ceil(env.otpResendCooldownSeconds - elapsed);
    if (wait > 0) {
      throw tooManyRequests(`Please wait ${wait}s before requesting another code.`, { retryAfter: wait });
    }
  }

  // ── DURABLE QUOTA ─────────────────────────────────────────────────────────
  // Max N codes per email per rolling window. Stored on the user (not memory),
  // so it can't be bypassed by hitting a different serverless instance.
  const windowMs = env.otpWindowMinutes * 60 * 1000;
  const windowStart = user.otpWindowStartedAt ? new Date(user.otpWindowStartedAt).getTime() : 0;
  const windowExpired = now.getTime() - windowStart > windowMs;

  const usedThisWindow = windowExpired ? 0 : user.otpRequestCount || 0;
  if (usedThisWindow >= env.otpMaxPerWindow) {
    const retryAfter = Math.ceil((windowStart + windowMs - now.getTime()) / 1000);
    throw tooManyRequests(
      `You've requested too many codes. Please try again in ${Math.ceil(retryAfter / 60)} minute(s).`,
      { retryAfter }
    );
  }

  await User.updateOne(
    { _id: user._id },
    windowExpired
      ? { $set: { otpRequestCount: 1, otpWindowStartedAt: now } }
      : { $inc: { otpRequestCount: 1 }, $setOnInsert: {} }
  );

  const code = generateOtp();
  const expiresAt = new Date(now.getTime() + env.otpExpMinutes * 60 * 1000);

  // Only one live code per email.
  await Otp.deleteMany({ email, consumed: false });
  await Otp.create({ email, codeHash: hashOtp(code), expiresAt, lastSentAt: now, attempts: 0 });

  const delivery = await sendOtpEmail({ to: email, code, expiresInMinutes: env.otpExpMinutes });

  return {
    email,
    isNewUser: user.status === "pending",
    expiresInMinutes: env.otpExpMinutes,
    resendInSeconds: env.otpResendCooldownSeconds,
    // Never leak the code in production — dev/console mode only.
    ...(delivery?.dev && !env.isProd ? { devCode: code } : {}),
  };
}

export async function verifyOtp(email, code) {
  const now = new Date();

  const otp = await Otp.findOne({ email, consumed: false, expiresAt: { $gt: now } }).sort({ createdAt: -1 });
  if (!otp) throw badRequest("Your code has expired. Please request a new one.");

  if (otp.attempts >= env.otpMaxAttempts) {
    await Otp.deleteMany({ email, consumed: false });
    throw tooManyRequests("Too many incorrect attempts. Please request a new code.");
  }

  if (!safeEqual(hashOtp(code), otp.codeHash)) {
    otp.attempts += 1;
    await otp.save();
    const left = Math.max(0, env.otpMaxAttempts - otp.attempts);
    throw badRequest(
      left > 0
        ? `Incorrect code. ${left} attempt${left === 1 ? "" : "s"} remaining.`
        : "Incorrect code. Please request a new one."
    );
  }

  otp.consumed = true;
  await otp.save();

  const isAdmin = env.adminEmails.includes(String(email).toLowerCase());
  const user = await User.findOneAndUpdate(
    { email },
    {
      $set: {
        status: "active", // account is created/activated here
        isVerified: true,
        lastLoginAt: now,
        role: isAdmin ? "admin" : "user",
        otpRequestCount: 0, // clear the quota once they're through
      },
      $setOnInsert: { email },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  const token = await signAuthToken({ userId: user._id, email: user.email, role: user.role });
  return { user: serializeUser(user), token };
}

export async function getMe(userId) {
  const user = await User.findById(userId).lean();
  if (!user) throw unauthorized("Your session has expired. Please sign in again.");
  return serializeUser(user);
}

export async function loginWithPassword(email, password) {
  const cleanEmail = String(email).trim().toLowerCase();
  
  // 1. Enforce that only authorized admin emails can log in
  const isAdmin = env.adminEmails.includes(cleanEmail);
  if (!isAdmin) {
    throw unauthorized("Access denied: You must be an authorized admin to sign in.");
  }

  // 2. Validate password
  if (password !== env.adminPassword) {
    throw unauthorized("Invalid email or password.");
  }

  // 3. Upsert admin record in the database
  const now = new Date();
  const user = await User.findOneAndUpdate(
    { email: cleanEmail },
    {
      $set: {
        status: "active",
        isVerified: true,
        lastLoginAt: now,
        role: "admin",
      },
      $setOnInsert: { email: cleanEmail },
    },
    { new: true, upsert: true, setDefaultsOnInsert: true }
  );

  // 4. Issue session token
  const token = await signAuthToken({ userId: user._id, email: user.email, role: user.role });
  return { user: serializeUser(user), token };
}
