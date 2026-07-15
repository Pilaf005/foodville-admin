import { NextResponse } from "next/server";
import { jwtVerify } from "jose";

const COOKIE = process.env.AUTH_COOKIE_NAME || "fv_token";
const SECRET = new TextEncoder().encode(process.env.JWT_SECRET || "");

// Unprotected routes in the admin application
const PUBLIC_PATHS = ["/login", "/api/auth/request-otp", "/api/auth/verify-otp", "/api/auth/login"];

const startsWithAny = (pathname, list) =>
  list.some((p) => pathname === p || pathname.startsWith(`${p}/`));

async function readToken(req) {
  const token = req.cookies.get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, SECRET);
    return payload;
  } catch {
    return null; // expired or tampered
  }
}

const unauthorizedJson = () =>
  NextResponse.json(
    { success: false, error: { code: "UNAUTHORIZED", message: "Please sign in to continue." } },
    { status: 401 }
  );

const forbiddenJson = () =>
  NextResponse.json(
    { success: false, error: { code: "FORBIDDEN", message: "Admin access required." } },
    { status: 403 }
  );

export async function proxy(req) {
  const { pathname } = req.nextUrl;
  const isApi = pathname.startsWith("/api");

  // Allow static assets and Next internal requests
  if (
    pathname.startsWith("/_next") ||
    pathname.startsWith("/static") ||
    pathname === "/favicon.ico"
  ) {
    return NextResponse.next();
  }

  // Allow public paths (login page and auth request/verify endpoints)
  if (startsWithAny(pathname, PUBLIC_PATHS)) {
    return NextResponse.next();
  }

  const payload = await readToken(req);

  if (!payload) {
    if (isApi) return unauthorizedJson();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    url.search = `?redirect=${encodeURIComponent(pathname)}`;
    return NextResponse.redirect(url);
  }

  if (payload.role !== "admin") {
    if (isApi) return forbiddenJson();
    const url = req.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico).*)",
  ],
};
