"use client";

import React, { useState, useEffect, useCallback } from "react";
import { toast } from "sonner";
import { cn } from "@/lib/cn";

const INITIAL_FORM_STATE = {
  code: "",
  title: "",
  description: "",
  discountType: "percentage",
  discountValue: "",
  maxDiscount: "",
  minSubtotal: 0,
  firstOrderOnly: false,
  oncePerUser: false,
  showInCards: true,
  isActive: true,
  expiresAt: "",
  usageLimit: "",
};

export default function AdminCouponsPage() {
  const [coupons, setCoupons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  
  const [page, setPage] = useState(1);
  const [meta, setMeta] = useState(null);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCoupon, setEditingCoupon] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  
  const [formData, setFormData] = useState(INITIAL_FORM_STATE);
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchCoupons = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/admin/coupons?search=${encodeURIComponent(search)}&page=${page}&limit=20`);
      if (!res.ok) throw new Error("Failed to fetch coupons");
      const json = await res.json();
      if (json.success) {
        setCoupons(json.data || []);
        setMeta(json.meta);
      }
    } catch (err) {
      toast.error("Failed to load coupons");
    } finally {
      setLoading(false);
    }
  }, [search, page]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchCoupons();
    }, 300);
    return () => clearTimeout(timer);
  }, [fetchCoupons]);

  const openModal = (coupon = null) => {
    if (coupon) {
      setEditingCoupon(coupon);
      setFormData({
        code: coupon.code || "",
        title: coupon.title || "",
        description: coupon.description || "",
        discountType: coupon.discountType || "percentage",
        discountValue: coupon.discountValue || "",
        maxDiscount: coupon.maxDiscount || "",
        minSubtotal: coupon.minSubtotal || 0,
        firstOrderOnly: !!coupon.firstOrderOnly,
        oncePerUser: !!coupon.oncePerUser,
        showInCards: coupon.showInCards !== false,
        isActive: coupon.isActive !== false,
        expiresAt: coupon.expiresAt ? new Date(coupon.expiresAt).toISOString().split('T')[0] : "",
        usageLimit: coupon.usageLimit || "",
      });
    } else {
      setEditingCoupon(null);
      setFormData(INITIAL_FORM_STATE);
    }
    setIsModalOpen(true);
  };

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingCoupon(null);
    setFormData(INITIAL_FORM_STATE);
  };

  const handleFormChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value
    }));
  };

  const saveCoupon = async (e) => {
    e.preventDefault();
    setIsSaving(true);
    try {
      const payload = {
        ...formData,
        code: formData.code.toUpperCase(),
        discountValue: Number(formData.discountValue),
        maxDiscount: formData.maxDiscount ? Number(formData.maxDiscount) : null,
        minSubtotal: Number(formData.minSubtotal) || 0,
        usageLimit: formData.usageLimit ? Number(formData.usageLimit) : null,
        expiresAt: formData.expiresAt ? new Date(formData.expiresAt).toISOString() : null,
      };

      const url = editingCoupon 
        ? `/api/admin/coupons/${editingCoupon._id}` 
        : `/api/admin/coupons`;
        
      const res = await fetch(url, {
        method: editingCoupon ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || json.error || json.message || "Failed to save coupon");
      }

      toast.success(editingCoupon ? "Coupon updated successfully" : "Coupon created successfully");
      closeModal();
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsSaving(false);
    }
  };

  const toggleStatus = async (coupon) => {
    try {
      const res = await fetch(`/api/admin/coupons/${coupon._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...coupon, isActive: !coupon.isActive }),
      });
      if (!res.ok) throw new Error("Failed to update status");
      toast.success(`Coupon ${coupon.isActive ? "disabled" : "activated"}`);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    }
  };

  const deleteCoupon = async () => {
    if (!deleteTarget) return;
    setIsDeleting(true);
    try {
      const res = await fetch(`/api/admin/coupons/${deleteTarget._id}`, {
        method: "DELETE",
      });
      if (!res.ok) throw new Error("Failed to delete coupon");
      toast.success("Coupon deleted successfully");
      setDeleteTarget(null);
      fetchCoupons();
    } catch (err) {
      toast.error(err.message);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Coupons & Offers</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Manage discount codes and promotional offers
          </p>
        </div>

        <button
          onClick={() => openModal()}
          className="inline-flex items-center justify-center gap-2 bg-[#6B7F59] hover:bg-[#5A6D4A] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
        >
          + Create Coupon
        </button>
      </div>

      {/* Table Container */}
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        {/* Filter Bar */}
        <div className="p-4 border-b border-gray-100 flex flex-col sm:flex-row items-center justify-between gap-3 bg-gray-50/50">
          <div className="relative w-full sm:w-72">
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by code or title…"
              className="w-full bg-white border border-gray-200 rounded-xl px-3 py-2 pl-9 text-xs font-semibold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#6B7F59]"
            />
            <svg
              width="14"
              height="14"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2.5"
              className="absolute left-3 top-2.5 text-gray-400 pointer-events-none"
            >
              <circle cx="11" cy="11" r="8" />
              <path d="m21 21-4.3-4.3" />
            </svg>
          </div>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[800px]">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="py-3 px-4">Code</th>
                <th className="py-3 px-4">Title</th>
                <th className="py-3 px-4">Discount</th>
                <th className="py-3 px-4">Min Subtotal</th>
                <th className="py-3 px-4">Visibility</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Usage</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
              {loading ? (
                <tr>
                  <td colSpan="8" className="py-8">
                    <div className="flex flex-col space-y-3 px-4">
                      {Array.from({ length: 3 }).map((_, i) => (
                        <div key={i} className="h-10 bg-gray-100 rounded-xl animate-pulse w-full"></div>
                      ))}
                    </div>
                  </td>
                </tr>
              ) : coupons.length === 0 ? (
                <tr>
                  <td colSpan="8" className="py-12 text-center text-gray-400">
                    <div className="flex flex-col items-center justify-center">
                      <div className="w-12 h-12 mb-3 text-gray-300">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                          <path strokeLinecap="round" strokeLinejoin="round" d="M21.75 9v.906a2.25 2.25 0 01-1.183 1.981l-6.478 3.488M2.25 9v.906a2.25 2.25 0 001.183 1.981l6.478 3.488m8.839 2.51l-4.66-2.51m0 0l-1.023-.55a2.25 2.25 0 00-2.134 0l-1.022.55m0 0l-4.661 2.51m16.5 1.615a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V8.844a2.25 2.25 0 011.183-1.98l7.5-4.04a2.25 2.25 0 012.134 0l7.5 4.04a2.25 2.25 0 011.183 1.98V19.5z" />
                        </svg>
                      </div>
                      <p>No coupons yet. Create your first coupon!</p>
                    </div>
                  </td>
                </tr>
              ) : (
                coupons.map((coupon) => (
                  <tr key={coupon._id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-sm uppercase">
                      {coupon.code}
                    </td>
                    <td className="py-3.5 px-4">
                      {coupon.title}
                    </td>
                    <td className="py-3.5 px-4">
                      {coupon.discountType === "percentage" ? `${coupon.discountValue}%` : `₹${coupon.discountValue}`}
                      {coupon.maxDiscount > 0 && <span className="block text-[10px] text-gray-500 mt-0.5">up to ₹{coupon.maxDiscount}</span>}
                    </td>
                    <td className="py-3.5 px-4">
                      {coupon.minSubtotal > 0 ? `₹${coupon.minSubtotal}` : "-"}
                    </td>
                    <td className="py-3.5 px-4">
                      {coupon.showInCards ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-green-50 text-green-700 border border-green-200">
                          Public
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-bold bg-gray-100 text-gray-600 border border-gray-200">
                          Hidden
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleStatus(coupon)}
                        className={cn(
                          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer border",
                          coupon.isActive 
                            ? "bg-green-50 text-green-700 border-green-200 hover:bg-green-100" 
                            : "bg-red-50 text-red-600 border-red-200 hover:bg-red-100"
                        )}
                      >
                        <span className={cn("w-1.5 h-1.5 rounded-full", coupon.isActive ? "bg-green-500" : "bg-red-500")} />
                        {coupon.isActive ? "Active" : "Inactive"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {coupon.usageCount || 0} / {coupon.usageLimit || "∞"}
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-3">
                      <button
                        onClick={() => openModal(coupon)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(coupon)}
                        className="text-red-500 hover:text-red-700 font-bold text-xs hover:underline transition cursor-pointer"
                      >
                        Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination Details (if any) */}
        {meta && meta.totalPages > 1 && (
          <div className="flex items-center justify-center gap-2 p-4 border-t border-gray-100">
            <button disabled={page <= 1} onClick={() => setPage(page - 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition">
              ← Prev
            </button>
            <span className="text-xs text-gray-500 font-semibold">Page {page} of {meta.totalPages}</span>
            <button disabled={page >= meta.totalPages} onClick={() => setPage(page + 1)}
              className="px-3 py-1.5 text-xs font-bold rounded-xl border border-gray-200 disabled:opacity-40 hover:border-[#6B7F59] transition">
              Next →
            </button>
          </div>
        )}
      </div>

      {/* Create / Edit Modal Overlay */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-2xl w-full p-6 shadow-2xl border border-gray-100 flex flex-col max-h-[90vh]">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3 shrink-0">
              <h3 className="text-base font-bold text-gray-900">
                {editingCoupon ? "Edit Coupon" : "Create New Coupon"}
              </h3>
              <button
                onClick={closeModal}
                className="text-gray-400 hover:text-gray-600 p-1 rounded-lg hover:bg-gray-100 transition"
              >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
            </div>

            <form onSubmit={saveCoupon} className="overflow-y-auto py-4 space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Coupon Code <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="code"
                    value={formData.code}
                    onChange={(e) => setFormData(prev => ({ ...prev, code: e.target.value.toUpperCase() }))}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm font-mono font-bold text-gray-900 focus:outline-none focus:border-[#6B7F59] uppercase"
                    placeholder="e.g. WELCOME10"
                    required
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Title <span className="text-red-500">*</span></label>
                  <input
                    type="text"
                    name="title"
                    value={formData.title}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                    placeholder="e.g. 10% Off First Order"
                    required
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Description (Optional)</label>
                <textarea
                  name="description"
                  value={formData.description}
                  onChange={handleFormChange}
                  rows={2}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                  placeholder="Short description of the offer..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Type</label>
                  <select
                    name="discountType"
                    value={formData.discountType}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Discount Value <span className="text-red-500">*</span></label>
                  <input
                    type="number"
                    name="discountValue"
                    value={formData.discountValue}
                    onChange={handleFormChange}
                    min="0"
                    step="any"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                    placeholder={formData.discountType === "percentage" ? "10" : "150"}
                    required
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Min Subtotal (₹)</label>
                  <input
                    type="number"
                    name="minSubtotal"
                    value={formData.minSubtotal}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                    placeholder="0"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Max Discount Cap (₹)</label>
                  <input
                    type="number"
                    name="maxDiscount"
                    value={formData.maxDiscount}
                    onChange={handleFormChange}
                    min="0"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59] disabled:bg-gray-100 disabled:opacity-60"
                    placeholder="Optional cap for % discounts"
                    disabled={formData.discountType !== "percentage"}
                  />
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Expiry Date</label>
                  <input
                    type="date"
                    name="expiresAt"
                    value={formData.expiresAt}
                    onChange={handleFormChange}
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">Total Usage Limit</label>
                  <input
                    type="number"
                    name="usageLimit"
                    value={formData.usageLimit}
                    onChange={handleFormChange}
                    min="1"
                    className="w-full border border-gray-200 rounded-xl p-2.5 text-sm text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                    placeholder="Leave empty for unlimited"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-2">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="firstOrderOnly" checked={formData.firstOrderOnly} onChange={handleFormChange} className="w-4 h-4 text-[#6B7F59] rounded focus:ring-[#6B7F59]" />
                  <span className="text-sm font-semibold text-gray-800">First Order Only</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="oncePerUser" checked={formData.oncePerUser} onChange={handleFormChange} className="w-4 h-4 text-[#6B7F59] rounded focus:ring-[#6B7F59]" />
                  <span className="text-sm font-semibold text-gray-800">Limit Once Per User</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="showInCards" checked={formData.showInCards} onChange={handleFormChange} className="w-4 h-4 text-[#6B7F59] rounded focus:ring-[#6B7F59]" />
                  <span className="text-sm font-semibold text-gray-800">Show in Public Coupon Cards</span>
                </label>
                <label className="flex items-center gap-3 cursor-pointer">
                  <input type="checkbox" name="isActive" checked={formData.isActive} onChange={handleFormChange} className="w-4 h-4 text-[#6B7F59] rounded focus:ring-[#6B7F59]" />
                  <span className="text-sm font-semibold text-gray-800">Active</span>
                </label>
              </div>
              
              <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-100 shrink-0">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2.5 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-6 py-2.5 rounded-xl text-xs font-bold bg-[#6B7F59] hover:bg-[#5A6D4A] text-white transition disabled:opacity-50"
                >
                  {isSaving ? "Saving..." : "Save Coupon"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <line x1="15" y1="9" x2="9" y2="15" />
                <line x1="9" y1="9" x2="15" y2="15" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Delete Coupon <span className="font-mono text-red-600 uppercase">{deleteTarget.code}</span>?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                Are you sure you want to delete this coupon? This action cannot be undone.
              </p>
            </div>

            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                type="button"
                onClick={() => setDeleteTarget(null)}
                className="flex-1 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-700 hover:bg-gray-50 transition active:scale-95"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={deleteCoupon}
                disabled={isDeleting}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 active:scale-95"
              >
                {isDeleting ? "Deleting..." : "Yes, Delete"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
