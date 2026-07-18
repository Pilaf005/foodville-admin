/**
 * JWT signing/verification via `jose` — works in BOTH the Node runtime (route
 * handlers) and the Edge runtime (middleware), unlike `jsonwebtoken`.
 *
 * The token is delivered only as an httpOnly cookie so browser JS can never
 * read it (XSS-safe). The browser attaches it automatically because axios is
 * configured with `withCredentials: true`.
 */
import { SignJWT, jwtVerify } from "jose";
import { env } from "@/server/config/env";

const secretKey = () => new TextEncoder().encode(env.jwtSecret);

export const AUTH_COOKIE = env.authCookieName;

/** Convert "7d" / "12h" / "30m" / "3600" into seconds. */
export function expiresInSeconds(spec = env.jwtExpiresIn) {
  const m = String(spec).trim().match(/^(\d+)\s*([smhd])?$/i);
  if (!m) return 7 * 24 * 60 * 60;
  const n = Number(m[1]);
  const unit = (m[2] || "s").toLowerCase();
  const mult = { s: 1, m: 60, h: 3600, d: 86400 }[unit];
  return n * mult;
}

export async function signAuthToken({ userId, email, role }) {
  return new SignJWT({ email, role })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(String(userId))
    .setIssuedAt()
    .setExpirationTime(env.jwtExpiresIn)
    .sign(secretKey());
}

export async function verifyAuthToken(token) {
  const { payload } = await jwtVerify(token, secretKey());
  return { userId: payload.sub, email: payload.email, role: payload.role };
}

/** Cookie options — httpOnly + Secure in production + SameSite=Lax. */
export function authCookieOptions() {
  return {
    httpOnly: true,
    secure: env.isProd,
    sameSite: "strict",
    path: "/",
    maxAge: expiresInSeconds(),
  };
}

/** Attach the auth cookie to a NextResponse. */
export function setAuthCookie(res, token) {
  res.cookies.set(AUTH_COOKIE, token, authCookieOptions());
  return res;
}

/** Expire the auth cookie. */
export function clearAuthCookie(res) {
  res.cookies.set(AUTH_COOKIE, "", { ...authCookieOptions(), maxAge: 0 });
  return res;
}
