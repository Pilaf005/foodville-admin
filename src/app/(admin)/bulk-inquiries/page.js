"use client";

import { useState, useEffect } from "react";

export default function BulkInquiriesPage() {
  const [items, setItems] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, contacted: 0, quoted: 0, closed: 0 });
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedInquiry, setSelectedInquiry] = useState(null);
  const [editingNotes, setEditingNotes] = useState("");
  const [updating, setUpdating] = useState(false);

  const fetchInquiries = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filterStatus !== "all") params.append("status", filterStatus);
      if (searchTerm) params.append("search", searchTerm);

      const res = await fetch(`/api/admin/bulk-inquiries?${params.toString()}`);
      const data = await res.json();
      if (res.ok) {
        setItems(data.data.items || []);
        setStats(data.data.stats || { total: 0, pending: 0, contacted: 0, quoted: 0, closed: 0 });
      }
    } catch (err) {
      console.error("Failed to load inquiries:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInquiries();
  }, [filterStatus, searchTerm]);

  const handleUpdate = async (id, status, notes) => {
    setUpdating(true);
    try {
      const res = await fetch(`/api/admin/bulk-inquiries/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status, internalNotes: notes }),
      });
      if (res.ok) {
        fetchInquiries();
        setSelectedInquiry(null);
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
          <h1 className="text-xl font-black text-gray-900 tracking-tight">Wholesale & Bulk B2B Inquiries</h1>
          <p className="text-xs text-gray-500 font-medium">Review and issue price quotes for custom wholesale requests.</p>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {[
          { label: "Total Requests", val: stats.total, color: "text-blue-600 bg-blue-50 border-blue-100" },
          { label: "Pending Review", val: stats.pending, color: "text-amber-600 bg-amber-50 border-amber-100" },
          { label: "Contacted Team", val: stats.contacted, color: "text-indigo-600 bg-indigo-50 border-indigo-100" },
          { label: "Quoted Issued", val: stats.quoted, color: "text-emerald-600 bg-emerald-50 border-emerald-100" },
          { label: "Completed Leads", val: stats.closed, color: "text-gray-600 bg-gray-50 border-gray-100" },
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
        <div className="flex gap-1 bg-gray-50 p-1 rounded-xl w-full sm:w-auto">
          {[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Contacted", value: "contacted" },
            { label: "Quoted", value: "quoted" },
            { label: "Closed", value: "closed" },
          ].map((tab) => (
            <button
              key={tab.value}
              onClick={() => setFilterStatus(tab.value)}
              className={`flex-1 sm:flex-initial px-4 py-2 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
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
            placeholder="Search by name, company, email..."
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
        <div className="py-20 text-center text-xs text-gray-400 font-bold animate-pulse">Loading wholesale leads…</div>
      ) : items.length === 0 ? (
        <div className="py-20 text-center bg-white rounded-3xl border border-gray-100 text-gray-400 text-xs font-bold">
          No bulk inquiries matching criteria.
        </div>
      ) : (
        <div className="bg-white rounded-3xl border border-gray-100 overflow-hidden shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-100 text-[10px] font-black text-gray-400 uppercase tracking-widest">
                  <th className="px-6 py-4">Inquiry ID</th>
                  <th className="px-6 py-4">Contact Person</th>
                  <th className="px-6 py-4">Required Product</th>
                  <th className="px-6 py-4 text-center">Volume (KG)</th>
                  <th className="px-6 py-4">Destination</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100 text-xs font-semibold text-gray-800">
                {items.map((item) => (
                  <tr key={item._id} className="hover:bg-gray-50/50">
                    <td className="px-6 py-4 font-mono text-gray-900 font-bold">{item.inquiryId}</td>
                    <td className="px-6 py-4">
                      <div className="font-bold text-gray-950">{item.fullName}</div>
                      <div className="text-[10px] text-gray-400 mt-0.5">{item.companyName || "Individual Buyer"}</div>
                    </td>
                    <td className="px-6 py-4">{item.productName}</td>
                    <td className="px-6 py-4 text-center text-emerald-600 font-black">{item.quantityKg} kg</td>
                    <td className="px-6 py-4">{item.deliveryPincode}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`inline-block px-2.5 py-1 rounded-full text-[10px] font-black uppercase tracking-wider ${
                          item.status === "pending"
                            ? "bg-amber-100 text-amber-800"
                            : item.status === "contacted"
                            ? "bg-indigo-100 text-indigo-800"
                            : item.status === "quoted"
                            ? "bg-emerald-100 text-emerald-800"
                            : "bg-gray-100 text-gray-800"
                        }`}
                      >
                        {item.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => {
                          setSelectedInquiry(item);
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
      {selectedInquiry && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-8 space-y-6 shadow-2xl border border-gray-100 animate-slideUp">
            <div className="flex items-center justify-between border-b border-gray-100 pb-4">
              <div>
                <span className="text-[10px] font-bold text-gray-400 font-mono tracking-wide">{selectedInquiry.inquiryId}</span>
                <h3 className="text-lg font-black text-gray-900 tracking-tight">Review B2B Quotation Lead</h3>
              </div>
              <button
                onClick={() => setSelectedInquiry(null)}
                className="p-1 rounded-full hover:bg-gray-100 text-gray-400"
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6L6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs font-semibold text-gray-700 bg-gray-50 p-4 rounded-2xl border">
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Buyer Name</p>
                <p className="text-gray-950 mt-1">{selectedInquiry.fullName}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Company Entity</p>
                <p className="text-gray-950 mt-1">{selectedInquiry.companyName || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Phone</p>
                <a href={`tel:${selectedInquiry.phone}`} className="text-blue-600 hover:underline mt-1 block">
                  {selectedInquiry.phone}
                </a>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Email</p>
                <a href={`mailto:${selectedInquiry.email}`} className="text-blue-600 hover:underline mt-1 block">
                  {selectedInquiry.email}
                </a>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">GSTIN</p>
                <p className="text-gray-950 mt-1">{selectedInquiry.gstin || "N/A"}</p>
              </div>
              <div>
                <p className="text-[10px] text-gray-400 font-black uppercase">Destination Pincode</p>
                <p className="text-gray-950 mt-1">{selectedInquiry.deliveryPincode}</p>
              </div>
              <div className="col-span-2 border-t pt-2 mt-2">
                <p className="text-[10px] text-gray-400 font-black uppercase">Quotation Item & Volume</p>
                <p className="text-emerald-700 font-black text-sm mt-1">
                  {selectedInquiry.productName} ({selectedInquiry.quantityKg} kg)
                </p>
              </div>
            </div>

            {selectedInquiry.notes && (
              <div className="space-y-1">
                <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Buyer Requirements</label>
                <p className="text-xs bg-gray-50 border p-3 rounded-xl text-gray-700 leading-relaxed font-medium">
                  {selectedInquiry.notes}
                </p>
              </div>
            )}

            <div className="space-y-3">
              <label className="block text-[10px] font-black text-gray-400 uppercase tracking-widest">Internal Review Notes</label>
              <textarea
                rows={3}
                value={editingNotes}
                onChange={(e) => setEditingNotes(e.target.value)}
                placeholder="Log internal prices, quote dispatch details, shipment terms..."
                className="w-full px-3.5 py-2.5 text-xs rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-[#3D4A32]"
              />
            </div>

            <div className="flex gap-3 justify-end pt-2">
              <button
                onClick={() => handleUpdate(selectedInquiry._id, "contacted", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-100 transition cursor-pointer"
              >
                Mark Contacted
              </button>
              <button
                onClick={() => handleUpdate(selectedInquiry._id, "quoted", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-[#3D4A32] text-white text-xs font-bold shadow-md hover:bg-[#2C3624] transition cursor-pointer"
              >
                Issue Quote
              </button>
              <button
                onClick={() => handleUpdate(selectedInquiry._id, "closed", editingNotes)}
                disabled={updating}
                className="px-4 py-2.5 rounded-xl bg-gray-100 text-gray-900 text-xs font-bold hover:bg-gray-200 transition cursor-pointer"
              >
                Close Lead
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
