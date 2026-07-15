"use client";

import { useAdminCategories } from "@/features/admin/hooks/useAdmin";

export function useCategories() {
  const { categories, ...rest } = useAdminCategories();
  return { categories, ...rest };
}

export default useCategories;
