"use client";

import { useState, useEffect } from "react";

export default function FranchiseApplicationsPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, contacted: 0, under_review: 0, approved: 0, rejected: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedApp, setSelectedApp] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updating, setUpdating] = useState(false);

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
        fetchApplications();
        setSelectedApp(null);
      }
    } catch (err) {
      console.error("Update failed:", err);
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Franchise & Distributorship Applications</h1>
          <p className="text-xs text-gray-500 font-medium">Review partnership applications from store operators and master distributors.</p>
        </div>
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
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-gray-900 font-bold">{item.applicationId}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-950">{item.fullName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.email}</div>
                    </td>
                    <td className="px-6 py-4">
                      <div>{item.city}, {item.state}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">PIN: {item.pincode}</div>
                    </td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-black">{item.investmentBudget}</td>
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
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedApp(item);
                          setEditingNotes(item.internalNotes || "");
                        }}
                        className="px-3.5 py-1.5 rounded-lg border border-gray-200 text-[10px] font-black uppercase hover:bg-gray-100 transition cursor-pointer"
                      >
                        Review
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
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 animate-slideUp">
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
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700 bg-gray-50 p-4 rounded-2xl border">
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Applicant Name</p>
                <p className="text-gray-950 mt-1">{selectedApp.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Phone</p>
                <a href={`tel:${selectedApp.phone}`} className="text-blue-600 hover:underline mt-1 block">
                  {selectedApp.phone}
                </a>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Email</p>
                <a href={`mailto:${selectedApp.email}`} className="text-blue-600 hover:underline mt-1 block">
                  {selectedApp.email}
                </a>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Proposed Location</p>
                <p className="text-gray-950 mt-1">{selectedApp.city}, {selectedApp.state} (PIN: {selectedApp.pincode})</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Investment Budget</p>
                <p className="text-gray-950 mt-1 font-bold text-emerald-700">{selectedApp.investmentBudget}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Property Status</p>
                <p className="text-gray-950 mt-1 capitalize">{String(selectedApp.propertyStatus || "").replace(/_/g, " ")}</p>
              </div>
              {selectedApp.companyName && (
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase">Company Name</p>
                  <p className="text-gray-950 mt-1">{selectedApp.companyName}</p>
                </div>
              )}
              {selectedApp.companyGstin && (
                <div>
                  <p className="text-[10px] text-gray-400 font-black uppercase">Company GSTIN</p>
                  <p className="text-gray-950 mt-1 font-mono">{selectedApp.companyGstin}</p>
                </div>
              )}
            </div>

            {selectedApp.experience && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Business Experience</label>
                <p className="text-xs bg-gray-50 border p-3 rounded-xl text-gray-700 leading-relaxed font-medium">
                  {selectedApp.experience}
                </p>
              </div>
            )}

            {selectedApp.notes && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Applicant Remarks</label>
                <p className="text-xs bg-gray-50 border p-3 rounded-xl text-gray-700 leading-relaxed font-medium">
                  {selectedApp.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Expansion Notes</label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Log call discussion, site feasibility notes, agreement schedule..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D4A32]"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => handleUpdate(selectedApp._id, "contacted", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Mark Contacted
              </button>
              <button
                onClick={() => handleUpdate(selectedApp._id, "under_review", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-purple-600 text-white text-xs font-bold shadow-md hover:bg-purple-700 transition cursor-pointer"
              >
                Under Review
              </button>
              <button
                onClick={() => handleUpdate(selectedApp._id, "approved", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-[#3D4A32] text-white text-xs font-bold shadow-md hover:bg-[#2C3624] transition cursor-pointer"
              >
                Approve
              </button>
              <button
                onClick={() => handleUpdate(selectedApp._id, "rejected", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-red-100 text-red-700 text-xs font-bold hover:bg-red-200 transition cursor-pointer"
              >
                Reject
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
