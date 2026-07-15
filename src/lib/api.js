import axios from "axios";

/**
 * Shared axios instance.
 *
 * baseURL is RELATIVE ("/api") on purpose: the API lives in this same Next app,
 * so the same build works on localhost, on foodville.vercel.app, and on any
 * future domain with no env change. `withCredentials` lets the browser send the
 * httpOnly auth cookie automatically — we never touch the JWT from JS.
 */
const api = axios.create({
  baseURL: "/api",
  withCredentials: true,
  timeout: 20000,
  headers: { "Content-Type": "application/json" },
});

// Normalise every failure into a real Error carrying the API's code/message,
// so UI code can just read `err.message` / `err.code`.
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const payload = error?.response?.data?.error;
    const err = new Error(
      payload?.message ||
        (error.code === "ECONNABORTED"
          ? "That took too long. Please try again."
          : error.message || "Something went wrong. Please try again.")
    );
    err.code = payload?.code || error.code || "NETWORK_ERROR";
    err.status = error?.response?.status;
    if (payload?.details) err.details = payload.details;
    return Promise.reject(err);
  }
);

/** Every endpoint returns { success, data, meta } — this pulls out `data`. */
export const unwrap = (response) => response?.data?.data;

/** Pulls out `meta` (pagination etc). */
export const unwrapMeta = (response) => response?.data?.meta;

export default api;
