import { ok, withRoute } from "@/server/utils/apiResponse";
import { requireAdmin } from "@/server/middleware/auth";
import { notFound, badRequest } from "@/server/utils/apiError";
import GlobalExportInquiry from "@/server/models/GlobalExportInquiry";
import { sendExportResponseEmail } from "@/server/services/email.service";

export const runtime = "nodejs";

export const POST = withRoute(async (req, { params }) => {
  const admin = await requireAdmin(req);
  const { id } = await params;

  const body = await req.json().catch(() => ({}));
  const { subject, messageText, quotationTerms, newStatus } = body;

  if (!subject || !subject.trim()) {
    throw badRequest("Please enter an email subject line.");
  }
  if (!messageText || !messageText.trim()) {
    throw badRequest("Please enter the response message body.");
  }

  const inquiry = await GlobalExportInquiry.findById(id);
  if (!inquiry) {
    throw notFound("Export inquiry record not found.");
  }

  // 1. Send the email via Nodemailer/SMTP
  const emailResult = await sendExportResponseEmail({
    to: inquiry.email,
    recipientName: inquiry.fullName,
    inquiryId: inquiry.inquiryId,
    subject: subject.trim(),
    messageText: messageText.trim(),
    companyName: inquiry.companyName,
    quotationTerms: quotationTerms || {},
  });

  // 2. Determine target status
  let targetStatus = inquiry.status;
  if (newStatus && ["pending", "contacted", "quoted", "contract_signed", "closed"].includes(newStatus)) {
    targetStatus = newStatus;
  } else if (inquiry.status === "pending") {
    targetStatus = quotationTerms?.priceQuote ? "quoted" : "contacted";
  }

  // 3. Append to history and update document
  const updatedDoc = await GlobalExportInquiry.findByIdAndUpdate(
    id,
    {
      $set: {
        status: targetStatus,
        lastContactedAt: new Date(),
      },
      $push: {
        emailHistory: {
          subject: subject.trim(),
          message: messageText.trim(),
          quotationTerms: quotationTerms || {},
          sentAt: new Date(),
          sentBy: admin.email || "Admin",
        },
      },
    },
    { new: true, runValidators: false }
  );

  return ok({
    success: true,
    message: emailResult.delivered
      ? `Email sent successfully to ${inquiry.email}`
      : `Email response recorded (dev mode / console log) for ${inquiry.email}`,
    item: updatedDoc,
    emailResult,
  });
});
