"use client";
 
import { use, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
 
function fmt(n) { return "₹" + Number(n).toFixed(2); }
function fmtDate(d) { return d ? new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }) : "—"; }
 
// Convert number to words in Indian numbering system
function numberToWords(num) {
  const a = ["", "One ", "Two ", "Three ", "Four ", "Five ", "Six ", "Seven ", "Eight ", "Nine ", "Ten ", "Eleven ", "Twelve ", "Thirteen ", "Fourteen ", "Fifteen ", "Sixteen ", "Seventeen ", "Eighteen ", "Nineteen "];
  const b = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"];
 
  function numToWords(n) {
    if (n < 20) return a[n];
    let digit = n % 10;
    return b[Math.floor(n / 10)] + (digit ? "-" + a[digit] : "");
  }
 
  let n = Math.floor(num);
  if (n === 0) return "Zero Rupees Only";
 
  let words = "";
  let crore = Math.floor(n / 10000000);
  n %= 10000000;
  if (crore) words += numToWords(crore) + " Crore ";
 
  let lakh = Math.floor(n / 100000);
  n %= 100000;
  if (lakh) words += numToWords(lakh) + " Lakh ";
 
  let thousand = Math.floor(n / 1000);
  n %= 1000;
  if (thousand) words += numToWords(thousand) + " Thousand ";
 
  let hundred = Math.floor(n / 100);
  n %= 100;
  if (hundred) words += numToWords(hundred) + " Hundred ";
 
  if (n > 0) {
    if (words !== "") words += "and ";
    words += numToWords(n);
  }
 
  return words.trim() + " Rupees Only";
}
 
