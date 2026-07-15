"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useAdminOrders, useAdminMutations, useShiprocketTracking } from "@/features/admin/hooks/useAdmin";
import AdminBadge from "@/features/admin/components/ui/AdminBadge";

const ORDER_STATUSES = ["placed", "confirmed", "shipped", "delivered", "cancelled"];
const STATUS_VARIANT = { delivered: "green", shipped: "blue", confirmed: "olive", placed: "amber", cancelled: "red" };

const TIMELINE_STEPS = [
  { key: "placed",    label: "Order Placed", sub: "Customer submitted the order" },
  { key: "confirmed", label: "Confirmed",    sub: "Order accepted & being prepared" },
  { key: "shipped",   label: "Shipped",      sub: "Package handed to delivery" },
  { key: "delivered", label: "Delivered",    sub: "Package received by customer" },
];
const STEP_ORDER     = ["placed", "confirmed", "shipped", "delivered"];

function fmt(n)     { return "₹" + Number(n).toLocaleString("en-IN"); }
function fmtDate(d) { return d ? new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" }) : "—"; }

export default function AdminOrderDetailPage({ params: paramsPromise }) {
  const { orderId } = use(paramsPromise);
  const { orders, isLoading } = useAdminOrders({ limit: 500 });
  const {
    updateOrderStatus,
    pushToShiprocket,
    assignShiprocketAWB,
    getShiprocketLabel,
  } = useAdminMutations();

  const order = orders.find((o) => o.orderId === orderId);
  const [note, setNote] = useState("");
  const [weight, setWeight] = useState("0.5");
  const [length, setLength] = useState("15");
  const [width, setWidth] = useState("15");
  const [height, setHeight] = useState("10");

  if (isLoading) {
    return <div className="p-10 text-center text-sm text-gray-400 animate-pulse">Loading order…</div>;
  }

  if (!order) {
    return (
      <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 space-y-3">
        <span className="text-4xl">🔍</span>
        <p className="text-sm font-bold text-gray-700">Order not found</p>
        <Link href="/orders" className="text-xs text-[#6B7F59] hover:underline font-bold">← Back to Orders</Link>
      </div>
    );
  }

  function handleStatusChange(newStatus) {
    updateOrderStatus.mutate({ orderId: order.orderId, status: newStatus, note });
    setNote("");
  }

  const ic = "w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-2.5 text-sm text-gray-800 placeholder:text-gray-400 focus:outline-none focus:ring-2 focus:ring-[#6B7F59]/30 focus:border-[#6B7F59] transition";

  return (
    <div className="space-y-5 max-w-5xl">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/orders" className="hover:text-[#6B7F59] transition font-semibold">Orders</Link>
        <span>/</span>
        <span className="text-gray-700 font-bold">{order.orderId}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left — main info */}
        <div className="lg:col-span-2 space-y-5">
          {/* Order items */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Items</h3>
              <AdminBadge variant={STATUS_VARIANT[order.status] ?? "gray"} dot>{order.status}</AdminBadge>
            </div>
            <div className="divide-y divide-gray-50">
              {order.items?.map((item, i) => (
                <div key={i} className="flex items-center gap-4 px-5 py-4">
                  <div className="w-12 h-12 rounded-xl overflow-hidden bg-gray-100 border border-gray-200 shrink-0">
                    {item.image && <img src={item.image} alt={item.name} className="w-full h-full object-cover" onError={(e) => { e.currentTarget.style.display = "none"; }} />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-bold text-gray-900 truncate">{item.name}</p>
                    <p className="text-[10px] text-gray-400 mt-0.5">Qty: {item.qty} × {fmt(item.price)}</p>
                  </div>
                  <p className="text-sm font-black text-gray-900 shrink-0">{fmt(item.qty * item.price)}</p>
                </div>
              ))}
            </div>
            {/* Amounts */}
            <div className="border-t border-gray-100 px-5 py-4 space-y-1.5">
              {order.amounts?.subtotal != null && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Subtotal</span><span>{fmt(order.amounts.subtotal)}</span>
                </div>
              )}
              {order.amounts?.delivery != null && (
                <div className="flex justify-between text-xs text-gray-500">
                  <span>Delivery</span>
                  <span>{order.amounts.delivery === 0 ? <span className="text-[#6B7F59] font-bold">Free</span> : fmt(order.amounts.delivery)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 pt-1 border-t border-gray-100">
                <span>Total</span><span>{fmt(order.amounts?.total ?? 0)}</span>
              </div>
            </div>
          </div>

          {/* Shiprocket Transit History Card */}
          {order.shipping?.shiprocketOrderId && (
            <ShipmentTrackingCard 
              orderId={order.orderId} 
              shiprocketOrderId={order.shipping.shiprocketOrderId} 
              awbCode={order.shipping.awbCode} 
            />
          )}

          {/* Timeline */}
          {order.timeline?.length > 0 && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Timeline</h3>
              </div>
              <div className="px-5 py-4 space-y-4">
                {[...order.timeline].reverse().map((t, i) => (
                  <div key={i} className="flex items-start gap-3">
                    <div className="w-2 h-2 rounded-full bg-[#6B7F59] mt-1.5 shrink-0" />
                    <div>
                      <p className="text-xs font-bold text-gray-800 capitalize">{t.status}</p>
                      {t.note && <p className="text-[10px] text-gray-400 mt-0.5">{t.note}</p>}
                      <p className="text-[10px] text-gray-400 mt-0.5">{fmtDate(t.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Right — details + actions */}
        <div className="space-y-5">
          {/* Customer */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Customer</h3>
            </div>
            <div className="px-5 py-4 space-y-1">
              <p className="text-sm font-bold text-gray-900">{order.customer?.name || "—"}</p>
              <p className="text-xs text-gray-400">{order.customer?.email}</p>
            </div>
          </div>

          {/* Address */}
          {order.address && (
            <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Delivery Address</h3>
              </div>
              <div className="px-5 py-4 text-xs text-gray-600 space-y-0.5">
                <p className="font-bold text-gray-900">{order.address.receiverName}</p>
                <p>{order.address.phone}</p>
                <p>{order.address.line1}{order.address.line2 ? `, ${order.address.line2}` : ""}</p>
                <p>{order.address.city}, {order.address.state} - {order.address.pincode}</p>
              </div>
            </div>
          )}

          {/* Payment */}
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Payment</h3>
            </div>
            <div className="px-5 py-4 space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Method</span>
                <span className="text-xs font-bold text-gray-900 capitalize">{order.paymentMethod}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Status</span>
                <AdminBadge variant={order.paymentStatus === "paid" ? "green" : "amber"} dot>{order.paymentStatus}</AdminBadge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs text-gray-500">Placed</span>
                <span className="text-xs text-gray-700">{fmtDate(order.placedAt)}</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Shipping & Update Status Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Shiprocket Shipping Panel */}
        {order.status !== "cancelled" && (
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
            <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between bg-gray-50/50">
              <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Shiprocket Shipping</h3>
              {order.shipping?.shiprocketShipmentId && (
                <span className="inline-flex items-center rounded-full bg-blue-50 px-2 py-1 text-xs font-bold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                  Active
                </span>
              )}
            </div>
            <div className="px-5 py-4 space-y-4">
              {!order.shipping?.shiprocketOrderId ? (
                /* Form to push to Shiprocket */
                <div className="space-y-3">
                  <p className="text-[11px] text-gray-400">
                    Enter package details to register this shipment on Shiprocket.
                  </p>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={weight}
                        onChange={(e) => setWeight(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-[#6B7F59]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Length (cm)</label>
                      <input
                        type="number"
                        value={length}
                        onChange={(e) => setLength(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-[#6B7F59]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Width (cm)</label>
                      <input
                        type="number"
                        value={width}
                        onChange={(e) => setWidth(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-[#6B7F59]"
                      />
                    </div>
                    <div>
                      <label className="text-[10px] font-bold text-gray-400 uppercase">Height (cm)</label>
                      <input
                        type="number"
                        value={height}
                        onChange={(e) => setHeight(e.target.value)}
                        className="w-full rounded-lg border border-gray-200 px-3 py-1.5 text-xs focus:ring-[#6B7F59]"
                      />
                    </div>
                  </div>
                  <button
                    onClick={() =>
                      pushToShiprocket.mutate({
                        orderId: order.orderId,
                        dimensions: { weight, length, width, height },
                      })
                    }
                    disabled={pushToShiprocket.isPending || order.paymentMethod === "razorpay" && order.paymentStatus !== "paid"}
                    className="w-full bg-[#6B7F59] hover:bg-[#5A6C4A] text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {pushToShiprocket.isPending ? "REGISTERING..." : "PUSH TO SHIPROCKET"}
                  </button>
                </div>
              ) : !order.shipping?.awbCode ? (
                /* Order pushed but no AWB booked */
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-150">
                    <div className="flex justify-between">
                      <span>Shiprocket ID:</span>
                      <span className="font-bold text-gray-900">{order.shipping.shiprocketOrderId}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Shipment ID:</span>
                      <span className="font-bold text-gray-900">{order.shipping.shiprocketShipmentId}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => assignShiprocketAWB.mutate(order.orderId)}
                    disabled={assignShiprocketAWB.isPending}
                    className="w-full bg-[#6B7F59] hover:bg-[#5A6C4A] text-white py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                  >
                    {assignShiprocketAWB.isPending ? "BOOKING COURIER..." : "GENERATE AWB & PICKUP"}
                  </button>
                </div>
              ) : (
                /* Shipped: tracking active and print labels available */
                <div className="space-y-3">
                  <div className="text-xs text-gray-600 space-y-1 bg-gray-50 p-3 rounded-xl border border-gray-150">
                    <div className="flex justify-between">
                      <span>Courier:</span>
                      <span className="font-bold text-gray-900">{order.shipping.courierName}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>AWB Tracking:</span>
                      <span className="font-bold text-gray-900">{order.shipping.awbCode}</span>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button
                      onClick={() => getShiprocketLabel.mutate(order.orderId)}
                      disabled={getShiprocketLabel.isPending}
                      className="flex-1 bg-gray-100 hover:bg-gray-200 text-gray-800 border border-gray-200 py-2 rounded-xl text-xs font-bold transition disabled:opacity-50"
                    >
                      {getShiprocketLabel.isPending ? "LOADING..." : "PRINT LABEL"}
                    </button>
                    {order.shipping.labelUrl && (
                      <a
                        href={order.shipping.labelUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="flex-1 bg-[#6B7F59] hover:bg-[#5A6C4A] text-white text-center py-2 rounded-xl text-xs font-bold transition inline-block"
                      >
                        DOWNLOAD PDF
                      </a>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Update status */}
        <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden h-fit">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Update Status</h3>
          </div>
          <div className="px-5 py-4">
            <EditableTimeline order={order} oid={order.orderId} updateStatus={updateOrderStatus} />
          </div>
        </div>
      </div>
    </div>
  );
}

function ShipmentTrackingCard({ orderId, shiprocketOrderId, awbCode }) {
  const { tracking, isLoading, error } = useShiprocketTracking(orderId, !!shiprocketOrderId);

  if (isLoading) {
    return (
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm p-6 text-center text-xs text-gray-400 animate-pulse">
        Loading real-time shipment tracking details...
      </div>
    );
  }

  if (error || !tracking) {
    return null;
  }

  const activities = tracking.shipment_track_activities || [];
  const statusName = tracking.shipment_status || "Registered";
  const etd = tracking.etd ? new Date(tracking.etd).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-sm font-black text-gray-900 uppercase tracking-tight">Shipment Transit History</h3>
        {etd && (
          <span className="text-xs text-gray-500 font-medium">
            Est. Delivery: <span className="font-bold text-[#6B7F59]">{etd}</span>
          </span>
        )}
      </div>
      <div className="px-5 py-5 space-y-6">
        {/* Progress Timeline Indicator */}
        <div className="flex items-center justify-between text-center relative px-2">
          <div className="absolute top-4 left-6 right-6 h-0.5 bg-gray-100 -z-10" />
          
          {[
            { label: "Booked", active: true },
            { label: "Dispatched", active: ["out for delivery", "in transit", "delivered", "shipped"].includes(statusName.toLowerCase()) },
            { label: "In Transit", active: ["out for delivery", "in transit", "delivered"].includes(statusName.toLowerCase()) },
            { label: "Out for Delivery", active: ["out for delivery", "delivered"].includes(statusName.toLowerCase()) },
            { label: "Delivered", active: ["delivered"].includes(statusName.toLowerCase()) }
          ].map((step, idx) => (
            <div key={idx} className="flex flex-col items-center flex-1">
              <div className={`w-8 h-8 rounded-full flex items-center justify-between border-2 text-xs font-bold ${
                step.active 
                  ? "bg-[#6B7F59] text-white border-[#6B7F59] shadow-sm shadow-[#6B7F59]/25" 
                  : "bg-white text-gray-300 border-gray-250"
              }`}>
                <span className="mx-auto">{idx + 1}</span>
              </div>
              <span className={`text-[10px] font-bold mt-2 truncate max-w-[70px] ${step.active ? "text-[#6B7F59]" : "text-gray-350"}`}>
                {step.label}
              </span>
            </div>
          ))}
        </div>

        {/* Scan Log history */}
        {activities.length > 0 ? (
          <div className="border-t border-gray-50 pt-5 space-y-4">
            <h4 className="text-[11px] font-black text-gray-400 uppercase tracking-wider mb-2">Live Courier Checkpoints</h4>
            <div className="relative pl-6 border-l border-gray-150 ml-3 space-y-5">
              {activities.map((act, i) => (
                <div key={i} className="relative">
                  <div className={`absolute -left-[30px] top-1.5 w-3 h-3 rounded-full border-2 bg-white ${
                    i === 0 ? "border-[#6B7F59] ring-4 ring-[#6B7F59]/10" : "border-gray-350"
                  }`} />
                  <div>
                    <div className="flex items-start justify-between gap-4">
                      <p className="text-xs font-bold text-gray-800">{act.activity}</p>
                      <span className="text-[9px] font-bold text-gray-400 shrink-0">
                        {act.date}
                      </span>
                    </div>
                    {act.location && (
                      <p className="text-[10px] text-gray-400 font-semibold mt-0.5 uppercase tracking-wide">
                        📍 {act.location}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-center text-xs text-gray-400 py-3">Awaiting initial shipment scans from courier partner.</p>
        )}
      </div>
    </div>
  );
}

// ─── Editable Timeline ─────────────────────────────────────────────────────
function EditableTimeline({ order, oid, updateStatus }) {
  const [cancelOpen, setCancelOpen] = useState(false);
  const [revertStep, setRevertStep] = useState(null);

  const isCancelled = order.status === "cancelled";
  const currentIdx  = STEP_ORDER.indexOf(order.status);

  function handleCheckboxClick(step, stepIdx) {
    if (isCancelled || updateStatus.isPending) return;

    if (stepIdx === currentIdx) {
      if (currentIdx > 0) setRevertStep(TIMELINE_STEPS[currentIdx - 1]);
    } else if (stepIdx < currentIdx) {
      setRevertStep(step);
    } else if (stepIdx === currentIdx + 1) {
      updateStatus.mutate({ orderId: oid, status: step.key });
    }
  }

  function handleRevertConfirm() {
    updateStatus.mutate({ orderId: oid, status: revertStep.key }, {
      onSettled: () => setRevertStep(null),
    });
  }

  function handleCancelConfirm() {
    updateStatus.mutate({ orderId: oid, status: "cancelled" }, {
      onSettled: () => setCancelOpen(false),
    });
  }

  return (
    <>
      <div className="space-y-1">
        {TIMELINE_STEPS.map((step, idx) => {
          const stepIdx    = STEP_ORDER.indexOf(step.key);
          const isChecked  = !isCancelled && stepIdx <= currentIdx;
          const isActive   = !isCancelled && stepIdx === currentIdx;
          const isNext     = !isCancelled && stepIdx === currentIdx + 1;
          const isFuture   = stepIdx > currentIdx + 1;
          const isClickable = !isCancelled && !isFuture && !updateStatus.isPending;

          return (
            <button
              key={step.key}
              type="button"
              disabled={!isClickable}
              onClick={() => handleCheckboxClick(step, stepIdx)}
              className={`w-full flex items-center gap-4 px-4 py-3 rounded-2xl border text-left transition-all duration-150 group ${
                isActive
                  ? "border-[#6B7F59]/40 bg-[#6B7F59]/5"
                  : isChecked
                  ? "border-gray-200 bg-white hover:border-amber-300 hover:bg-amber-50"
                  : isNext
                  ? "border-dashed border-gray-300 bg-white hover:border-[#6B7F59]/60 hover:bg-[#6B7F59]/5"
                  : "border-transparent bg-transparent opacity-40 cursor-not-allowed"
              }`}
            >
              {/* Checkbox */}
              <span className={`shrink-0 w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all duration-200 ${
                isActive
                  ? "bg-[#6B7F59] border-[#6B7F59] ring-4 ring-[#6B7F59]/15"
                  : isChecked
                  ? "bg-[#6B7F59] border-[#6B7F59] group-hover:bg-amber-400 group-hover:border-amber-400"
                  : isNext
                  ? "bg-white border-gray-300 group-hover:border-[#6B7F59]"
                  : "bg-white border-gray-200"
              }`}>
                {isChecked && (
                  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="3.5" strokeLinecap="round">
                    <polyline points="20 6 9 17 4 12"/>
                  </svg>
                )}
              </span>

              {/* Label */}
              <div className="flex-1 min-w-0">
                <p className={`text-xs font-bold leading-tight ${isChecked || isActive ? "text-gray-900" : isNext ? "text-gray-500" : "text-gray-300"}`}>
                  {step.label}
                </p>
                <p className={`text-[10px] mt-0.5 ${isChecked || isActive ? "text-gray-400" : isNext ? "text-gray-300" : "text-gray-200"}`}>
                  {step.sub}
                </p>
              </div>

              {/* Hint label */}
              <span className={`shrink-0 text-[9px] font-bold uppercase tracking-wide transition-opacity ${
                isActive
                  ? "text-[#6B7F59] opacity-100"
                  : isChecked
                  ? "text-amber-500 opacity-0 group-hover:opacity-100"
                  : isNext
                  ? "text-gray-400 opacity-0 group-hover:opacity-100"
                  : "opacity-0"
              }`}>
                {isActive ? "Current" : isChecked ? "Revert" : "Advance"}
              </span>
            </button>
          );
        })}

        {/* Cancelled row */}
        {isCancelled && (
          <div className="flex items-center gap-4 px-4 py-3 rounded-2xl border border-red-200 bg-red-50">
            <span className="shrink-0 w-6 h-6 rounded-full border-2 bg-red-100 border-red-400 flex items-center justify-center">
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="#ef4444" strokeWidth="3.5" strokeLinecap="round">
                <path d="M18 6 6 18M6 6l12 12"/>
              </svg>
            </span>
            <div>
              <p className="text-xs font-bold text-red-600">Cancelled</p>
              <p className="text-[10px] text-red-400">This order has been cancelled</p>
            </div>
          </div>
        )}
      </div>

      {/* Cancel order */}
      {!isCancelled && order.status !== "delivered" && (
        <div className="mt-4 pt-4 border-t border-gray-100">
          <button onClick={() => setCancelOpen(true)} disabled={updateStatus.isPending}
            className="flex items-center gap-2 text-xs font-bold text-red-500 border border-red-200 hover:bg-red-50 hover:border-red-400 px-4 py-2.5 rounded-xl transition active:scale-95 disabled:opacity-50">
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <path d="M18 6 6 18M6 6l12 12"/>
            </svg>
            Cancel Order
          </button>
        </div>
      )}

      {/* Revert confirmation */}
      <ConfirmModal
        isOpen={revertStep !== null}
        iconBg="bg-amber-50 border border-amber-200 text-amber-500"
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8"/><path d="M3 3v5h5"/></svg>}
        title="Revert order status?"
        message={<>Moving back to <span className="font-bold text-amber-600 capitalize">{revertStep?.label}</span>. Use this to correct a mistake.</>}
        confirmLabel="Yes, Revert"
        confirmCls="bg-amber-500 hover:bg-amber-600"
        cancelLabel="Keep Current"
        onConfirm={handleRevertConfirm}
        onCancel={() => setRevertStep(null)}
        isPending={updateStatus.isPending}
      />

      {/* Cancel confirmation */}
      <ConfirmModal
        isOpen={cancelOpen}
        iconBg="bg-red-50 border border-red-200 text-red-500"
        icon={<svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>}
        title="Cancel this order?"
        message={<>This will mark the order as <span className="font-bold text-red-500">Cancelled</span>. The customer will need to place a new order.</>}
        confirmLabel="Yes, Cancel"
        confirmCls="bg-red-500 hover:bg-red-600"
        cancelLabel="Keep Order"
        onConfirm={handleCancelConfirm}
        onCancel={() => setCancelOpen(false)}
        isPending={updateStatus.isPending}
      />
    </>
  );
}

function ConfirmModal({ isOpen, icon, iconBg, title, message, confirmLabel, confirmCls, onConfirm, onCancel, isPending, cancelLabel = "Go Back" }) {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: "rgba(0,0,0,0.5)", backdropFilter: "blur(3px)" }}
      onClick={(e) => { if (e.target === e.currentTarget) onCancel(); }}>
      <div className="w-full max-w-sm bg-white rounded-2xl shadow-2xl overflow-hidden"
        onClick={(e) => e.stopPropagation()}>
        <div className="p-6 pb-4">
          <div className={`w-11 h-11 rounded-full flex items-center justify-center mb-4 ${iconBg}`}>{icon}</div>
          <h3 className="text-sm font-black text-gray-900">{title}</h3>
          <div className="text-xs text-gray-500 mt-1.5 leading-relaxed">{message}</div>
        </div>
        <div className="flex gap-3 px-6 pb-6">
          <button onClick={onCancel}
            className="flex-1 border-2 border-gray-200 text-gray-600 text-sm font-bold py-2.5 rounded-xl hover:border-gray-400 transition active:scale-[0.98]">
            {cancelLabel}
          </button>
          <button onClick={onConfirm} disabled={isPending}
            className={`flex-1 disabled:opacity-60 text-white text-sm font-bold py-2.5 rounded-xl transition active:scale-[0.98] shadow-sm ${confirmCls}`}>
            {isPending ? "Please wait…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}

