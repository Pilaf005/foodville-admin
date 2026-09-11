import { ok, withRoute } from "@/server/utils/apiResponse";
import { notFound, badRequest } from "@/server/utils/apiError";
import DistributorApplication from "@/server/models/DistributorApplication";
import { sendDistributorResponseEmail } from "@/server/services/email.service";

export const runtime = "nodejs";

// POST /api/admin/distributor-applications/:id/send-email
export const POST = withRoute(async (req, { params }) => {
  const { id } = await params;
  const doc = await DistributorApplication.findById(id);
  if (!doc) throw notFound("Distributor application not found");

  const body = await req.json();
  const { subject, message, newStatus } = body;

  if (!message || !message.trim()) {
    throw badRequest("Email message content cannot be empty.");
  }

  const result = await sendDistributorResponseEmail({
    to: doc.email,
    recipientName: doc.fullName,
    applicationId: doc.applicationId,
    firmName: doc.firmName,
    subject: subject?.trim() || `Foodville FMCG Distributorship - Application [${doc.applicationId}]`,
    messageText: message.trim(),
  });

  // Automatically update status if supplied or default to contacted if still pending
  if (newStatus) {
    doc.status = newStatus;
  } else if (doc.status === "pending") {
    doc.status = "contacted";
  }

  const timestamp = new Date().toLocaleString("en-IN", { timeZone: "Asia/Kolkata" });
  doc.internalNotes = doc.internalNotes
    ? `${doc.internalNotes}\n[${timestamp}] Sent official distributor email response.`
    : `[${timestamp}] Sent official distributor email response.`;

  await doc.save();

  return ok({
    success: true,
    delivered: result.delivered,
    devMode: !!result.dev,
    message: result.dev
      ? "Email logged to server console (Dev/Non-prod mode)."
      : `Email sent successfully to ${doc.email}!`,
    updatedDoc: doc,
  });
});

