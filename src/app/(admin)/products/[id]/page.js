"use client";

import { use } from "react";
import Link from "next/link";
import { useAdminProducts } from "@/features/admin/hooks/useAdmin";
import ProductForm from "@/features/admin/components/ProductForm";

export default function AdminProductDetailPage({ params: paramsPromise }) {
  const { id }  = use(paramsPromise);
  const isNew   = id === "new";

  // Fetch all products and find the one by numeric ID
  const { products, isLoading } = useAdminProducts({ limit: 200 });
  const product = isNew ? null : products.find((p) => String(p.id) === String(id));

  if (!isNew && isLoading) {
    return <div className="p-10 text-center text-sm text-gray-400 animate-pulse">Loading product…</div>;
  }

  return (
    <div className="space-y-5">
      <div className="flex items-center gap-2 text-xs text-gray-400">
        <Link href="/products" className="hover:text-[#6B7F59] transition font-semibold">Products</Link>
        <span>/</span>
        <span className="text-gray-700 font-bold">{isNew ? "New Product" : (product?.name ?? id)}</span>
      </div>

      {!isNew && !product ? (
        <div className="text-center py-20 bg-white rounded-2xl border border-gray-200 space-y-3">
          <span className="text-4xl">🔍</span>
          <p className="text-sm font-bold text-gray-700">Product not found</p>
          <Link href="/products" className="text-xs text-[#6B7F59] hover:underline font-bold">← Back to Products</Link>
        </div>
      ) : (
        <ProductForm product={product} isNew={isNew} />
      )}
    </div>
  );
}
