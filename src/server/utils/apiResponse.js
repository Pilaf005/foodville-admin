/**
 * Consistent JSON envelope + a route wrapper for Next.js Route Handlers.
 *
 * Success:  { success: true,  data, meta? }
 * Failure:  { success: false, error: { code, message, details? } }
 *
 * Every API route is wrapped with `withRoute()` which:
 *   - ensures the DB is connected,
 *   - runs the handler,
 *   - converts thrown AppError / ZodError / Mongoose errors into clean responses,
 *   - never leaks stack traces to the client.
 */
import { NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "@/server/utils/apiError";
import { connectDB } from "@/server/db/mongoose";
import { env } from "@/server/config/env";

export function ok(data, { meta, status = 200, headers } = {}) {
  return NextResponse.json(
    { success: true, data, ...(meta ? { meta } : {}) },
    { status, headers }
  );
}

export function created(data, opts = {}) {
  return ok(data, { ...opts, status: 201 });
}

export function noContent() {
  return new NextResponse(null, { status: 204 });
}

export function fail(error) {
  const payload = normalizeError(error);
  if (!env.isProd && payload._log) {
    // Server-side visibility during development.
    console.error("[api-error]", payload._log);
  }
  delete payload._log;
  return NextResponse.json({ success: false, error: payload.error }, { status: payload.status });
}

function normalizeError(error) {
  // Zod validation errors -> 422 with field details
  if (error instanceof ZodError) {
    return {
      status: 422,
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details: error.issues.map((i) => ({ path: i.path.join("."), message: i.message })),
      },
    };
  }

  // Our own typed errors
  if (error instanceof AppError) {
    return {
      status: error.status,
      error: { code: error.code, message: error.message, ...(error.details ? { details: error.details } : {}) },
    };
  }

  // Mongoose duplicate key
  if (error?.code === 11000) {
    const field = Object.keys(error.keyPattern || {})[0] || "field";
    return {
      status: 409,
      error: { code: "DUPLICATE", message: `That ${field} already exists.`, details: { field } },
    };
  }

  // Mongoose validation
  if (error?.name === "ValidationError") {
    return {
      status: 422,
      error: {
        code: "VALIDATION_ERROR",
        message: "Some fields are invalid.",
        details: Object.values(error.errors || {}).map((e) => ({ path: e.path, message: e.message })),
      },
    };
  }

  // Fallback — never leak internals
  return {
    status: 500,
    error: { code: "INTERNAL_ERROR", message: "Something went wrong. Please try again." },
    _log: error?.stack || error?.message || error,
  };
}

/**
 * Wrap a Route Handler: connects the DB, runs it, and funnels all errors
 * through `fail()`. Usage:
 *   export const GET = withRoute(async (req, ctx) => ok(await something()));
 */
export function withRoute(handler) {
  return async (req, ctx) => {
    try {
      await connectDB();
      return await handler(req, ctx);
    } catch (error) {
      return fail(error);
    }
  };
}

export default { ok, created, noContent, fail, withRoute };
