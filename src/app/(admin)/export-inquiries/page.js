"use client";

import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";

const STATUS_CONFIG = {
  pending: { label: "Pending", bg: "bg-amber-100 text-amber-800 border-amber-200" },
  contacted: { label: "Contacted", bg: "bg-blue-100 text-blue-800 border-blue-200" },
  quoted: { label: "Quoted", bg: "bg-emerald-100 text-emerald-800 border-emerald-200" },
  contract_signed: { label: "Contract Signed", bg: "bg-purple-100 text-purple-800 border-purple-200" },
  closed: { label: "Closed", bg: "bg-gray-100 text-gray-800 border-gray-200" },
};

const EMAIL_TEMPLATES = [
  {
    id: "quote",
    name: "Commercial Quotation Offer",
    subject: "Commercial Quotation & Export Terms - Foodville India",
    body: (inquiry) =>
      `Thank you for your interest in importing premium dehydrated spice powders and organic foods from Foodville India.\n\nFollowing your inquiry for ${
        Array.isArray(inquiry.productInterest) && inquiry.productInterest.length > 0
          ? inquiry.productInterest.join(", ")
          : "our products"
      } (${inquiry.quantity}), we are pleased to offer you our best export trade quotation.\n\nAll our shipments are strictly APEDA & FSSAI certified, double-tested for moisture & purity, and vacuum-sealed for long-distance sea/air transit.\n\nPlease find our commercial terms detailed below. We look forward to establishing a long-term trade relationship with ${
        inquiry.companyName || "your esteemed company"
      }.`,
    hasQuoteFields: true,
  },
  {
    id: "intro",
    name: "Trade Desk Introduction & Specs",
    subject: "Foodville Global Export Desk - Regarding Your Export Inquiry",
    body: (inquiry) =>
      `Thank you for contacting Foodville Consumer Products Private Limited regarding international bulk supply to ${
        inquiry.country || "your destination"
      }.\n\nOur international export team has received your requirement for ${
        inquiry.quantity
      } of ${
        Array.isArray(inquiry.productInterest) && inquiry.productInterest.length > 0
          ? inquiry.productInterest.join(", ")
          : "our agro-spice range"
      }.\n\nCould you please share your preferred destination port (${
        inquiry.destinationPort || "e.g., CIF Port"
      }), target delivery schedule, and any customized private labeling or mesh-size specifications you require?\n\nOur team is ready to dispatch product spec-sheets, COA (Certificate of Analysis), and sample packages to your address.`,
    hasQuoteFields: false,
  },
  {
    id: "packaging",
    name: "Custom Packaging & Quality Certificates",
    subject: "Packaging Specs & Quality Certifications - Foodville Export Desk",
    body: (inquiry) =>
      `We are following up on your inquiry regarding custom export packaging for ${
        inquiry.companyName || inquiry.fullName
      }.\n\nWe provide Food-Grade Multi-layer Aluminum Foil Bags, 25kg HDPE Drums, corrugated master cartons with nitrogen flushing, and custom OEM private label barcodes.\n\nEvery batch is backed by Phytosanitary Certification, Certificate of Origin, and third-party laboratory test reports.\n\nPlease let us know if you would like us to send sample packs directly to your office.`,
    hasQuoteFields: false,
  },
];

