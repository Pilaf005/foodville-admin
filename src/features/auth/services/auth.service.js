import api, { unwrap } from "@/lib/api";

export const authService = {
  /** Step 1 — submit email. Creates the lead + emails a code. */
  async requestOtp(email) {
    return unwrap(await api.post("/auth/request-otp", { email }));
  },

  /** Step 2 — submit the code. Sets the httpOnly auth cookie on success. */
  async verifyOtp({ email, code }) {
    return unwrap(await api.post("/auth/verify-otp", { email, code }));
  },

  async loginWithPassword({ email, password }) {
    return unwrap(await api.post("/auth/login", { email, password }));
  },

  /** Current user, or null when signed out. */
  async getCurrentUser() {
    try {
      return await unwrap(await api.get("/auth/me"));
    } catch (err) {
      if (err?.status === 401) return null;
      throw err;
    }
  },

  async logout() {
    return unwrap(await api.post("/auth/logout"));
  },
};

export default authService;
