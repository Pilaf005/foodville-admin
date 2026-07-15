/**
 * Transactional email via Nodemailer/SMTP (Gmail).
 *
 * Behaviour:
 *  - EMAIL_DEV_MODE=true (or no SMTP_HOST): the code is printed to the server
 *    console instead of emailed — handy for local testing.
 *  - Otherwise it sends for real. If sending fails outside production we fall
 *    back to logging the code so local development is never blocked; in
 *    production a failure is surfaced as a proper error.
 */
import nodemailer from "nodemailer";
import { env } from "@/server/config/env";
import { AppError } from "@/server/utils/apiError";

let transporter = null;

function getTransporter() {
  if (transporter) return transporter;
  if (!env.smtp.host) return null;
  transporter = nodemailer.createTransport({
    host: env.smtp.host,
    port: env.smtp.port,
    secure: env.smtp.secure, // true => 465, false => 587 (STARTTLS)
    auth: env.smtp.user ? { user: env.smtp.user, pass: env.smtp.pass } : undefined,
  });
  return transporter;
}

function logCode(to, code, why) {
  // eslint-disable-next-line no-console
  console.log(
    `\n──────────────────────────────────────────\n📧  OTP for ${to}: ${code}   (${why})\n──────────────────────────────────────────\n`
  );
}

function otpEmailHtml(code, minutes) {
  return `
  <div style="font-family:Inter,system-ui,sans-serif;background:#FAF7F2;padding:32px">
    <div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #EDE6D9;border-radius:16px;padding:32px">
      <h1 style="margin:0 0 8px;font-size:20px;color:#2E2A26">Your Foodville code</h1>
      <p style="margin:0 0 24px;font-size:14px;color:#8A8275">
        Use the code below to sign in. It expires in ${minutes} minutes.
      </p>
      <div style="text-align:center;margin:24px 0">
        <span style="display:inline-block;font-size:32px;font-weight:700;letter-spacing:10px;
                     color:#6B7F59;background:#FAF7F2;border:1px solid #EDE6D9;
                     border-radius:12px;padding:16px 24px">${code}</span>
      </div>
      <p style="margin:24px 0 0;font-size:12px;color:#A39E93">
        If you didn't request this, you can safely ignore this email — nobody can access your account without the code.
      </p>
    </div>
  </div>`;
}

export async function sendOtpEmail({ to, code, expiresInMinutes }) {
  // Dev/console mode
  if (env.emailDevMode || !env.smtp.host) {
    logCode(to, code, "EMAIL_DEV_MODE — not emailed");
    return { delivered: false, dev: true };
  }

  try {
    const t = getTransporter();
    await t.sendMail({
      from: env.smtp.from,
      to,
      subject: `${code} is your Foodville verification code`,
      text: `Your Foodville verification code is ${code}. It expires in ${expiresInMinutes} minutes.`,
      html: otpEmailHtml(code, expiresInMinutes),
    });
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] SMTP send failed:", err?.message);
    if (!env.isProd) {
      logCode(to, code, "SMTP failed — dev fallback");
      return { delivered: false, dev: true };
    }
    throw new AppError(
      "We couldn't send the verification email. Please try again in a moment.",
      502,
      "EMAIL_SEND_FAILED"
    );
  }
}
