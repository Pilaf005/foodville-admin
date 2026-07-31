"use client";

import React, { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function fetchBlockedPincodes(search = "") {
  const res = await fetch(`/api/admin/blocked-pincodes?q=${encodeURIComponent(search)}`);
  if (!res.ok) throw new Error("Failed to fetch blocked pincodes");
  const data = await res.json();
  return data.data || [];
}

async function addBlockedPincodes(payload) {
  const res = await fetch("/api/admin/blocked-pincodes", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload)
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to block pincodes");
  return data.data;
}

async function deleteBlockedPincode(id) {
  const res = await fetch(`/api/admin/blocked-pincodes?id=${encodeURIComponent(id)}`, {
    method: "DELETE"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to delete pincode");
  return data.data;
}

async function toggleBlockedPincode(id) {
  const res = await fetch(`/api/admin/blocked-pincodes?id=${encodeURIComponent(id)}`, {
    method: "PATCH"
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || "Failed to toggle status");
  return data.data;
}

async function fetchAreasForPincode(pincode) {
  if (!pincode || pincode.length !== 6) return { areas: [] };
  const res = await fetch(`/api/admin/pincode-areas?pincode=${pincode}`);
  if (!res.ok) return { areas: [] };
  const data = await res.json();
  return data.data || { areas: [] };
}

export default function AdminPincodesPage() {
  const queryClient = useQueryClient();
  const [search, setSearch] = useState("");
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState(null); // for editing an existing item
  const [deleteTarget, setDeleteTarget] = useState(null); // { id, pincode }

  // Form State
  const [pincodeInput, setPincodeInput] = useState("");
  const [reasonInput, setReasonInput] = useState("Non-serviceable location");
  const [blockTypeInput, setBlockTypeInput] = useState("ALL");
  const [isEntirePincodeBlocked, setIsEntirePincodeBlocked] = useState(true);
  const [selectedBlockedAreas, setSelectedBlockedAreas] = useState([]);
  const [availableAreas, setAvailableAreas] = useState([]);
  const [customAreaInput, setCustomAreaInput] = useState("");
  const [isFetchingAreas, setIsFetchingAreas] = useState(false);

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["admin", "blockedPincodes", search],
    queryFn: () => fetchBlockedPincodes(search),
  });

  // Auto-fetch sub-areas when entering a 6-digit pincode
  useEffect(() => {
    const cleanPin = pincodeInput.replace(/\D/g, "");
    if (cleanPin.length === 6) {
      setIsFetchingAreas(true);
      fetchAreasForPincode(cleanPin)
        .then((res) => {
          if (res.areas && res.areas.length > 0) {
            setAvailableAreas(res.areas);
          }
        })
        .finally(() => setIsFetchingAreas(false));
    } else {
      setAvailableAreas([]);
    }
  }, [pincodeInput]);

  const addMutation = useMutation({
    mutationFn: addBlockedPincodes,
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blockedPincodes"] });
      toast.success(`Successfully saved PIN code restriction for ${data.pincodes.join(", ")}`);
      closeModal();
    },
    onError: (err) => toast.error(err.message)
  });

  const deleteMutation = useMutation({
    mutationFn: deleteBlockedPincode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blockedPincodes"] });
      toast.success("PIN code unblocked successfully.");
      setDeleteTarget(null);
    },
    onError: (err) => toast.error(err.message)
  });

  const toggleMutation = useMutation({
    mutationFn: toggleBlockedPincode,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["admin", "blockedPincodes"] });
      toast.success("PIN code status updated.");
    },
    onError: (err) => toast.error(err.message)
  });

  const closeModal = () => {
    setIsModalOpen(false);
    setEditingItem(null);
    setPincodeInput("");
    setReasonInput("Non-serviceable location");
    setBlockTypeInput("ALL");
    setIsEntirePincodeBlocked(true);
    setSelectedBlockedAreas([]);
    setAvailableAreas([]);
    setCustomAreaInput("");
  };

  const openEditModal = (item) => {
    setEditingItem(item);
    setPincodeInput(item.pincode);
    setReasonInput(item.reason || "Non-serviceable location");
    setBlockTypeInput(item.blockType || "ALL");
    setIsEntirePincodeBlocked(item.isEntirePincodeBlocked !== false);
    setSelectedBlockedAreas(item.blockedAreas || []);
    setAvailableAreas(item.availableAreas || []);
    setIsModalOpen(true);
  };

  const handleAddSubmit = (e) => {
    e.preventDefault();
    const cleanPin = pincodeInput.replace(/\D/g, "");
    if (!cleanPin || cleanPin.length !== 6) {
      return toast.error("Please enter a valid 6-digit PIN code.");
    }
    if (!isEntirePincodeBlocked && selectedBlockedAreas.length === 0) {
      return toast.error("Please select at least one sub-area to block, or choose 'Block Entire PIN Code'.");
    }

    addMutation.mutate({
      pincodes: cleanPin,
      reason: reasonInput.trim(),
      blockType: blockTypeInput,
      isEntirePincodeBlocked,
      blockedAreas: isEntirePincodeBlocked ? [] : selectedBlockedAreas,
      availableAreas: availableAreas
    });
  };

  const handleToggleArea = (areaName) => {
    setSelectedBlockedAreas((prev) =>
      prev.includes(areaName)
        ? prev.filter((a) => a !== areaName)
        : [...prev, areaName]
    );
  };

  const handleAddCustomArea = () => {
    if (!customAreaInput.trim()) return;
    const clean = customAreaInput.trim();
    if (!availableAreas.includes(clean)) {
      setAvailableAreas((prev) => [...prev, clean]);
    }
    if (!selectedBlockedAreas.includes(clean)) {
      setSelectedBlockedAreas((prev) => [...prev, clean]);
    }
    setCustomAreaInput("");
  };

  const totalBlocked = items.length;
  const blockedAllCount = items.filter((i) => i.blockType === "ALL").length;
  const blockedCodCount = items.filter((i) => i.blockType === "COD").length;

  return (
    <div className="space-y-6 pb-12">
      {/* Header & Action */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-gray-900 tracking-tight">Pincode & Area Management</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Restrict entire PIN codes or specific sub-areas/localities under a PIN code.
          </p>
        </div>

        <button
          onClick={() => { closeModal(); setIsModalOpen(true); }}
          className="inline-flex items-center justify-center gap-2 bg-[#6B7F59] hover:bg-[#596A49] text-white px-4 py-2.5 rounded-xl font-bold text-xs shadow-sm transition active:scale-95 shrink-0"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="12" y1="5" x2="12" y2="19" />
            <line x1="5" y1="12" x2="19" y2="12" />
          </svg>
          Block New PIN Code / Area
        </button>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-50 text-red-600 flex items-center justify-center text-lg shrink-0">
            🚫
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">Total Blocked</p>
            <p className="text-lg font-black text-gray-900 leading-tight">{totalBlocked}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center text-lg shrink-0">
            📦
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">All Deliveries Blocked</p>
            <p className="text-lg font-black text-gray-900 leading-tight">{blockedAllCount}</p>
          </div>
        </div>

        <div className="bg-white rounded-2xl p-4 border border-gray-200 shadow-sm flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center text-lg shrink-0">
            💵
          </div>
          <div>
            <p className="text-[11px] font-bold text-gray-400 uppercase tracking-wider">COD Only Blocked</p>
            <p className="text-lg font-black text-gray-900 leading-tight">{blockedCodCount}</p>
          </div>
        </div>
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
              placeholder="Search PIN code or area…"
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

          <span className="text-xs text-gray-400 font-semibold self-end sm:self-center">
            Showing {items.length} PIN code records
          </span>
        </div>

        {/* Data Table */}
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-gray-200 bg-gray-50/80 text-[10px] font-black uppercase text-gray-400 tracking-wider">
                <th className="py-3 px-4">PIN Code</th>
                <th className="py-3 px-4">Blocked Scope / Sub-Areas</th>
                <th className="py-3 px-4">Type</th>
                <th className="py-3 px-4">Reason / Note</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-700">
              {isLoading ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">Loading blocked PIN codes…</td>
                </tr>
              ) : items.length === 0 ? (
                <tr>
                  <td colSpan="6" className="py-8 text-center text-gray-400">
                    No blocked PIN codes found.
                  </td>
                </tr>
              ) : (
                items.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50/60 transition-colors">
                    <td className="py-3.5 px-4 font-mono font-bold text-gray-900 text-sm">
                      {item.pincode}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isEntirePincodeBlocked ? (
                        <span className="inline-flex items-center gap-1 font-bold text-red-600 bg-red-50 border border-red-200 px-2 py-0.5 rounded-lg text-[11px]">
                          <span>🚫</span> Entire PIN Code (All Areas)
                        </span>
                      ) : (
                        <div className="space-y-1">
                          <span className="inline-flex items-center gap-1 font-bold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-lg text-[11px]">
                            <span>📍</span> {item.blockedAreas?.length || 0} Specific Sub-Areas Blocked:
                          </span>
                          <div className="flex flex-wrap gap-1 max-w-xs">
                            {item.blockedAreas?.map((a, i) => (
                              <span key={i} className="bg-gray-100 border border-gray-200 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                                {a}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.blockType === "COD" ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700">
                          COD Only
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-red-100 text-red-700">
                          All Deliveries
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-gray-500">
                      {item.reason || "Non-serviceable location"}
                    </td>
                    <td className="py-3.5 px-4">
                      <button
                        onClick={() => toggleMutation.mutate(item.id)}
                        disabled={toggleMutation.isPending}
                        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition cursor-pointer ${
                          item.isActive
                            ? "bg-amber-50 text-amber-700 border border-amber-200 hover:bg-amber-100"
                            : "bg-gray-100 text-gray-500 border border-gray-200 hover:bg-gray-200"
                        }`}
                      >
                        <span className={`w-1.5 h-1.5 rounded-full ${item.isActive ? "bg-amber-500" : "bg-gray-400"}`} />
                        {item.isActive ? "Active Block" : "Disabled"}
                      </button>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => openEditModal(item)}
                        className="text-blue-600 hover:text-blue-800 font-bold text-xs hover:underline transition cursor-pointer"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(item)}
                        disabled={deleteMutation.isPending}
                        className="text-red-500 hover:text-red-700 font-bold text-xs hover:underline transition cursor-pointer"
                      >
                        Unblock
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add / Edit Block PIN Code & Areas Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-2xl border border-gray-100 space-y-4 animate-scale-in max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-gray-100 pb-3">
              <h3 className="text-base font-bold text-gray-900">
                {editingItem ? `Edit Blocked PIN (${editingItem.pincode})` : "Block Delivery PIN Code / Area"}
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

            <form onSubmit={handleAddSubmit} className="space-y-4">
              {/* PIN Code input */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">
                  6-Digit PIN Code <span className="text-red-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    maxLength={6}
                    value={pincodeInput}
                    onChange={(e) => setPincodeInput(e.target.value.replace(/\D/g, ""))}
                    placeholder="e.g. 110044"
                    disabled={!!editingItem}
                    className="w-full border border-gray-200 rounded-xl p-3 text-sm font-mono font-bold text-gray-900 placeholder:text-gray-400 focus:outline-none focus:border-[#6B7F59] disabled:bg-gray-100"
                    required
                  />
                  {isFetchingAreas && (
                    <span className="absolute right-3 top-3.5 text-[11px] text-[#6B7F59] font-bold animate-pulse">
                      Fetching sub-areas…
                    </span>
                  )}
                </div>
              </div>

              {/* Blocking Scope Selection (Entire vs Specific Areas) */}
              <div className="space-y-2 border border-gray-200 rounded-xl p-3 bg-gray-50/50">
                <label className="block text-xs font-bold text-gray-800">
                  Block Area Coverage:
                </label>
                
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="radio"
                      name="areaScope"
                      checked={isEntirePincodeBlocked}
                      onChange={() => setIsEntirePincodeBlocked(true)}
                      className="text-[#6B7F59] focus:ring-[#6B7F59]"
                    />
                    <span>🚫 Block Entire PIN Code (All sub-areas under {pincodeInput || "PIN"})</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-gray-800">
                    <input
                      type="radio"
                      name="areaScope"
                      checked={!isEntirePincodeBlocked}
                      onChange={() => setIsEntirePincodeBlocked(false)}
                      className="text-[#6B7F59] focus:ring-[#6B7F59]"
                    />
                    <span>📍 Select Specific Sub-Areas Only</span>
                  </label>
                </div>

                {/* Sub-areas Checklist */}
                {!isEntirePincodeBlocked && (
                  <div className="mt-3 pt-3 border-t border-gray-200 space-y-3">
                    <p className="text-[11px] font-bold text-gray-600">
                      Check the sub-areas/localities you want to BLOCK:
                    </p>

                    {availableAreas.length > 0 ? (
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 max-h-48 overflow-y-auto p-1">
                        {availableAreas.map((area) => {
                          const isChecked = selectedBlockedAreas.includes(area);
                          return (
                            <label
                              key={area}
                              className={`flex items-center gap-2 p-2 rounded-lg border text-xs font-medium cursor-pointer transition ${
                                isChecked
                                  ? "bg-red-50 border-red-300 text-red-800 font-bold"
                                  : "bg-white border-gray-200 text-gray-700 hover:bg-gray-50"
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isChecked}
                                onChange={() => handleToggleArea(area)}
                                className="rounded text-red-600 focus:ring-red-500"
                              />
                              <span className="truncate">{area}</span>
                            </label>
                          );
                        })}
                      </div>
                    ) : (
                      <p className="text-[11px] text-gray-400 italic">
                        {pincodeInput.length === 6
                          ? "No official post-office areas returned. You can add custom sub-areas below!"
                          : "Type a 6-digit PIN code to auto-load official sub-areas."}
                      </p>
                    )}

                    {/* Add Custom Sub-Area */}
                    <div className="flex gap-2 pt-1">
                      <input
                        type="text"
                        value={customAreaInput}
                        onChange={(e) => setCustomAreaInput(e.target.value)}
                        placeholder="Add custom colony/locality name (e.g. Okhla Phase 2 Pocket B)"
                        className="flex-1 border border-gray-200 rounded-xl px-3 py-1.5 text-xs text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                      />
                      <button
                        type="button"
                        onClick={handleAddCustomArea}
                        className="bg-gray-900 hover:bg-black text-white text-xs font-bold px-3 py-1.5 rounded-xl transition"
                      >
                        + Add Area
                      </button>
                    </div>
                  </div>
                )}
              </div>

              {/* Delivery vs COD restriction */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Restriction Type</label>
                <select
                  value={blockTypeInput}
                  onChange={(e) => setBlockTypeInput(e.target.value)}
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                >
                  <option value="ALL">Block All Deliveries (No orders allowed)</option>
                  <option value="COD">Block Cash on Delivery (COD) Only</option>
                </select>
              </div>

              {/* Reason */}
              <div>
                <label className="block text-xs font-bold text-gray-700 mb-1">Reason / Internal Note</label>
                <input
                  type="text"
                  value={reasonInput}
                  onChange={(e) => setReasonInput(e.target.value)}
                  placeholder="e.g. Unserviceable courier area, High RTO"
                  className="w-full border border-gray-200 rounded-xl p-2.5 text-xs font-semibold text-gray-900 focus:outline-none focus:border-[#6B7F59]"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-gray-100">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-4 py-2 rounded-xl text-xs font-bold text-gray-600 hover:bg-gray-100 transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={addMutation.isPending}
                  className="px-5 py-2 rounded-xl text-xs font-bold bg-[#6B7F59] hover:bg-[#596A49] text-white transition disabled:opacity-50"
                >
                  {addMutation.isPending ? "Saving…" : "Save Restriction"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* User-Friendly Unblock Confirmation Modal */}
      {deleteTarget && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-gray-100 text-center space-y-4 animate-scale-in">
            <div className="w-12 h-12 rounded-full bg-red-50 text-red-500 mx-auto grid place-items-center text-xl">
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                <path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z" />
                <circle cx="12" cy="10" r="3" />
                <line x1="4" y1="4" x2="20" y2="20" />
              </svg>
            </div>

            <div>
              <h3 className="text-base font-bold text-gray-900">
                Unblock PIN Code <span className="font-mono text-red-600">{deleteTarget.pincode}</span>?
              </h3>
              <p className="text-xs text-gray-500 mt-1.5 leading-relaxed">
                This will remove the delivery restriction and allow customers in PIN code <strong className="font-mono text-gray-800">{deleteTarget.pincode}</strong> to place orders again.
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
                onClick={() => deleteMutation.mutate(deleteTarget.id)}
                disabled={deleteMutation.isPending}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold transition shadow-sm disabled:opacity-50 active:scale-95"
              >
                {deleteMutation.isPending ? "Unblocking…" : "Yes, Unblock"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
