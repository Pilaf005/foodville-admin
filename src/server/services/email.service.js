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

function exportResponseEmailHtml({
  recipientName,
  inquiryId,
  companyName,
  messageText,
  quotationTerms,
}) {
  const formattedMessage = messageText
    .split("\n")
    .filter((line) => line.trim().length > 0)
    .map((line) => `<p style="margin:0 0 14px;font-size:14px;line-height:1.6;color:#374151">${line}</p>`)
    .join("");

  const hasQuote =
    quotationTerms &&
    (quotationTerms.priceQuote ||
      quotationTerms.incoterms ||
      quotationTerms.port ||
      quotationTerms.validity ||
      quotationTerms.paymentTerms);

  const quoteHtml = hasQuote
    ? `
    <div style="background:#F4F6F1;border:1px solid #DCE4D6;border-radius:12px;padding:20px;margin:24px 0">
      <h3 style="margin:0 0 12px;font-size:14px;font-weight:700;color:#56684A;text-transform:uppercase;letter-spacing:0.5px">
        Commercial Quotation & Trade Terms
      </h3>
      <table style="width:100%;border-collapse:collapse;font-size:13px;color:#374151">
        ${
          quotationTerms.priceQuote
            ? `<tr><td style="padding:6px 0;font-weight:600;width:40%;color:#4B5563">Unit Price / Rate:</td><td style="padding:6px 0;font-weight:700;color:#1F2937">${quotationTerms.priceQuote}</td></tr>`
            : ""
        }
        ${
          quotationTerms.incoterms
            ? `<tr><td style="padding:6px 0;font-weight:600;color:#4B5563">Incoterms:</td><td style="padding:6px 0;font-weight:700;color:#1F2937">${quotationTerms.incoterms}</td></tr>`
            : ""
        }
        ${
          quotationTerms.port
            ? `<tr><td style="padding:6px 0;font-weight:600;color:#4B5563">Port of Loading / Destination:</td><td style="padding:6px 0;color:#1F2937">${quotationTerms.port}</td></tr>`
            : ""
        }
        ${
          quotationTerms.paymentTerms
            ? `<tr><td style="padding:6px 0;font-weight:600;color:#4B5563">Payment Terms:</td><td style="padding:6px 0;color:#1F2937">${quotationTerms.paymentTerms}</td></tr>`
            : ""
        }
        ${
          quotationTerms.validity
            ? `<tr><td style="padding:6px 0;font-weight:600;color:#4B5563">Offer Validity:</td><td style="padding:6px 0;color:#1F2937">${quotationTerms.validity}</td></tr>`
            : ""
        }
      </table>
    </div>`
    : "";

  return `
  <!DOCTYPE html>
  <html>
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
  </head>
  <body style="margin:0;padding:0;background-color:#F9FAFB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
    <div style="max-width:620px;margin:30px auto;background:#ffffff;border:1px solid #E5E7EB;border-radius:16px;overflow:hidden;box-shadow:0 4px 12px rgba(0,0,0,0.03);">
      
      <!-- Top Brand Header -->
      <div style="background:#56684A;padding:28px 32px;text-align:left;">
        <div style="display:inline-block;font-size:22px;font-weight:900;letter-spacing:1px;color:#ffffff;text-transform:uppercase;">
          FOODVILLE
        </div>
        <div style="font-size:11px;color:#D8E2D1;letter-spacing:1.5px;text-transform:uppercase;margin-top:4px;font-weight:600;">
          International Trade & Export Desk
        </div>
      </div>

      <!-- Reference Badge Strip -->
      <div style="background:#FAF7F2;padding:12px 32px;border-bottom:1px solid #EDE6D9;font-size:12px;color:#6B7280;display:flex;justify-content:space-between;">
        <span><strong>Inquiry Reference:</strong> <code style="font-family:monospace;color:#56684A;font-weight:700;">${inquiryId}</code></span>
        ${companyName ? `<span style="margin-left:auto;"><strong>Entity:</strong> ${companyName}</span>` : ""}
      </div>

      <!-- Main Body -->
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">
          Dear ${recipientName || "Valued Trade Partner"},
        </p>

        <div style="margin:20px 0;">
          ${formattedMessage}
        </div>

        ${quoteHtml}

        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1F2937;">
            Foodville Global Export Desk
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
            Foodville Consumer Products Private Limited
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
            📧 <a href="mailto:support@foodvilleindia.com" style="color:#56684A;text-decoration:none;font-weight:600;">support@foodvilleindia.com</a> | 🌐 <a href="https://foodvilleindia.com" style="color:#56684A;text-decoration:none;font-weight:600;">foodvilleindia.com</a>
          </p>
          <p style="margin:0;font-size:12px;color:#6B7280;">
            📞 WhatsApp / Direct Line: +91 9911575605
          </p>
        </div>
      </div>

      <!-- Footer Disclaimer -->
      <div style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;line-height:1.5;">
        This email and any files transmitted with it are confidential and intended solely for the use of the individual or entity to whom they are addressed. Foodville Consumer Products Pvt Ltd, Ghaziabad, U.P. 201001, India.
      </div>
    </div>
  </body>
  </html>`;
}

