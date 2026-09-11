"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function DistributorApplicationsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    contacted: 0,
    under_review: 0,
    approved: 0,
    rejected: 0,
  });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [purging, setPurging] = useState(false);

  // Email modal / tab states inside review modal
  const [activeModalTab, setActiveModalTab] = useState("details"); // 'details' | 'email'
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  // Custom Modal States
  const [deleteTargetApp, setDeleteTargetApp] = useState(null);
  const [isPurgingModalOpen, setIsPurgingModalOpen] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/distributor-applications?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.data.items || []);
        setStats(
          data.data.stats || {
            total: 0,
            pending: 0,
            contacted: 0,
            under_review: 0,
            approved: 0,
            rejected: 0,
          }
        );
      }
    } catch (err) {
      console.error("Failed to load distributor applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filterStatus, searchTerm]);

  const handleOpenReview = (app) => {
    setSelectedApp(app);
    setEditingNotes(app.internalNotes || "");
    setActiveModalTab("details");
    setEmailSubject(`Foodville FMCG Distributorship - Application [${app.applicationId}]`);
    setEmailMessage(
      `Dear ${app.fullName},\n\nThank you for your interest in partnering with Foodville as an Authorized FMCG Channel Distributor for ${app.city}, ${app.state}.\n\nWe have reviewed your application for ${app.firmName}. Please find attached our Product Catalogue, Wholesale Rate List, and Distributor Margin Structure.\n\nOur National Channel Expansion Director will connect with you shortly on ${app.phone} to discuss territory allocation and initial stock dispatch.\n\nWarm regards,\nNational Channel Distribution Desk\nFoodville Consumer Products Pvt. Ltd.`
    );
  };

  const handleUpdate = async (id, status, notes) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/distributor-applications/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internalNotes: notes }),
      });
      if (res.ok) {
        toast.success("Application status updated.");
        fetchApplications();
        setSelectedApp(null);
      }
    } catch (err) {
      console.error("Update failed:", err);
      toast.error("Failed to update application.");
    } finally {
      setUpdating(false);
    }
  };

  const handleSendEmail = async () => {
    if (!selectedApp) return;
    if (!emailMessage.trim()) {
      toast.error("Please enter email message body.");
      return;
    }

    setSendingEmail(true);
    try {
      const res = await fetch(
        `/api/admin/distributor-applications/${selectedApp._id}/send-email`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            subject: emailSubject,
            message: emailMessage,
            newStatus: selectedApp.status === "pending" ? "contacted" : undefined,
          }),
        }
      );

      const data = await res.json();
      if (res.ok) {
        toast.success(data.data?.message || "Email dispatched successfully!");
        fetchApplications();
        setSelectedApp(null);
      } else {
        toast.error(data.message || "Failed to send email.");
      }
    } catch (err) {
      console.error("Send email error:", err);
      toast.error("Failed to send email.");
    } finally {
      setSendingEmail(false);
    }
  };

  const confirmDeleteOne = async () => {
    if (!deleteTargetApp) return;
    try {
      const res = await fetch(
        `/api/admin/distributor-applications/${deleteTargetApp.id}`,
        {
          method: "DELETE",
        }
      );
      if (res.ok) {
        toast.success("Application deleted.");
        fetchApplications();
        setSelectedApp(null);
        setDeleteTargetApp(null);
      }
    } catch (err) {
      toast.error("Failed to delete application.");
    }
  };

  const confirmPurgeSpam = async () => {
    setIsPurgingModalOpen(false);
    setPurging(true);
    try {
      const res = await fetch("/api/admin/distributor-applications", {
        method: "DELETE",
      });
      const data = await res.json();
      if (res.ok) {
        toast.success(`Purged ${data.data.purgedCount} fake spam bot lead(s)!`);
        fetchApplications();
      }
    } catch (err) {
      toast.error("Failed to purge spam leads.");
    } finally {
      setPurging(false);
    }
  };

  const distributorTierLabels = {
    area_distributor: "Area Distributor",
    super_stockist: "Super Stockist",
    wholesaler_stockist: "Wholesaler / Stockist",
    modern_trade_partner: "Modern Trade Partner",
    institutional_supplier: "Institutional / HORECA",
  };

  const godownLabels = {
    below_500: "< 500 sq.ft.",
    "500_1500": "500 - 1.5k sq.ft.",
    "1500_3000": "1.5k - 3k sq.ft.",
    "3000_plus": "3,000+ sq.ft.",
  };

  return (
    <div className="space-y-6">
      {/* Page Title & Purge Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">
            FMCG Distributorship &amp; Channel Leads
          </h1>
          <p className="text-xs text-gray-500 font-medium">
            Review partnership applications from FMCG distributors, super stockists, and wholesale partners.
          </p>
        </div>

        <button
          onClick={() => setIsPurgingModalOpen(true)}
          disabled={purging}
          className="inline-flex items-center justify-center gap-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0 cursor-pointer disabled:opacity-50"
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
            <path d="M3 6h18" />
            <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
            <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
          </svg>
          {purging ? "Purging Spam..." : "Purge Bot Spam Leads"}
        </button>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-4">
        {[
          { label: "Total Leads", val: stats.total, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Pending Review", val: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Contacted Team", val: stats.contacted, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Under Review", val: stats.under_review, color: "text-purple-600 bg-purple-50 border-purple-100" },
          { label: "Approved Partners", val: stats.approved, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Rejected Applications", val: stats.rejected, color: "text-red-600 bg-red-50 border-red-100" },
        ].map((s, idx) => (
          <div key={idx} className={`p-4 rounded-2xl border ${s.color} flex flex-col justify-between`}>
            <span className="text-[10px] font-black uppercase tracking-widest opacity-80">{s.label}</span>
            <span className="text-2xl font-black mt-2">{s.val}</span>
          </div>
        ))}
      </div>

      {/* Filters & Search */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between bg-white p-4 rounded-2xl border border-gray-100">
        {/* Status Filter Tabs */}
        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-full sm:w-auto overflow-x-auto no-scrollbar">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Contacted", value: "contacted" },
            { label: "Under Review", value: "under_review" },
            { label: "Approved", value: "approved" },
            { label: "Rejected", value: "rejected" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition whitespace-nowrap cursor-pointer ${
                filterStatus === tab.value
                  ? "bg-white text-gray-900 shadow-sm"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Search Box */}
        <div className="relative w-full sm:w-80">
          <input
            type="text"
            placeholder="Search by Name, Firm, GSTIN, City..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/20 focus:border-[#6B7F59] transition"
          />
          <svg
            className="absolute left-3 top-2.5 text-gray-400"
            width="14"
            height="14"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Applications Table */}
      <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-xs text-gray-400 font-bold animate-pulse">
            Loading distributor leads…
          </div>
        ) : items.length === 0 ? (
          <div className="py-20 text-center text-xs text-gray-400 font-bold">
            No distributor applications matching criteria.
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-gray-100 bg-gray-50/50 text-gray-500 uppercase tracking-widest font-black text-[10px]">
                  <th className="py-3 px-4">Ref ID</th>
                  <th className="py-3 px-4">Firm &amp; Applicant</th>
                  <th className="py-3 px-4">Location &amp; Pincode</th>
                  <th className="py-3 px-4">Distributor Tier</th>
                  <th className="py-3 px-4">Working Capital</th>
                  <th className="py-3 px-4">Godown &amp; Fleet</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {items.map((app) => {
                  const statusColors = {
                    pending: "bg-amber-50 text-amber-700 border-amber-200",
                    contacted: "bg-indigo-50 text-indigo-700 border-indigo-200",
                    under_review: "bg-purple-50 text-purple-700 border-purple-200",
                    approved: "bg-emerald-50 text-emerald-700 border-emerald-200",
                    rejected: "bg-red-50 text-red-700 border-red-200",
                  };

                  return (
                    <tr key={app._id} className="hover:bg-gray-50/70 transition">
                      <td className="py-3 px-4 font-mono font-bold text-gray-600">
                        {app.applicationId}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-gray-900">{app.firmName}</div>
                        <div className="text-[11px] text-gray-500">{app.fullName} • {app.phone}</div>
                        {app.companyGstin && (
                          <span className="inline-block mt-0.5 px-1.5 py-0.5 bg-stone-100 text-stone-700 font-mono text-[9px] font-bold rounded">
                            GSTIN: {app.companyGstin}
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-semibold text-gray-800">{app.city}, {app.state}</div>
                        <div className="text-[11px] font-mono text-gray-500">PIN: {app.pincode}</div>
                      </td>
                      <td className="py-3 px-4 font-bold text-gray-700">
                        {distributorTierLabels[app.distributorType] || app.distributorType}
                      </td>
                      <td className="py-3 px-4 font-bold text-emerald-700">
                        {app.investmentBudget}
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        <div>{godownLabels[app.godownSpace] || app.godownSpace}</div>
                        <div className="text-[10px] text-gray-400">
                          {app.vehiclesCount} veh. • {app.salesTeamSize} reps
                        </div>
                      </td>
                      <td className="py-3 px-4">
                        <span
                          className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border ${
                            statusColors[app.status] || "bg-gray-50 text-gray-600"
                          }`}
                        >
                          {app.status.replace("_", " ")}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => handleOpenReview(app)}
                            className="px-3 py-1.5 bg-[#6B7F59]/10 hover:bg-[#6B7F59]/20 text-[#425235] font-bold rounded-lg text-xs transition cursor-pointer"
                          >
                            Review &amp; Email
                          </button>
                          <button
                            onClick={() =>
                              setDeleteTargetApp({
                                id: app._id,
                                name: `${app.firmName} (${app.fullName})`,
                                appId: app.applicationId,
                              })
                            }
                            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                            title="Delete Lead"
                          >
                            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                              <path d="M3 6h18" />
                              <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                              <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
                            </svg>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detailed Review & Email Response Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[92vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <div>
                <span className="text-[10px] font-mono font-bold text-gray-400 uppercase tracking-widest block">
                  Distributor Application
                </span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">
                  {selectedApp.firmName} ({selectedApp.applicationId})
                </h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="w-8 h-8 rounded-full bg-white border border-gray-200 text-gray-400 hover:text-gray-700 flex items-center justify-center transition cursor-pointer"
              >
                ✕
              </button>
            </div>

            {/* Modal Tabs: Profile Details vs Email Dispatcher */}
            <div className="flex border-b border-gray-100 px-6 bg-white gap-4">
              <button
                onClick={() => setActiveModalTab("details")}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer ${
                  activeModalTab === "details"
                    ? "border-[#6B7F59] text-[#425235]"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                📋 Partner Profile &amp; Audit
              </button>
              <button
                onClick={() => setActiveModalTab("email")}
                className={`py-3 text-xs font-bold border-b-2 transition cursor-pointer flex items-center gap-1.5 ${
                  activeModalTab === "email"
                    ? "border-[#6B7F59] text-[#425235]"
                    : "border-transparent text-gray-400 hover:text-gray-700"
                }`}
              >
                ✉️ Send Email Response
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-5 flex-1">
              {activeModalTab === "details" ? (
                <>
                  {/* Grid Profile Details */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-gray-50/80 p-4 rounded-2xl border border-gray-100 text-xs">
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Contact Person</span>
                      <span className="font-bold text-gray-800">{selectedApp.fullName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Firm / Agency</span>
                      <span className="font-bold text-gray-800">{selectedApp.firmName}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Phone Number</span>
                      <a href={`tel:${selectedApp.phone}`} className="font-bold text-blue-600 hover:underline">
                        {selectedApp.phone}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Email Address</span>
                      <a href={`mailto:${selectedApp.email}`} className="font-bold text-blue-600 hover:underline">
                        {selectedApp.email}
                      </a>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Base Location</span>
                      <span className="font-bold text-gray-800">
                        {selectedApp.city}, {selectedApp.state} - {selectedApp.pincode}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">GSTIN Number</span>
                      <span className="font-mono font-bold text-gray-800">{selectedApp.companyGstin || "—"}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Distributor Tier</span>
                      <span className="font-bold text-gray-800">
                        {distributorTierLabels[selectedApp.distributorType] || selectedApp.distributorType}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Working Capital</span>
                      <span className="font-bold text-emerald-700">{selectedApp.investmentBudget}</span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Godown Storage</span>
                      <span className="font-bold text-gray-800">
                        {godownLabels[selectedApp.godownSpace] || selectedApp.godownSpace}
                      </span>
                    </div>
                    <div>
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Fleet &amp; Sales Team</span>
                      <span className="font-bold text-gray-800">
                        {selectedApp.vehiclesCount} vehicles • {selectedApp.salesTeamSize} sales reps
                      </span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Territory / Area Reach</span>
                      <span className="font-bold text-gray-800">{selectedApp.territoryCovered || "Local Territory"}</span>
                    </div>
                    <div className="sm:col-span-2">
                      <span className="text-gray-400 block text-[10px] uppercase font-bold">Existing Brands Handled &amp; Experience</span>
                      <span className="text-gray-700">
                        {selectedApp.yearsInBusiness} • {selectedApp.existingBrands || "None mentioned"}
                      </span>
                    </div>
                    {selectedApp.notes && (
                      <div className="sm:col-span-2">
                        <span className="text-gray-400 block text-[10px] uppercase font-bold">Applicant Notes</span>
                        <span className="text-gray-700 italic">{selectedApp.notes}</span>
                      </div>
                    )}
                  </div>

                  {/* Status Selection */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Review Status</label>
                    <div className="flex flex-wrap gap-2">
                      {[
                        { label: "Pending", value: "pending" },
                        { label: "Contacted", value: "contacted" },
                        { label: "Under Review", value: "under_review" },
                        { label: "Approved Partner", value: "approved" },
                        { label: "Rejected", value: "rejected" },
                      ].map((st) => (
                        <button
                          key={st.value}
                          type="button"
                          onClick={() => setSelectedApp({ ...selectedApp, status: st.value })}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition cursor-pointer ${
                            selectedApp.status === st.value
                              ? "bg-[#6B7F59] text-white border-[#6B7F59]"
                              : "bg-white text-gray-600 border-gray-200 hover:bg-gray-50"
                          }`}
                        >
                          {st.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Internal Notes */}
                  <div className="space-y-2">
                    <label className="text-xs font-bold text-gray-700 block">Internal Team Audit Notes</label>
                    <textarea
                      rows={3}
                      value={editingNotes}
                      onChange={(e) => setEditingNotes(e.target.value)}
                      placeholder="Add notes from telephonic interview, background check, target counter discussions..."
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/20 focus:border-[#6B7F59] transition"
                    />
                  </div>
                </>
              ) : (
                /* Tab 2: Send Email Response */
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-[#F0F4EC] rounded-xl border border-[#6B7F59]/20 text-[#334229] space-y-1">
                    <p className="font-bold">✉️ Direct Email Dispatch to Applicant</p>
                    <p className="text-[11px]">
                      Recipient: <strong>{selectedApp.fullName}</strong> &lt;{selectedApp.email}&gt;
                    </p>
                  </div>

                  {/* Template quick loader */}
                  <div className="space-y-1.5">
                    <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest block">
                      Quick Response Templates:
                    </span>
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          setEmailSubject(`Foodville FMCG Distributorship Rate Card & Dossier [${selectedApp.applicationId}]`);
                          setEmailMessage(
                            `Dear ${selectedApp.fullName},\n\nThank you for applying for Foodville FMCG Distributorship for ${selectedApp.city}.\n\nWe have reviewed your distribution profile for ${selectedApp.firmName} and are delighted to share our official Product Catalogue, Margin Structure, and Opening Stock Schemes.\n\nPlease review the commercial terms and let us know your preferred opening order configuration.\n\nWarm regards,\nNational Channel Expansion Desk\nFoodville Consumer Products Pvt. Ltd.`
                          );
                        }}
                        className="px-2.5 py-1 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                      >
                        📄 Rate Card &amp; Catalogue
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailSubject(`Foodville Distributorship - Territory Approval & Agreement [${selectedApp.applicationId}]`);
                          setEmailMessage(
                            `Dear ${selectedApp.fullName},\n\nCongratulations! We are pleased to formally approve ${selectedApp.firmName} as an Authorized Foodville Channel Partner for ${selectedApp.city}, ${selectedApp.state}.\n\nOur legal and operations desk will now dispatch the formal Distributorship Agreement and assign your Dedicated Territory Relationship Manager.\n\nWarm regards,\nNational Sales Director\nFoodville Consumer Products Pvt. Ltd.`
                          );
                        }}
                        className="px-2.5 py-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                      >
                        ✅ Territory Approval
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setEmailSubject(`Foodville Distributorship Application Update [${selectedApp.applicationId}]`);
                          setEmailMessage(
                            `Dear ${selectedApp.fullName},\n\nThank you for submitting your application for Foodville FMCG Distributorship.\n\nAfter reviewing the territory coverage in ${selectedApp.city}, we regret to inform you that our authorized distributor quota for this territory is currently fulfilled. We will retain your profile in our active registry for future expansion.\n\nWarm regards,\nChannel Expansion Desk\nFoodville Consumer Products Pvt. Ltd.`
                          );
                        }}
                        className="px-2.5 py-1 bg-red-50 hover:bg-red-100 text-red-700 font-bold text-[11px] rounded-lg transition cursor-pointer"
                      >
                        ❌ Territory Full / Decline
                      </button>
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 block">Email Subject</label>
                    <input
                      type="text"
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      className="w-full px-3 py-2 bg-gray-50 border border-gray-200 rounded-xl text-xs font-semibold focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/20 focus:border-[#6B7F59] transition"
                    />
                  </div>

                  <div className="space-y-1">
                    <label className="font-bold text-gray-700 block">Message Body</label>
                    <textarea
                      rows={8}
                      value={emailMessage}
                      onChange={(e) => setEmailMessage(e.target.value)}
                      className="w-full p-3 bg-gray-50 border border-gray-200 rounded-xl text-xs font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/20 focus:border-[#6B7F59] transition leading-relaxed"
                    />
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 bg-gray-50 border-t border-gray-100 flex items-center justify-between">
              <button
                onClick={() =>
                  setDeleteTargetApp({
                    id: selectedApp._id,
                    name: `${selectedApp.firmName} (${selectedApp.fullName})`,
                    appId: selectedApp.applicationId,
                  })
                }
                className="text-red-600 hover:text-red-700 font-bold text-xs px-3 py-2 rounded-xl hover:bg-red-50 transition cursor-pointer"
              >
                Delete Application
              </button>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 bg-white border border-gray-200 hover:bg-gray-50 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
                >
                  Cancel
                </button>

                {activeModalTab === "details" ? (
                  <button
                    onClick={() => handleUpdate(selectedApp._id, selectedApp.status, editingNotes)}
                    disabled={updating}
                    className="px-5 py-2 bg-[#6B7F59] hover:bg-[#56684A] text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50"
                  >
                    {updating ? "Saving..." : "Save Changes"}
                  </button>
                ) : (
                  <button
                    onClick={handleSendEmail}
                    disabled={sendingEmail}
                    className="px-5 py-2 bg-[#6B7F59] hover:bg-[#56684A] text-white font-bold text-xs rounded-xl shadow-sm transition active:scale-95 cursor-pointer disabled:opacity-50 flex items-center gap-1.5"
                  >
                    {sendingEmail ? "Dispatching..." : "Send Official Email"}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delete Single Lead Confirmation Modal */}
      {deleteTargetApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-red-100 text-red-600 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Delete Distributor Lead?
              </h3>
              <p className="text-xs text-gray-500">
                Are you sure you want to permanently delete lead{" "}
                <strong className="text-gray-800">{deleteTargetApp.name}</strong> ({deleteTargetApp.appId})?
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setDeleteTargetApp(null)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmDeleteOne}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Purge All Bot Spam Leads Modal */}
      {isPurgingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl space-y-4 animate-in fade-in zoom-in-95 duration-200">
            <div className="w-12 h-12 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mx-auto">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="text-center space-y-1">
              <h3 className="text-lg font-black text-gray-900 tracking-tight">
                Purge All Bot Spam Leads?
              </h3>
              <p className="text-xs text-gray-500">
                This will automatically scan and delete all fake bot leads with random strings or invalid phone numbers. Valid applicant inquiries will remain safe.
              </p>
            </div>
            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsPurgingModalOpen(false)}
                className="flex-1 py-2.5 bg-gray-100 hover:bg-gray-200 text-gray-700 font-bold text-xs rounded-xl transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={confirmPurgeSpam}
                className="flex-1 py-2.5 bg-red-600 hover:bg-red-700 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow-sm"
              >
                Purge Bot Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

