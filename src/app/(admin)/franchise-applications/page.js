"use client";

import { useState, useEffect } from "react";
import { toast } from "sonner";

export default function FranchiseApplicationsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, contacted: 0, under_review: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updating, setUpdating] = useState(false);
  const [purging, setPurging] = useState(false);

  // Custom Modal States
  const [deleteTargetApp, setDeleteTargetApp] = useState(null); // { id, name, appId }
  const [isPurgingModalOpen, setIsPurgingModalOpen] = useState(false);

  const fetchApplications = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/franchise-applications?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.data.items || []);
        setStats(data.data.stats || { total: 0, pending: 0, contacted: 0, under_review: 0, approved: 0, rejected: 0 });
      }
    } catch (err) {
      console.error("Failed to load franchise applications:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchApplications();
  }, [filterStatus, searchTerm]);

  const handleUpdate = async (id, status, notes) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/franchise-applications/${id}`, {
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

  const confirmDeleteOne = async () => {
    if (!deleteTargetApp) return;
    try {
      const res = await fetch(`/api/admin/franchise-applications/${deleteTargetApp.id}`, {
        method: "DELETE",
      });
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
      const res = await fetch("/api/admin/franchise-applications", {
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

  return (
    <div className="space-y-6">
      {/* Page Title & Purge Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Franchise & Distributorship Applications</h1>
          <p className="text-xs text-gray-500 font-medium">Review partnership applications from store operators and master distributors.</p>
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
          { label: "Approved Stores", val: stats.approved, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
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
              className={`px-3 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer shrink-0 ${
                filterStatus === tab.value ? "bg-white text-gray-950 shadow-sm" : "text-gray-500 hover:text-gray-950"
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
            placeholder="Search by name, city, phone..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-9 pr-4 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D4A32] bg-gray-50"
          />
          <svg
            className="absolute left-3.5 top-3.5 text-gray-400"
            width="12"
            height="12"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth="3"
            strokeLinecap="round"
          >
            <circle cx="11" cy="11" r="8" />
            <line x1="21" y1="21" x2="16.65" y2="16.65" />
          </svg>
        </div>
      </div>

      {/* Grid of Leads */}
      {loading ? (
        <div className="py-20 text-center text-xs text-gray-400 font-bold animate-pulse">Loading franchise leads…</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs font-bold">
          No franchise applications matching criteria.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">App ID</th>
                  <th className="px-6 py-4">Applicant Name</th>
                  <th className="px-6 py-4">Proposed Location</th>
                  <th className="px-6 py-4 text-center">Budget</th>
                  <th className="px-6 py-4">Property</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50 transition">
                    <td className="px-6 py-4 font-mono font-bold text-gray-900 text-xs">{item.applicationId}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.fullName}</div>
                      <div className="text-[11px] text-gray-400">{item.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-900">{item.city}, {item.state}</div>
                      <div className="text-[11px] text-gray-400">PIN: {item.pincode}</div>
                    </td>
                    <td className="px-6 py-4 text-center">
                      <span className="font-extrabold text-emerald-700 bg-emerald-50 border border-emerald-100 px-2 py-0.5 rounded-md text-[11px]">
                        {item.investmentBudget}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="capitalize">{String(item.propertyStatus || "").replace(/_/g, " ")}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : item.status === "contacted"
                            ? "bg-indigo-100 text-indigo-800"
                            : item.status === "under_review"
                            ? "bg-purple-100 text-purple-800"
                            : item.status === "approved"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-red-100 text-red-800"
                        }`}
                      >
                        {String(item.status || "").replace(/_/g, " ")}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedApp(item);
                          setEditingNotes(item.internalNotes || "");
                        }}
                        className="px-3 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase hover:bg-gray-100 transition cursor-pointer"
                      >
                        Review
                      </button>
                      <button
                        onClick={() => setDeleteTargetApp({ id: item._id, name: item.fullName, appId: item.applicationId })}
                        className="px-2.5 py-1.5 rounded-lg text-red-600 hover:bg-red-50 text-[10px] font-black uppercase transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Review Lead Modal */}
      {selectedApp && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 animate-slideUp max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wide">{selectedApp.applicationId}</span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Review Franchise Application</h3>
              </div>
              <button
                onClick={() => setSelectedApp(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="18" y1="6" x2="6" y2="18" />
                  <line x1="6" y1="6" x2="18" y2="18" />
                </svg>
              </button>
            </div>

            {/* Applicant Details */}
            <div className="grid grid-cols-2 gap-4 text-xs bg-gray-50 p-4 rounded-2xl border border-gray-100">
              <div>
                <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Applicant</span>
                <p className="font-bold text-gray-900 text-sm">{selectedApp.fullName}</p>
                <p className="text-gray-500 font-mono mt-0.5">{selectedApp.phone}</p>
                <a href={`mailto:${selectedApp.email}`} className="text-blue-600 hover:underline">{selectedApp.email}</a>
              </div>

              <div>
                <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Proposed Location</span>
                <p className="font-bold text-gray-900">{selectedApp.city}, {selectedApp.state}</p>
                <p className="text-gray-500">PIN: {selectedApp.pincode}</p>
              </div>

              <div>
                <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Investment Budget</span>
                <p className="font-bold text-emerald-700">{selectedApp.investmentBudget}</p>
              </div>

              <div>
                <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Property Status</span>
                <p className="font-bold text-gray-900 capitalize">{String(selectedApp.propertyStatus || "").replace(/_/g, " ")}</p>
              </div>

              {selectedApp.companyName && (
                <div className="col-span-2">
                  <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Company / GSTIN</span>
                  <p className="font-bold text-gray-900">{selectedApp.companyName} {selectedApp.companyGstin && `(${selectedApp.companyGstin})`}</p>
                </div>
              )}

              {selectedApp.notes && (
                <div className="col-span-2">
                  <span className="text-gray-400 uppercase text-[9px] font-black tracking-widest block mb-0.5">Applicant Remarks</span>
                  <p className="text-gray-700 italic bg-white p-2.5 rounded-xl border border-gray-200">{selectedApp.notes}</p>
                </div>
              )}
            </div>

            {/* Status Update Options */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-2">Update Application Status</label>
              <div className="flex flex-wrap gap-2">
                {[
                  { label: "Pending", val: "pending" },
                  { label: "Contacted", val: "contacted" },
                  { label: "Under Review", val: "under_review" },
                  { label: "Approved", val: "approved" },
                  { label: "Rejected", val: "rejected" },
                ].map((st) => (
                  <button
                    key={st.val}
                    type="button"
                    onClick={() => handleUpdate(selectedApp._id, st.val, editingNotes)}
                    disabled={updating}
                    className={`px-3 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                      selectedApp.status === st.val
                        ? "bg-[#3D4A32] text-white shadow-md"
                        : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                    }`}
                  >
                    {st.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Internal Notes */}
            <div>
              <label className="block text-xs font-bold text-gray-900 mb-1">Internal Team Notes</label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Add notes about calls, site visits, or legal checks..."
                className="w-full text-xs p-3 rounded-2xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D4A32]"
              />
            </div>

            <div className="flex items-center justify-between pt-2">
              <button
                type="button"
                onClick={() => {
                  setDeleteTargetApp({ id: selectedApp._id, name: selectedApp.fullName, appId: selectedApp.applicationId });
                }}
                className="px-4 py-2 rounded-xl text-xs font-bold text-red-600 hover:bg-red-50 transition cursor-pointer"
              >
                Delete Application
              </button>

              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedApp(null)}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-500 hover:bg-gray-100 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => handleUpdate(selectedApp._id, selectedApp.status, editingNotes)}
                  disabled={updating}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#3D4A32] hover:bg-[#2d3725] text-white shadow-md transition cursor-pointer"
                >
                  {updating ? "Saving..." : "Save Notes"}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* User-Friendly Delete Single Franchise Lead Confirmation Modal */}
      {deleteTargetApp && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete Franchise Lead?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete lead <strong className="font-mono text-red-600">{deleteTargetApp.appId}</strong> ({deleteTargetApp.name})?
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTargetApp(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeleteOne}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                Yes, Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* User-Friendly Purge All Bot Spam Franchise Leads Modal */}
      {isPurgingModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-amber-50 text-amber-600 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M3 6h18" />
                <path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6" />
                <path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Purge Bot Spam Leads?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                This will automatically remove all fake bot applications containing invalid phone numbers or PIN codes.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setIsPurgingModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95 cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPurgeSpam}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
              >
                Purge Leads
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