export async function sendExportResponseEmail({
  to,
  recipientName,
  inquiryId,
  subject,
  messageText,
  companyName,
  quotationTerms,
}) {
  const html = exportResponseEmailHtml({
    recipientName,
    inquiryId,
    companyName,
    messageText,
    quotationTerms,
  });

  const plainText = `Inquiry Reference: ${inquiryId}\n\nDear ${recipientName || "Valued Trade Partner"},\n\n${messageText}\n\n---\nFoodville Global Export Desk\nFoodville Consumer Products Private Limited\nsupport@foodvilleindia.com | +91 9911575605`;

  // Dev/console mode
  if (env.emailDevMode || !env.smtp.host) {
    // eslint-disable-next-line no-console
    console.log(
      `\n────────────────────────────────────────────────────────────\n📧  [DEV EXPORT EMAIL] To: ${to}\n    Subject: ${subject}\n    Inquiry: ${inquiryId}\n    Message:\n${messageText}\n────────────────────────────────────────────────────────────\n`
    );
    return { delivered: false, dev: true };
  }

  try {
    const t = getTransporter();
    await t.sendMail({
      from: env.smtp.from,
      to,
      subject: subject || `Foodville Export Inquiry Response - [${inquiryId}]`,
      text: plainText,
      html,
    });
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] Export response SMTP send failed:", err?.message);
    if (!env.isProd) {
      // eslint-disable-next-line no-console
      console.log(`[email] SMTP failed in non-prod, logged to console for ${to}`);
      return { delivered: false, dev: true };
    }
    throw new AppError(
      "We couldn't send the export response email. Please verify SMTP settings.",
      502,
      "EMAIL_SEND_FAILED"
    );
  }
}