export default function ExportInquiriesPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    quoted: 0,
    contract_signed: 0,
    closed: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState(null);

  // Modal active tab: 'details' | 'email' | 'history'
  const [modalTab, setModalTab] = useState("details");

  // Editing notes & status
  const [editingNotes, setEditingNotes] = useState("");
  const [editingStatus, setEditingStatus] = useState("pending");
  const [updating, setUpdating] = useState(false);

  // Email form state
  const [selectedTemplateId, setSelectedTemplateId] = useState("quote");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailBody, setEmailBody] = useState("");
  const [showQuoteFields, setShowQuoteFields] = useState(true);
  const [quoteTerms, setQuoteTerms] = useState({
    priceQuote: "",
    incoterms: "FOB",
    port: "Nhava Sheva (JNPT) / Mundra Port, India",
    paymentTerms: "30% Advance T/T, 70% against B/L copy",
    validity: "15 Days from date of quotation",
  });
  const [sendingEmail, setSendingEmail] = useState(false);

  // Delete modal state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/export-inquiries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.data.items || []);
        setStats(
          data.data.stats || {
            total: 0,
            pending: 0,
            contacted: 0,
            quoted: 0,
            contract_signed: 0,
            closed: 0,
          }
        );
      }
    } catch (err) {
      console.error("Failed to load export inquiries:", err);
      toast.error("Failed to load inquiries.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [filterStatus, searchTerm]);

  // Open inquiry modal
  const openInquiryModal = (inquiry, defaultTab = "details") => {
    setSelectedInquiry(inquiry);
    setModalTab(defaultTab);
    setEditingNotes(inquiry.internalNotes || "");
    setEditingStatus(inquiry.status || "pending");

    // Initialize email form
    const defaultTpl = EMAIL_TEMPLATES[0];
    setSelectedTemplateId(defaultTpl.id);
    setEmailSubject(defaultTpl.subject);
    setEmailBody(defaultTpl.body(inquiry));
    setShowQuoteFields(defaultTpl.hasQuoteFields);
    setQuoteTerms({
      priceQuote: "",
      incoterms: inquiry.incoterms || "FOB",
      port: inquiry.destinationPort
        ? `Nhava Sheva -> ${inquiry.destinationPort}`
        : "Nhava Sheva (JNPT) / Mundra Port, India",
      paymentTerms: "30% Advance T/T, 70% against B/L copy",
      validity: "15 Days from date of quotation",
    });
  };

  // Switch template
  const handleTemplateChange = (tplId) => {
    setSelectedTemplateId(tplId);
    const tpl = EMAIL_TEMPLATES.find((t) => t.id === tplId);
    if (tpl && selectedInquiry) {
      setEmailSubject(tpl.subject);
      setEmailBody(tpl.body(selectedInquiry));
      setShowQuoteFields(tpl.hasQuoteFields);
    }
  };

  // Update Status and Notes
  const handleUpdateStatus = async () => {
    if (!selectedInquiry) return;
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/export-inquiries/${selectedInquiry._id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: editingStatus, internalNotes: editingNotes }),
      });
      const data = await res.json();
      if (res.ok) {
        toast.success("Inquiry updated successfully.");
        setSelectedInquiry(data.data.item);
        fetchInquiries();
      } else {
        toast.error(data.error?.message || "Failed to update inquiry.");
      }
    } catch (err) {
      toast.error("Network error while updating inquiry.");
    } finally {
      setUpdating(false);
    }
  };

  // Send Email Response
  const handleSendEmail = async () => {
    if (!selectedInquiry) return;
    if (!emailSubject.trim()) {
      toast.error("Please provide an email subject.");
      return;
    }
    if (!emailBody.trim()) {
      toast.error("Please enter email message content.");
      return;
    }

    setSendingEmail(true);
    try {
      const payload = {
        subject: emailSubject.trim(),
        messageText: emailBody.trim(),
        quotationTerms: showQuoteFields ? quoteTerms : undefined,
      };

      const res = await fetch(
        `/api/admin/export-inquiries/${selectedInquiry._id}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success(data.data.message || "Email dispatched successfully!");
        setSelectedInquiry(data.data.item);
        setEditingStatus(data.data.item.status);
        setModalTab("history");
        fetchInquiries();
      } else {
        toast.error(data.error?.message || "Failed to send email.");
      }
    } catch (err) {
      console.error(err);
      toast.error("Error connecting to email dispatcher.");
    } finally {
      setSendingEmail(false);
    }
  };

  // Confirm Delete
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/admin/export-inquiries/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (res.ok) {
        toast.success("Export inquiry deleted.");
        fetchInquiries();
        if (selectedInquiry?._id === deleteTarget._id) {
          setSelectedInquiry(null);
        }
        setDeleteTarget(null);
      } else {
        toast.error("Failed to delete record.");
      }
    } catch (err) {
      toast.error("Delete failed.");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="inline-flex items-center gap-2 px-2.5 py-1 rounded-full bg-[#56684A]/10 border border-[#56684A]/20 text-xs font-bold text-[#56684A] mb-1.5">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
              <circle cx="12" cy="12" r="10" />
              <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
              <path d="M2 12h20" />
            </svg>
            International Trade Desk
          </div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Worldwide Export Inquiries</h1>
          <p className="text-xs text-gray-500 font-medium">
            Manage global container shipments, issue FOB/CIF quotations, and communicate with overseas buyers.
          </p>
        </div>

        <button
          onClick={fetchInquiries}
          className="inline-flex items-center justify-center gap-2 bg-white hover:bg-gray-50 text-gray-700 border border-gray-200 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer"
        >
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M21.5 2v6h-6M21.34 15.57a10 10 0 1 1-.57-8.38l5.67-5.67" />
          </svg>
          Refresh Leads
        </button>
      </div>

      {/* Stats Summary Bar */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3 sm:gap-4">
        {[
          { label: "Total Leads", val: stats.total, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Pending", val: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Contacted", val: stats.contacted, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Quoted Issued", val: stats.quoted, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Contract Signed", val: stats.contract_signed, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { label: "Closed", val: stats.closed, color: "text-gray-600 bg-gray-50 border-gray-100" },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${s.color} flex flex-col justify-between`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{s.label}</span>
            <span className="text-2xl font-black mt-2">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filters & Search Bar */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100 shadow-sm">
        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Contacted", value: "contacted" },
            { label: "Quoted", value: "quoted" },
            { label: "Contract Signed", value: "contract_signed" },
            { label: "Closed", value: "closed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`flex-1 sm:flex-initial px-3.5 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer whitespace-nowrap ${
                filterStatus === tab.value
                  ? "bg-white text-gray-950 shadow-sm"
                  : "text-gray-500 hover:text-gray-950"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Input */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by ID, name, country, company..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56684A] bg-gray-50"
          />
          <svg
            className="absolute left-3.5 top-3.5 text-gray-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2.5"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Grid / Table of Export Inquiries */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400 font-bold animate-pulse">
          Loading global export inquiries…
        </div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs font-bold space-y-2">
          <div className="w-12 h-12 mx-auto rounded-full bg-gray-50 flex items-center justify-center text-gray-400">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <path d="M2 12h20" />
            </svg>
          </div>
          <p>No export inquiries matching your criteria.</p>
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-5 py-4">Inquiry ID</th>
                  <th className="px-5 py-4">Buyer & Company</th>
                  <th className="px-5 py-4">Destination</th>
                  <th className="px-5 py-4">Products & Volume</th>
                  <th className="px-5 py-4">Incoterms</th>
                  <th className="px-5 py-4">Status</th>
                  <th className="px-5 py-4">Emails Sent</th>
                  <th className="px-5 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                {items.map((item) => {
                  const statusInfo = STATUS_CONFIG[item.status] || STATUS_CONFIG.pending;
                  const emailCount = item.emailHistory?.length || 0;

                  return (
                    <tr key={item._id} className="hover:bg-gray-50/60 transition-colors">
                      <td className="px-5 py-4">
                        <div className="font-mono text-gray-900 font-bold">{item.inquiryId}</div>
                        <div className="text-[10px] text-gray-400 mt-0.5">
                          {new Date(item.createdAt).toLocaleDateString()}
                        </div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-950">{item.fullName}</div>
                        <div className="text-[10px] text-gray-500">{item.companyName}</div>
                        <div className="text-[10px] text-blue-600 mt-0.5">{item.email}</div>
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-gray-900 flex items-center gap-1.5">
                          <span>🌐</span> {item.country}
                        </div>
                        {item.destinationPort && (
                          <div className="text-[10px] text-gray-500 mt-0.5">
                            Port: {item.destinationPort}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <div className="font-bold text-[#56684A]">{item.quantity}</div>
                        <div className="text-[10px] text-gray-500 max-w-[180px] truncate">
                          {Array.isArray(item.productInterest) && item.productInterest.length > 0
                            ? item.productInterest.join(", ")
                            : "General Agro/Spices"}
                        </div>
                        {item.customPackaging && (
                          <span className="inline-block mt-1 px-2 py-0.5 rounded bg-amber-50 text-amber-700 text-[9px] font-bold border border-amber-200">
                            Custom Packaging
                          </span>
                        )}
                      </td>
                      <td className="px-5 py-4">
                        <span className="px-2 py-1 rounded-md bg-gray-100 font-mono text-[10px] font-bold text-gray-700">
                          {item.incoterms || "FOB"}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        <span
                          className={`inline-flex items-center px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${statusInfo.bg}`}
                        >
                          {statusInfo.label}
                        </span>
                      </td>
                      <td className="px-5 py-4">
                        {emailCount > 0 ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M22 2L11 13" /><polygon points="22 2 15 22 11 13 2 9 22 2" />
                            </svg>
                            {emailCount} sent
                          </span>
                        ) : (
                          <span className="text-[11px] text-gray-400 font-medium">—</span>
                        )}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <div className="inline-flex items-center gap-1.5">
                          <button
                            onClick={() => openInquiryModal(item, "email")}
                            className="px-3 py-1.5 rounded-lg bg-[#56684A] text-white text-[10px] font-black uppercase hover:bg-[#45543B] transition cursor-pointer shadow-sm flex items-center gap-1"
                          >
                            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                              <polyline points="22,6 12,13 2,6" />
                            </svg>
                            Email
                          </button>
                          <button
                            onClick={() => openInquiryModal(item, "details")}
                            className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase hover:bg-gray-100 transition cursor-pointer text-gray-700"
                          >
                            Review
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review & Email Modal */}
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 sm:p-4 backdrop-blur-xs overflow-y-auto">
          <div className="bg-white rounded-3xl max-w-3xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 my-8 animate-slideUp max-h-[92vh] overflow-y-auto">
            {/* Modal Header */}
            <div className="flex items-start justify-between border-b border-gray-100 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono font-bold text-[#56684A] bg-[#56684A]/10 px-2 py-0.5 rounded">
                    {selectedInquiry.inquiryId}
                  </span>
                  <span
                    className={`inline-block px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                      STATUS_CONFIG[selectedInquiry.status]?.bg || "bg-gray-100 text-gray-700"
                    }`}
                  >
                    {STATUS_CONFIG[selectedInquiry.status]?.label || selectedInquiry.status}
                  </span>
                </div>
                <h3 className="text-xl font-black text-gray-900 tracking-tight mt-1">
                  {selectedInquiry.fullName} — {selectedInquiry.companyName}
                </h3>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1.5 rounded-full hover:bg-gray-100 text-gray-400 transition"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            {/* Modal Navigation Tabs */}
            <div className="flex gap-2 border-b border-gray-100 pb-2">
              {[
                { id: "details", label: "📋 Trade Details & Notes" },
                { id: "email", label: "✉️ Send Official Email" },
                {
                  id: "history",
                  label: `📜 Email History (${selectedInquiry.emailHistory?.length || 0})`,
                },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setModalTab(tab.id)}
                  className={`px-4 py-2 text-xs font-bold rounded-xl transition cursor-pointer ${
                    modalTab === tab.id
                      ? "bg-[#56684A] text-white shadow-sm"
                      : "text-gray-600 hover:bg-gray-100"
                  }`}
                >
                  {tab.label}
                </button>
              ))}
            </div>

            {/* TAB 1: DETAILS & INTERNAL NOTES */}
            {modalTab === "details" && (
              <div className="space-y-6 animate-fadeIn">
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 text-xs bg-gray-50 p-5 rounded-2xl border border-gray-100">
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Buyer Name</p>
                    <p className="text-gray-950 font-bold mt-0.5">{selectedInquiry.fullName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Company</p>
                    <p className="text-gray-950 font-bold mt-0.5">{selectedInquiry.companyName}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Destination Country</p>
                    <p className="text-gray-950 font-bold mt-0.5">🌐 {selectedInquiry.country}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Destination Port</p>
                    <p className="text-gray-950 font-semibold mt-0.5">{selectedInquiry.destinationPort || "Not Specified"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Target Volume</p>
                    <p className="text-emerald-700 font-black text-sm mt-0.5">{selectedInquiry.quantity}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Incoterms</p>
                    <p className="text-gray-950 font-bold mt-0.5">{selectedInquiry.incoterms || "FOB"}</p>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Direct Email</p>
                    <a href={`mailto:${selectedInquiry.email}`} className="text-blue-600 hover:underline font-semibold mt-0.5 block">
                      {selectedInquiry.email}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Phone / WhatsApp</p>
                    <a href={`tel:${selectedInquiry.phone}`} className="text-blue-600 hover:underline font-semibold mt-0.5 block">
                      {selectedInquiry.phone}
                    </a>
                  </div>
                  <div>
                    <p className="text-[10px] text-gray-400 font-black uppercase">Custom Packaging</p>
                    <p className="font-bold mt-0.5">
                      {selectedInquiry.customPackaging ? (
                        <span className="text-amber-600 font-bold">Yes (Required)</span>
                      ) : (
                        <span className="text-gray-500">Standard Bulk Packs</span>
                      )}
                    </p>
                  </div>
                  <div className="col-span-2 sm:col-span-3 border-t border-gray-200 pt-3">
                    <p className="text-[10px] text-gray-400 font-black uppercase">Interested Products</p>
                    <div className="flex flex-wrap gap-1.5 mt-1.5">
                      {Array.isArray(selectedInquiry.productInterest) && selectedInquiry.productInterest.length > 0 ? (
                        selectedInquiry.productInterest.map((p, idx) => (
                          <span key={idx} className="px-2.5 py-1 bg-white rounded-lg border border-gray-200 text-xs font-bold text-gray-800">
                            🌿 {p}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-gray-500">Standard Catalog</span>
                      )}
                    </div>
                  </div>
                </div>

                {selectedInquiry.message && (
                  <div className="space-y-1">
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">
                      Buyer Specifications / Message
                    </label>
                    <div className="text-xs bg-amber-50/50 border border-amber-200/60 p-4 rounded-xl text-gray-800 leading-relaxed font-medium">
                      {selectedInquiry.message}
                    </div>
                  </div>
                )}

                {/* Status & Notes Form */}
                <div className="space-y-4 border-t border-gray-100 pt-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Inquiry Lead Status
                      </label>
                      <select
                        value={editingStatus}
                        onChange={(e) => setEditingStatus(e.target.value)}
                        className="w-full px-3.5 py-2.5 text-xs font-bold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56684A] bg-white"
                      >
                        <option value="pending">Pending Review</option>
                        <option value="contacted">Contacted Trade Desk</option>
                        <option value="quoted">Quotation Issued</option>
                        <option value="contract_signed">Contract Signed / Proforma Issued</option>
                        <option value="closed">Closed / Completed</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                        Quick Status Actions
                      </label>
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => setEditingStatus("quoted")}
                          className="px-3 py-2.5 rounded-xl border border-emerald-200 bg-emerald-50 text-emerald-800 text-xs font-bold hover:bg-emerald-100 transition cursor-pointer flex-1"
                        >
                          Mark Quoted
                        </button>
                        <button
                          type="button"
                          onClick={() => setEditingStatus("contract_signed")}
                          className="px-3 py-2.5 rounded-xl border border-purple-200 bg-purple-50 text-purple-800 text-xs font-bold hover:bg-purple-100 transition cursor-pointer flex-1"
                        >
                          Contract Signed
                        </button>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                      Internal Trade Notes (Private)
                    </label>
                    <textarea
                      rows={3}
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add private supplier rates, ocean freight costs, container logistics, or inspection notes..."
                      className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56684A]"
                    />
                  </div>
                </div>

                <div className="flex justify-between items-center pt-2">
                  <button
                    type="button"
                    onClick={() => setDeleteTarget(selectedInquiry)}
                    className="text-red-500 hover:text-red-700 text-xs font-bold cursor-pointer"
                  >
                    Delete Inquiry
                  </button>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => setModalTab("email")}
                      className="px-4 py-2.5 rounded-xl bg-[#56684A] text-white text-xs font-bold hover:bg-[#45543B] transition cursor-pointer shadow-sm flex items-center gap-1.5"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                        <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
                        <polyline points="22,6 12,13 2,6" />
                      </svg>
                      Compose Email Response
                    </button>
                    <button
                      type="button"
                      onClick={handleUpdateStatus}
                      disabled={updating}
                      className="px-4 py-2.5 rounded-xl bg-gray-900 text-white text-xs font-bold hover:bg-gray-800 transition cursor-pointer disabled:opacity-50"
                    >
                      {updating ? "Saving…" : "Save Notes & Status"}
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* TAB 2: EMAIL RESPONDER */}
            {modalTab === "email" && (
              <div className="space-y-5 animate-fadeIn">
                {/* Template Selector */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                    Select Email Template
                  </label>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                    {EMAIL_TEMPLATES.map((tpl) => (
                      <button
                        key={tpl.id}
                        type="button"
                        onClick={() => handleTemplateChange(tpl.id)}
                        className={`p-3 rounded-xl border text-left text-xs transition cursor-pointer ${
                          selectedTemplateId === tpl.id
                            ? "bg-[#56684A]/10 border-[#56684A] text-[#56684A] font-bold shadow-xs"
                            : "bg-white border-gray-200 text-gray-600 hover:bg-gray-50"
                        }`}
                      >
                        <p className="font-bold">{tpl.name}</p>
                        <p className="text-[10px] opacity-75 mt-0.5 truncate">{tpl.subject}</p>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Recipient Display */}
                <div className="bg-gray-50 p-3 rounded-xl border border-gray-100 flex flex-col sm:flex-row sm:items-center justify-between text-xs text-gray-600 gap-2">
                  <div>
                    <span className="font-bold text-gray-900">To:</span> {selectedInquiry.fullName} &lt;{selectedInquiry.email}&gt;
                  </div>
                  <div>
                    <span className="font-bold text-gray-900">Destination:</span> 🌐 {selectedInquiry.country}
                  </div>
                </div>

                {/* Subject Line */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Email Subject Line *
                  </label>
                  <input
                    type="text"
                    value={emailSubject}
                    onChange={(e) => setEmailSubject(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs font-semibold rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56684A]"
                    placeholder="Subject line..."
                  />
                </div>

                {/* Quotation Terms Expansion Toggle */}
                <div className="border border-gray-200 rounded-2xl p-4 bg-gray-50/50 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="includeQuote"
                        checked={showQuoteFields}
                        onChange={(e) => setShowQuoteFields(e.target.checked)}
                        className="rounded border-gray-300 text-[#56684A] focus:ring-[#56684A] cursor-pointer"
                      />
                      <label htmlFor="includeQuote" className="text-xs font-bold text-gray-800 cursor-pointer">
                        Include Commercial Quotation Table in Email
                      </label>
                    </div>
                    <span className="text-[10px] text-gray-400 font-bold uppercase">Commercial Terms</span>
                  </div>

                  {showQuoteFields && (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Price / Rate Quote</label>
                        <input
                          type="text"
                          placeholder="e.g. $4.50 / KG FOB or $18,500 / 20ft FCL"
                          value={quoteTerms.priceQuote}
                          onChange={(e) => setQuoteTerms({ ...quoteTerms, priceQuote: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Incoterms</label>
                        <select
                          value={quoteTerms.incoterms}
                          onChange={(e) => setQuoteTerms({ ...quoteTerms, incoterms: e.target.value })}
                          className="w-full px-3 py-2 text-xs font-semibold rounded-lg border border-gray-200 bg-white"
                        >
                          <option value="FOB">FOB (Free on Board - India Port)</option>
                          <option value="CIF">CIF (Cost, Insurance & Freight)</option>
                          <option value="CFR">CFR (Cost & Freight)</option>
                          <option value="DDP">DDP (Delivered Duty Paid)</option>
                          <option value="EXW">EXW (Ex Works Factory)</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Port of Loading / Destination</label>
                        <input
                          type="text"
                          placeholder="e.g. Nhava Sheva (JNPT) -> Rotterdam Port"
                          value={quoteTerms.port}
                          onChange={(e) => setQuoteTerms({ ...quoteTerms, port: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[10px] font-bold text-gray-500 mb-0.5">Payment Terms</label>
                        <input
                          type="text"
                          placeholder="e.g. 30% Advance T/T, 70% against B/L"
                          value={quoteTerms.paymentTerms}
                          onChange={(e) => setQuoteTerms({ ...quoteTerms, paymentTerms: e.target.value })}
                          className="w-full px-3 py-2 text-xs rounded-lg border border-gray-200 bg-white"
                        />
                      </div>
                    </div>
                  )}
                </div>

                {/* Message Body */}
                <div>
                  <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">
                    Email Message Body *
                  </label>
                  <textarea
                    rows={7}
                    value={emailBody}
                    onChange={(e) => setEmailBody(e.target.value)}
                    className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#56684A] leading-relaxed font-sans"
                    placeholder="Write your email reply..."
                  />
                </div>

                {/* Action Buttons */}
                <div className="flex justify-end gap-3 pt-2">
                  <button
                    type="button"
                    onClick={() => setModalTab("details")}
                    className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
                  >
                    Back to Details
                  </button>
                  <button
                    type="button"
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="px-6 py-2.5 rounded-xl bg-[#56684A] text-white text-xs font-bold shadow-md hover:bg-[#45543B] transition cursor-pointer flex items-center gap-2 disabled:opacity-60"
                  >
                    {sendingEmail ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Sending Email…
                      </>
                    ) : (
                      <>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
                          <line x1="22" y1="2" x2="11" y2="13" />
                          <polygon points="22 2 15 22 11 13 2 9 22 2" />
                        </svg>
                        Send Official Email Response
                      </>
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* TAB 3: EMAIL HISTORY */}
            {modalTab === "history" && (
              <div className="space-y-4 animate-fadeIn">
                {!selectedInquiry.emailHistory || selectedInquiry.emailHistory.length === 0 ? (
                  <div className="py-12 text-center bg-gray-50 rounded-2xl border border-gray-100 text-gray-400 text-xs font-semibold">
                    No emails sent yet for this inquiry.
                    <div className="mt-3">
                      <button
                        type="button"
                        onClick={() => setModalTab("email")}
                        className="px-4 py-2 bg-[#56684A] text-white rounded-xl text-xs font-bold hover:bg-[#45543B] transition cursor-pointer"
                      >
                        Send First Email
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {selectedInquiry.emailHistory
                      .slice()
                      .reverse()
                      .map((mail, idx) => (
                        <div key={idx} className="p-4 rounded-2xl border border-gray-200 bg-gray-50/70 space-y-2 text-xs">
                          <div className="flex items-center justify-between border-b border-gray-200 pb-2">
                            <span className="font-bold text-gray-900">{mail.subject}</span>
                            <span className="text-[10px] text-gray-400">
                              {new Date(mail.sentAt).toLocaleString()}
                            </span>
                          </div>
                          <div className="text-gray-700 whitespace-pre-wrap leading-relaxed">
                            {mail.message}
                          </div>
                          {mail.quotationTerms?.priceQuote && (
                            <div className="bg-white p-3 rounded-xl border border-gray-200 mt-2 text-[11px]">
                              <p className="font-bold text-[#56684A]">Quotation Details:</p>
                              <p className="mt-0.5">
                                <strong>Rate:</strong> {mail.quotationTerms.priceQuote} |{" "}
                                <strong>Terms:</strong> {mail.quotationTerms.incoterms} |{" "}
                                <strong>Port:</strong> {mail.quotationTerms.port}
                              </p>
                            </div>
                          )}
                          <div className="text-[10px] text-gray-400 pt-1">
                            Dispatched by: <strong>{mail.sentBy || "Admin"}</strong>
                          </div>
                        </div>
                      ))}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-sm w-full p-6 text-center space-y-4 shadow-2xl border border-gray-100">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <h3 className="text-base font-black text-gray-900">Delete Export Inquiry?</h3>
            <p className="text-xs text-gray-500">
              Are you sure you want to delete inquiry <strong>{deleteTarget.inquiryId}</strong> ({deleteTarget.fullName})? This action cannot be undone.
            </p>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex-1 px-4 py-2.5 rounded-xl bg-red-600 text-white text-xs font-bold hover:bg-red-700 transition cursor-pointer disabled:opacity-50"
              >
                {deleting ? "Deleting…" : "Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