export default function OrderInvoicePage({ params: paramsPromise }) {
  const { orderId } = use(paramsPromise);
  const router = useRouter();
  const { user, isLoading: authLoading } = useAuth();
 
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
 
  // Require Admin Auth
  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user, router]);
 
  // Fetch Order
  useEffect(() => {
    async function fetchOrder() {
      try {
        const res = await fetch(`/api/admin/orders/${orderId}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.message || "Failed to load order.");
        setOrder(json.data);
      } catch (err) {
        setError(err.message || "Could not retrieve order details.");
      } finally {
        setLoading(false);
      }
    }
    if (user) {
      fetchOrder();
    }
  }, [orderId, user]);
 
  if (authLoading || loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center text-xs font-bold text-gray-400 animate-pulse">
        Loading invoice details...
      </div>
    );
  }
 
  if (error || !order) {
    return (
      <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center p-6 space-y-4">
        <span className="text-4xl">⚠️</span>
        <p className="text-sm font-bold text-gray-700">{error || "Order not found."}</p>
        <button onClick={() => window.close()} className="px-4 py-2 bg-gray-200 hover:bg-gray-300 text-gray-800 text-xs font-bold rounded-xl transition">
          Close Window
        </button>
      </div>
    );
  }
 
  // GST Tax Calculations
  // State code UP is Uttar Pradesh.
  const state = String(order.address?.state || "").trim().toLowerCase();
  const isIntrastate = ["uttar pradesh", "up", "uttarpradesh"].includes(state);
 
  // Subtotal without delivery/COD
  const subtotal = order.amounts?.subtotal || 0;
  const taxRate = 5; // Standard 5% GST on spices/FMCG
  const taxMultiplier = taxRate / (100 + taxRate);
  
  // Dynamic Tax calculations
  const totalTax = subtotal * taxMultiplier;
  const taxableValue = subtotal - totalTax;
  
  const cgstRate = isIntrastate ? 2.5 : 0;
  const sgstRate = isIntrastate ? 2.5 : 0;
  const igstRate = isIntrastate ? 0 : 5;
 
  const cgstAmount = isIntrastate ? totalTax / 2 : 0;
  const sgstAmount = isIntrastate ? totalTax / 2 : 0;
  const igstAmount = isIntrastate ? 0 : totalTax;
 
  const deliveryCharge = order.amounts?.deliveryCharge || 0;
  const codCharge = order.amounts?.codCharge || 0;
  const grandTotal = order.amounts?.total || (subtotal + deliveryCharge + codCharge);
 
  return (
    <div className="min-h-screen bg-gray-100 p-0 sm:p-8 flex flex-col items-center font-sans print:bg-white print:p-0">
      
      {/* Print Control Bar (Hidden on print) */}
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[#6B7F59] font-black text-sm tracking-wider uppercase">Foodville Invoicing</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500 font-medium">Order ID: {order.orderId}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-[#6B7F59] hover:bg-[#5A6C4A] text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Invoice
          </button>
          <button
            onClick={() => window.close()}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>
 
      {/* Invoice Paper Document */}
      <div className="w-full max-w-4xl bg-white p-8 sm:p-10 border border-gray-200 shadow-md flex flex-col justify-between print:shadow-none print:border-none print:p-0 print:w-full print:min-h-0 min-h-[265mm]">
        
        {/* Top Header */}
        <div className="space-y-4">
          <div className="flex justify-between items-start border-b border-gray-150 pb-4">
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xl font-black text-gray-900 tracking-tight">FOODVILLE</span>
              </div>
              <div className="text-[10px] text-gray-500 leading-normal font-medium space-y-0.5">
                <p className="font-bold text-gray-900">Foodville Consumer Products Private Limited</p>
                <p>H-112, 1st Floor, Patel Nagar-III</p>
                <p>Ghaziabad, Uttar Pradesh, 201001</p>
                <p>GSTIN: <span className="font-mono font-bold text-gray-900">09AAAAA0000A1Z1</span></p>
                <p>Email: <span className="font-semibold text-gray-800">franchise@foodville.in</span> | Web: <span className="font-semibold text-gray-800">foodville.in</span></p>
              </div>
            </div>
            
            <div className="text-right space-y-1">
              <span className="inline-block px-3 py-1 bg-[#6B7F59]/10 text-[#6B7F59] font-black text-[10px] uppercase tracking-widest rounded-lg">
                Tax Invoice
              </span>
              <div className="text-xs font-medium space-y-0.5 mt-2">
                <p className="text-gray-400 text-[10px] uppercase font-bold tracking-wider">Invoice Details</p>
                <p className="text-gray-950 font-bold">No: <span className="font-mono">INV-{order.orderId}</span></p>
                <p>Date: {fmtDate(order.placedAt || order.createdAt)}</p>
                <p>Order ID: <span className="font-mono">{order.orderId}</span></p>
                <p>Payment: <span className="uppercase font-bold text-gray-900">{order.paymentMethod}</span></p>
              </div>
            </div>
          </div>
 
          {/* Bill To & Ship To Panel */}
          <div className="grid grid-cols-2 gap-4 bg-gray-50/50 p-3 rounded-xl border border-gray-100">
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Billed To (Customer)</span>
              <div className="text-xs font-medium text-gray-700 space-y-0.5">
                <p className="font-black text-gray-900">{order.address?.receiverName}</p>
                <p>Phone: {order.address?.phone || "—"}</p>
                <p>Email: {order.user?.email || "—"}</p>
              </div>
            </div>
            <div>
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block mb-1">Delivery Address</span>
              <div className="text-xs font-medium text-gray-700 space-y-0.5">
                <p className="font-black text-gray-900">{order.address?.receiverName}</p>
                <p>{order.address?.houseFlat}, {order.address?.area}</p>
                {order.address?.landmark && <p>Landmark: {order.address.landmark}</p>}
                <p>{order.address?.city}, {order.address?.state} - {order.address?.pincode}</p>
              </div>
            </div>
          </div>
 
          {/* Items Table */}
          <table className="w-full text-left border-collapse mt-4">
            <thead>
              <tr className="border-b-2 border-gray-900 bg-gray-50 text-[10px] font-black text-gray-500 uppercase tracking-widest">
                <th className="py-1.5 px-3 text-center w-12">#</th>
                <th className="py-1.5 px-3">Item Description</th>
                <th className="py-1.5 px-3 text-right">Unit Price</th>
                <th className="py-1.5 px-3 text-center">Qty</th>
                <th className="py-1.5 px-3 text-right">Tax Rate</th>
                <th className="py-1.5 px-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 text-xs font-medium text-gray-800">
              {order.items?.map((item, idx) => {
                const itemTotal = item.qty * item.price;
                return (
                  <tr key={idx} className="border-b border-gray-50/50">
                    <td className="py-2 px-3 text-center text-gray-400">{idx + 1}</td>
                    <td className="py-2 px-3">
                      <p className="font-bold text-gray-950">{item.name}</p>
                      {item.unit && <p className="text-[10px] text-gray-400 mt-0.5">Unit: {item.unit}</p>}
                    </td>
                    <td className="py-2 px-3 text-right">{fmt(item.price)}</td>
                    <td className="py-2 px-3 text-center font-bold">{item.qty}</td>
                    <td className="py-2 px-3 text-right text-gray-500">{taxRate}% GST (incl.)</td>
                    <td className="py-2 px-3 text-right font-bold text-gray-950">{fmt(itemTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
 
          {/* Tax Breakdown Table */}
          <div className="grid grid-cols-2 gap-4 pt-4 border-t border-gray-150 items-start">
            <div className="bg-gray-50 p-3.5 rounded-xl border space-y-2">
              <span className="text-[9px] font-black text-gray-400 uppercase tracking-widest block">GST Tax Breakdown</span>
              <table className="w-full text-left border-collapse text-[10px] font-semibold text-gray-700">
                <thead>
                  <tr className="border-b border-gray-200 text-gray-400 uppercase">
                    <th className="py-1">Type</th>
                    <th className="py-1 text-right">Rate</th>
                    <th className="py-1 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100 font-mono">
                  {isIntrastate ? (
                    <>
                      <tr>
                        <td className="py-1">Central GST (CGST)</td>
                        <td className="py-1 text-right">{cgstRate}%</td>
                        <td className="py-1 text-right">{fmt(cgstAmount)}</td>
                      </tr>
                      <tr>
                        <td className="py-1">State GST (SGST)</td>
                        <td className="py-1 text-right">{sgstRate}%</td>
                        <td className="py-1 text-right">{fmt(sgstAmount)}</td>
                      </tr>
                    </>
                  ) : (
                    <tr>
                      <td className="py-1">Integrated GST (IGST)</td>
                      <td className="py-1 text-right">{igstRate}%</td>
                      <td className="py-1 text-right">{fmt(igstAmount)}</td>
                    </tr>
                  )}
                  <tr className="font-bold text-gray-950">
                    <td className="py-1.5 uppercase font-sans">Total Tax</td>
                    <td className="py-1.5 text-right">—</td>
                    <td className="py-1.5 text-right font-mono">{fmt(totalTax)}</td>
                  </tr>
                </tbody>
              </table>
              <p className="text-[9px] text-gray-400 leading-normal">
                Taxable Value of Goods: <span className="font-mono">{fmt(taxableValue)}</span> | Taxes Included in subtotal above.
              </p>
            </div>
 
            {/* Calculation totals */}
            <div className="space-y-2 text-xs font-semibold text-gray-600">
              <div className="flex justify-between">
                <span>Subtotal (incl. Tax)</span>
                <span className="font-mono text-gray-950">{fmt(subtotal)}</span>
              </div>
              {deliveryCharge > 0 && (
                <div className="flex justify-between">
                  <span>Shipping & Handling</span>
                  <span className="font-mono text-gray-950">{fmt(deliveryCharge)}</span>
                </div>
              )}
              {codCharge > 0 && (
                <div className="flex justify-between">
                  <span>COD Collection Fee</span>
                  <span className="font-mono text-gray-950">{fmt(codCharge)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm font-black text-gray-900 border-t border-gray-150 pt-2">
                <span>Grand Total</span>
                <span className="font-mono text-lg text-[#6B7F59]">{fmt(grandTotal)}</span>
              </div>
            </div>
          </div>
 
          {/* Total in words */}
          <div className="bg-gray-50/50 border p-2.5 rounded-xl text-[10px] font-bold text-gray-700 mt-3 flex items-center justify-between font-medium">
            <span>Amount in Words:</span>
            <span className="text-[#6B7F59] uppercase tracking-wider">{numberToWords(grandTotal)}</span>
          </div>
        </div>
 
        {/* Footer info & sign-off */}
        <div className="border-t border-gray-150 pt-4 mt-6 text-center space-y-2">
          <div className="text-[10px] text-gray-400 leading-relaxed max-w-lg mx-auto font-medium">
            <p className="font-bold text-gray-500 uppercase tracking-widest mb-1 text-[9px]">Terms & Conditions</p>
            <p>This is a computer-generated Tax Invoice and does not require a physical signature.</p>
            <p>Goods once sold cannot be returned. Direct factory supply guaranteed by Foodville Brand.</p>
          </div>
          <p className="text-[11px] font-bold text-gray-400">
            Thank you for choosing Foodville! 🌾
          </p>
        </div>
 
      </div>
      
      {/* Dynamic Printing Style rules */}
      <style jsx global>{`
        @media print {
          body {
            background: white !important;
            color: black !important;
            margin: 0 !important;
            padding: 0 !important;
          }
          @page {
            size: A4;
            margin: 8mm;
          }
        }
      `}</style>
    </div>
  );
}
