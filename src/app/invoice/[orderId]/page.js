"use client";
 
import { use, useState, useEffect } from "react";
import { useAuth } from "@/features/auth/hooks/useAuth";
import { useRouter } from "next/navigation";
 
function fmtRs(n) {
  const val = Number(n || 0);
  return "Rs. " + val.toFixed(2);
}

function fmtNum(n) {
  const val = Number(n || 0);
  return val.toFixed(2);
}

function fmtDate(d) {
  if (!d) return "—";
  const date = new Date(d);
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  const yyyy = date.getFullYear();
  return `${dd}/${mm}/${yyyy}`;
}

function getStateCode(stateName) {
  if (!stateName) return "09";
  const s = String(stateName).trim().toLowerCase();
  const codes = {
    "jammu and kashmir": "01", "jammu & kashmir": "01",
    "himachal pradesh": "02",
    "punjab": "03",
    "chandigarh": "04",
    "uttarakhand": "05",
    "haryana": "06",
    "delhi": "07",
    "rajasthan": "08",
    "uttar pradesh": "09", "up": "09", "uttarpradesh": "09",
    "bihar": "10",
    "sikkim": "11",
    "arunachal pradesh": "12",
    "nagaland": "13",
    "manipur": "14",
    "mizoram": "15",
    "tripura": "16",
    "meghalaya": "17",
    "assam": "18",
    "west bengal": "19",
    "jharkhand": "20",
    "odisha": "21",
    "chhattisgarh": "22",
    "madhya pradesh": "23",
    "gujarat": "24",
    "daman and diu": "25",
    "dadra and nagar haveli": "26",
    "maharashtra": "27",
    "andhra pradesh": "28", "andhrapradesh": "28",
    "karnataka": "29",
    "goa": "30",
    "lakshadweep": "31",
    "kerala": "32",
    "tamil nadu": "33", "tamilnadu": "33",
    "puducherry": "34",
    "telangana": "36",
  };
  return codes[s] || "09";
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
 
  const stateStr = String(order.address?.state || "").trim().toLowerCase();
  const isIntrastate = ["uttar pradesh", "up", "uttarpradesh"].includes(stateStr);
  const customerStateCode = getStateCode(order.address?.state);

  const itemsSubtotal = order.amounts?.subtotal || order.items?.reduce((s, i) => s + (i.price * i.qty), 0) || 0;
  const couponDiscount = order.amounts?.discount || 0;
  const deliveryCharge = order.amounts?.deliveryCharge || 0;
  const codCharge = order.amounts?.codCharge || 0;
  const grandTotal = order.amounts?.total || Math.max(0, itemsSubtotal - couponDiscount + deliveryCharge + codCharge);

  return (
    <div className="min-h-screen bg-gray-100 p-0 sm:p-6 flex flex-col items-center font-sans print:bg-white print:p-0">
      
      {/* Control Bar (Hidden on print) */}
      <div className="w-full max-w-4xl bg-white border border-gray-200 rounded-2xl shadow-sm p-4 mb-6 flex items-center justify-between print:hidden">
        <div className="flex items-center gap-2">
          <span className="text-[#6B7F59] font-black text-sm tracking-wider uppercase">Shiprocket Invoice Format</span>
          <span className="text-xs text-gray-400">|</span>
          <span className="text-xs text-gray-500 font-medium">Order ID: {order.orderId}</span>
        </div>
        <div className="flex gap-3">
          <button
            onClick={() => window.print()}
            className="bg-[#6B7F59] hover:bg-[#5A6C4A] text-white px-5 py-2 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shadow-sm active:scale-95 cursor-pointer"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>
            Print Tax Invoice
          </button>
          <button
            onClick={() => window.close()}
            className="border border-gray-200 hover:bg-gray-50 text-gray-700 px-4 py-2 rounded-xl text-xs font-bold transition active:scale-95 cursor-pointer"
          >
            Close
          </button>
        </div>
      </div>

      {/* Invoice Document Paper Container */}
      <div className="w-full max-w-4xl bg-white p-6 sm:p-10 border border-gray-300 shadow-lg font-sans text-[11px] leading-snug text-gray-900 print:shadow-none print:border-none print:p-0 print:w-full">
        
        {/* Logo Header */}
        <div className="flex flex-col items-center justify-center pb-2">
          <img
            src="/foodville-logo.png"
            alt="Foodville"
            className="h-10 w-auto object-contain mb-2"
          />
          <div className="w-full border-t border-gray-400 pt-1 pb-1 text-center">
            <h1 className="text-2xl font-bold tracking-wider text-gray-800 uppercase">TAX INVOICE</h1>
          </div>
          <div className="w-full border-b border-gray-400" />
        </div>

        {/* 3 Columns Section (Dotted Dividers) */}
        <div className="grid grid-cols-3 gap-4 py-4 border-b border-gray-300 text-[11px]">
          
          {/* Column 1: SHIPPING ADDRESS */}
          <div className="border-r border-dashed border-gray-300 pr-3 space-y-1">
            <p className="font-bold text-gray-900 uppercase">SHIPPING ADDRESS:</p>
            <p className="font-semibold">{order.address?.receiverName || order.user?.fullName || "Customer"}</p>
            <p>{order.address?.houseFlat}, {order.address?.area}</p>
            {order.address?.landmark && <p>Landmark: {order.address.landmark}</p>}
            <p>{order.address?.city} {order.address?.pincode}</p>
            <p>{order.address?.state}</p>
            <p>India</p>
            <p className="font-semibold">State Code : {customerStateCode}</p>
          </div>

          {/* Column 2: SOLD BY */}
          <div className="border-r border-dashed border-gray-300 pr-3 space-y-1 text-right sm:text-left">
            <p className="font-bold text-gray-900 uppercase">SOLD BY:</p>
            <p className="font-semibold text-gray-800">Foodville Consumer Products Private Limited</p>
            <p>H-112, 1st Floor, Patel Nagar-III</p>
            <p>Ghaziabad 201001</p>
            <p>Uttar Pradesh</p>
            <p>India</p>
            <p className="font-semibold">State Code : 09</p>
            <p className="font-semibold">GSTIN No. 09AAECF9309A1ZT</p>
            <p>Website: <span className="underline">https://www.foodvilleindia.com</span></p>
            <p>Email: support@foodvilleindia.com</p>
          </div>

          {/* Column 3: INVOICE DETAILS */}
          <div className="pl-1 space-y-1">
            <p className="font-bold text-gray-900 uppercase">INVOICE DETAILS:</p>
            <div className="grid grid-cols-2 gap-x-2">
              <span className="font-bold">INVOICE NO.</span>
              <span>: INV-{order.orderId}</span>
              <span className="font-bold">INVOICE DATE</span>
              <span>: {fmtDate(order.placedAt || order.createdAt)}</span>
              <span className="font-bold">ORDER NO.</span>
              <span>: {order.orderId}</span>
              <span className="font-bold">ORDER DATE</span>
              <span>: {fmtDate(order.placedAt || order.createdAt)}</span>
              <span className="font-bold">CHANNEL</span>
              <span>: Foodville (CUSTOM)</span>
              <span className="font-bold">SHIPPED BY</span>
              <span>: {order.shipping?.courierName || "Shiprocket"}</span>
              <span className="font-bold">AWB NO.</span>
              <span>: {order.shipping?.awbCode || "—"}</span>
              <span className="font-bold">PAYMENT METHOD</span>
              <span>: {String(order.paymentMethod).toLowerCase()}</span>
              <span className="font-bold">REMARK</span>
              <span>: Storefront Order</span>
            </div>
          </div>
        </div>

        {/* Product Items Table */}
        <div className="py-4">
          <table className="w-full text-left border-collapse text-[10px]">
            <thead>
              <tr className="border-b border-gray-400 font-bold text-gray-700 uppercase tracking-wider">
                <th className="py-2 px-1 text-center w-8">S.NO.</th>
                <th className="py-2 px-2">PRODUCT NAME</th>
                <th className="py-2 px-1 text-center">HSN</th>
                <th className="py-2 px-1 text-center">QTY</th>
                <th className="py-2 px-2 text-right">UNIT PRICE</th>
                <th className="py-2 px-2 text-right">UNIT DISCOUNT</th>
                <th className="py-2 px-2 text-right">TAXABLE VALUE</th>
                <th className="py-2 px-2 text-center">IGST (Value | %)</th>
                <th className="py-2 px-2 text-right">TOTAL (Including GST)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {order.items?.map((item, idx) => {
                const itemPrice = Number(item.price || 0);
                const itemQty = Number(item.qty || 1);
                const lineTotal = itemPrice * itemQty;
                
                // Reverse 5% GST calculation for item taxable value & tax
                const taxRate = 5;
                const totalTax = lineTotal * (taxRate / (100 + taxRate));
                const taxableVal = lineTotal - totalTax;

                const sku = item.slug || String(item.productId || "").toLowerCase().replace(/\s+/g, "-");
                const hsn = item.hsnCode || "2106";

                return (
                  <tr key={idx} className="align-top">
                    <td className="py-2.5 px-1 text-center font-semibold text-gray-600">{idx + 1}</td>
                    <td className="py-2.5 px-2 font-bold text-gray-900">
                      <p>{item.name}</p>
                      <p className="text-[9px] font-normal text-gray-500 mt-0.5">SKU : {sku}</p>
                    </td>
                    <td className="py-2.5 px-1 text-center">{hsn}</td>
                    <td className="py-2.5 px-1 text-center font-bold">{itemQty}</td>
                    <td className="py-2.5 px-2 text-right font-mono">{fmtRs(itemPrice)}</td>
                    <td className="py-2.5 px-2 text-right font-mono">0.00</td>
                    <td className="py-2.5 px-2 text-right font-mono">{fmtNum(taxableVal)}</td>
                    <td className="py-2.5 px-2 text-center font-mono font-medium">
                      {isIntrastate ? `${fmtNum(totalTax)} | 5%` : `${fmtNum(totalTax)} | 5%`}
                    </td>
                    <td className="py-2.5 px-2 text-right font-mono font-bold text-gray-900">{fmtNum(lineTotal)}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {/* Calculation Totals & Discount Breakdown */}
        <div className="border-t border-gray-400 pt-3 space-y-2">
          
          <div className="flex flex-col items-end text-xs space-y-1">
            <div className="w-72 space-y-1">
              <div className="flex justify-between text-gray-700">
                <span>Items Subtotal:</span>
                <span className="font-mono font-semibold">{fmtRs(itemsSubtotal)}</span>
              </div>
              
              {couponDiscount > 0 && (
                <div className="flex justify-between text-emerald-700 font-semibold">
                  <span>Less: Coupon Discount ({order.amounts?.discountLabel || "Discount"}):</span>
                  <span className="font-mono">- {fmtRs(couponDiscount)}</span>
                </div>
              )}

              {deliveryCharge > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>Shipping & Delivery:</span>
                  <span className="font-mono">{fmtRs(deliveryCharge)}</span>
                </div>
              )}

              {codCharge > 0 && (
                <div className="flex justify-between text-gray-700">
                  <span>COD Collection Fee:</span>
                  <span className="font-mono">{fmtRs(codCharge)}</span>
                </div>
              )}

              <div className="border-t border-b border-gray-800 py-1.5 mt-1 flex justify-between text-sm font-bold text-gray-900">
                <span>NET TOTAL (In Value)</span>
                <span className="font-mono text-base">{fmtRs(grandTotal)}</span>
              </div>
            </div>
          </div>

          <div className="pt-2 text-[10px] text-gray-700 space-y-1">
            <p>Whether tax is payable under reverse charge- No</p>
          </div>
        </div>

        {/* Bottom Signature Block */}
        <div className="pt-8 flex justify-start">
          <div className="flex flex-col items-center">
            <div className="w-48 h-16 border border-gray-400 rounded-sm mb-1 bg-gray-50/30 flex items-center justify-center text-[9px] text-gray-300 uppercase tracking-widest italic">
              [ Seal / Signature ]
            </div>
            <span className="text-[10px] font-bold text-gray-800">
              Authorized Signature for Foodville Consumer Products Private Limited
            </span>
          </div>
        </div>

      </div>

      {/* Printing Styles */}
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