function distributorResponseEmailHtml({
  recipientName,
  applicationId,
  firmName,
  messageText,
}) {
  const formattedMessage = (messageText || "")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .map((p) => `<p style="margin:0 0 12px;font-size:14px;color:#374151;line-height:1.7;">${p}</p>`)
    .join("");

  return `<!DOCTYPE html>
  <html lang="en">
  <head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Foodville FMCG Distributorship Response</title>
  </head>
  <body style="margin:0;padding:0;background-color:#F4F6F0;font-family:'Segoe UI',Roboto,Helvetica,Arial,sans-serif;-webkit-font-smoothing:antialiased;">
    <div style="max-width:620px;margin:32px auto;background:#FFFFFF;border-radius:16px;overflow:hidden;box-shadow:0 4px 20px rgba(0,0,0,0.06);border:1px solid #E2E8D8;">
      
      <!-- Brand Header -->
      <div style="background:#2C3624;padding:28px 32px;text-align:center;">
        <h1 style="margin:0;font-size:26px;font-weight:900;letter-spacing:1px;color:#FFFFFF;text-transform:uppercase;">
          FOODVILLE
        </h1>
        <p style="margin:4px 0 0;font-size:12px;letter-spacing:2px;color:#D4B26F;text-transform:uppercase;font-weight:600;">
          National FMCG Trade &amp; Channel Desk
        </p>
      </div>

      <!-- Application Badge Banner -->
      <div style="background:#F0F4EC;padding:12px 32px;border-bottom:1px solid #E2E8D8;display:flex;align-items:center;justify-content:space-between;">
        <span style="font-size:12px;color:#56684A;font-weight:700;">
          Application Ref: <strong style="font-family:monospace;color:#2C3624;">${applicationId}</strong>
        </span>
        ${firmName ? `<span style="font-size:12px;color:#56684A;font-weight:600;margin-left:12px;">Firm: <strong>${firmName}</strong></span>` : ""}
      </div>

      <!-- Main Body -->
      <div style="padding:32px;">
        <p style="margin:0 0 16px;font-size:15px;font-weight:700;color:#111827;">
          Dear ${recipientName || "Valued Trade Partner"},
        </p>

        <div style="margin:20px 0;">
          ${formattedMessage}
        </div>

        <div style="margin-top:28px;padding-top:20px;border-top:1px solid #E5E7EB;">
          <p style="margin:0 0 4px;font-size:13px;font-weight:700;color:#1F2937;">
            Foodville Channel Distribution Desk
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
            Foodville Consumer Products Private Limited
          </p>
          <p style="margin:0 0 4px;font-size:12px;color:#6B7280;">
            📧 <a href="mailto:support@foodvilleindia.com" style="color:#56684A;text-decoration:none;font-weight:600;">support@foodvilleindia.com</a> | 🌐 <a href="https://foodvilleindia.com" style="color:#56684A;text-decoration:none;font-weight:600;">foodvilleindia.com</a>
          </p>
          <p style="margin:0;font-size:12px;color:#6B7280;">
            📞 Trade Desk Direct / WhatsApp: +91 9911575605
          </p>
        </div>
      </div>

      <!-- Footer Disclaimer -->
      <div style="background:#F9FAFB;padding:20px 32px;border-top:1px solid #E5E7EB;font-size:11px;color:#9CA3AF;line-height:1.5;">
        This communication is confidential and intended solely for the authorized recipient. Foodville Consumer Products Pvt. Ltd., H-112, 1st Floor, Patel Nagar-III, Ghaziabad, U.P. 201001, India.
      </div>
    </div>
  </body>
  </html>`;
}

export async function sendDistributorResponseEmail({
  to,
  recipientName,
  applicationId,
  subject,
  messageText,
  firmName,
}) {
  const html = distributorResponseEmailHtml({
    recipientName,
    applicationId,
    firmName,
    messageText,
  });

  const plainText = `Application Reference: ${applicationId}\n\nDear ${recipientName || "Valued Trade Partner"},\n\n${messageText}\n\n---\nFoodville Channel Distribution Desk\nFoodville Consumer Products Private Limited\nsupport@foodvilleindia.com | +91 9911575605`;

  if (env.emailDevMode || !env.smtp.host) {
    // eslint-disable-next-line no-console
    console.log(
      `\n────────────────────────────────────────────────────────────\n📧  [DEV DISTRIBUTOR EMAIL] To: ${to}\n    Subject: ${subject}\n    Application: ${applicationId}\n    Message:\n${messageText}\n────────────────────────────────────────────────────────────\n`
    );
    return { delivered: false, dev: true };
  }

  try {
    const t = getTransporter();
    await t.sendMail({
      from: env.smtp.from,
      to,
      subject: subject || `Foodville FMCG Distributorship - Application [${applicationId}]`,
      text: plainText,
      html,
    });
    return { delivered: true };
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("[email] Distributor response SMTP send failed:", err?.message);
    if (!env.isProd) {
      // eslint-disable-next-line no-console
      console.log(`[email] SMTP failed in non-prod, logged to console for ${to}`);
      return { delivered: false, dev: true };
    }
    throw new AppError(
      "We couldn't send the distributor response email. Please verify SMTP settings.",
      502,
      "EMAIL_SEND_FAILED"
    );
  }
}
