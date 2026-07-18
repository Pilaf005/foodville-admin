import { AppError } from "@/server/utils/apiError";

function requireVar(name, fallback) {
  const value = process.env[name] ?? fallback;
  if (!value) {
    throw new AppError(
      500,
      `Missing required environment variable: ${name}. Set it in .env or your hosting control panel.`,
      "MISSING_ENV"
    );
  }
  return value;
}

function parseBool(val, fallback = false) {
  if (val === undefined || val === null || val === "") return fallback;
  return String(val).toLowerCase() === "true" || val === "1";
}

function parseIntVar(val, fallback) {
  const n = parseInt(val, 10);
  return Number.isNaN(n) ? fallback : n;
}

function parseCsv(val, fallback = []) {
  if (!val) return fallback;
  return String(val)
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
}

class EnvConfig {
  constructor() {
    this._cache = null;
  }

  get all() {
    if (!this._cache) {
      this._cache = {
        // App
        siteUrl: process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3001",
        isProd: process.env.NODE_ENV === "production",
        isDev: process.env.NODE_ENV !== "production",

        // Database
        mongoUri: requireVar("MONGODB_URI"),
        mongoDb: process.env.MONGODB_DB || "foodville",

        // Auth / JWT
        jwtSecret: requireVar("JWT_SECRET"),
        jwtExpiresIn: process.env.JWT_EXPIRES_IN || "2d",
        authCookieName: process.env.AUTH_COOKIE_NAME || "fv_token",

        // OTP
        otpSecret: requireVar("OTP_SECRET"),
        otpExpMinutes: parseIntVar(process.env.OTP_EXP_MINUTES, 10),
        otpResendCooldownSeconds: parseIntVar(process.env.OTP_RESEND_COOLDOWN_SECONDS, 120),
        otpMaxAttempts: parseIntVar(process.env.OTP_MAX_ATTEMPTS, 5),
        otpMaxPerWindow: parseIntVar(process.env.OTP_MAX_PER_WINDOW, 5),
        otpWindowMinutes: parseIntVar(process.env.OTP_WINDOW_MINUTES, 60),
        otpLength: parseIntVar(process.env.OTP_LENGTH, 6),

        // Admin ACL
        adminEmails: parseCsv(process.env.ADMIN_EMAILS, ["piccolo@viremail.com"]),
        adminPassword: process.env.ADMIN_PASSWORD || "admin@foodville123",

        // Storage / Cloudflare R2
        r2: {
          endpoint: process.env.R2_ENDPOINT,
          accessKeyId: process.env.R2_ACCESS_KEY_ID,
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY,
          bucket: process.env.R2_BUCKET || "foodville",
          region: process.env.R2_REGION || "auto",
          publicBaseUrl: process.env.R2_PUBLIC_BASE_URL,
        },

        // Email / SMTP
        emailDevMode: parseBool(process.env.EMAIL_DEV_MODE, false),
        smtp: {
          host: process.env.SMTP_HOST,
          port: parseIntVar(process.env.SMTP_PORT, 587),
          secure: parseBool(process.env.SMTP_SECURE, false),
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS,
          from: process.env.SMTP_FROM || "Foodville Admin <no-reply@foodville.in>",
        },

        // Shiprocket
        shiprocket: {
          email: process.env.SHIPROCKET_EMAIL || "",
          password: process.env.SHIPROCKET_PASSWORD || "",
          pickupLocation: process.env.SHIPROCKET_PICKUP_LOCATION || "",
          pickupPostcode: process.env.SHIPROCKET_PICKUP_POSTCODE || "122098",
        },
      };
    }
    return this._cache;
  }

  get mongoUri() { return this.all.mongoUri; }
  get mongoDb() { return this.all.mongoDb; }
  get jwtSecret() { return this.all.jwtSecret; }
  get jwtExpiresIn() { return this.all.jwtExpiresIn; }
  get authCookieName() { return this.all.authCookieName; }
  get otpSecret() { return this.all.otpSecret; }
  get otpExpMinutes() { return this.all.otpExpMinutes; }
  get otpResendCooldownSeconds() { return this.all.otpResendCooldownSeconds; }
  get otpMaxAttempts() { return this.all.otpMaxAttempts; }
  get otpMaxPerWindow() { return this.all.otpMaxPerWindow; }
  get otpWindowMinutes() { return this.all.otpWindowMinutes; }
  get otpLength() { return this.all.otpLength; }
  get adminEmails() { return this.all.adminEmails; }
  get adminPassword() { return this.all.adminPassword; }
  get r2() { return this.all.r2; }
  get smtp() { return this.all.smtp; }
  get emailDevMode() { return this.all.emailDevMode; }
  get isProd() { return this.all.isProd; }
  get isDev() { return this.all.isDev; }
  get siteUrl() { return this.all.siteUrl; }
  get shiprocket() { return this.all.shiprocket; }
}

export const env = new EnvConfig();
export default env;
