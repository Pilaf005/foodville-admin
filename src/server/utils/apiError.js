/**
 * Application error type carrying an HTTP status + a stable machine code.
 * Thrown anywhere in the server layer and translated to a JSON response by
 * `withRoute` / `fail` in apiResponse.js.
 */
export class AppError extends Error {
  /**
   * @param {string} message  Human-readable message (safe to show the client).
   * @param {number} status   HTTP status code (default 400).
   * @param {string} code     Stable UPPER_SNAKE machine code for the frontend.
   * @param {object} [details] Extra structured info (e.g. field errors).
   */
  constructor(message, status = 400, code = "BAD_REQUEST", details = undefined) {
    super(message);
    this.name = "AppError";
    this.status = status;
    this.code = code;
    if (details !== undefined) this.details = details;
    Error.captureStackTrace?.(this, AppError);
  }
}

// Convenience factories for the most common cases.
export const badRequest = (m = "Bad request", details) => new AppError(m, 400, "BAD_REQUEST", details);
export const unauthorized = (m = "Please sign in to continue") => new AppError(m, 401, "UNAUTHORIZED");
export const forbidden = (m = "You do not have access to this resource") => new AppError(m, 403, "FORBIDDEN");
export const notFound = (m = "Not found") => new AppError(m, 404, "NOT_FOUND");
export const conflict = (m = "Already exists", details) => new AppError(m, 409, "CONFLICT", details);
export const tooManyRequests = (m = "Too many requests, please slow down", details) =>
  new AppError(m, 429, "RATE_LIMITED", details);

export default AppError;
