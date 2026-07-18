"use client";

import { useEffect } from "react";
import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import { toast } from "sonner";
import adminService from "@/features/admin/services/admin.service";
import { queryKeys } from "@/lib/queryKeys";

export function useAdminStats() {
  const query = useQuery({
    queryKey: queryKeys.admin.stats,
    queryFn: adminService.stats,
    staleTime: 30 * 1000,
  });
  return { ...query, stats: query.data ?? null };
}

export function useAdminProducts(params = {}) {
  const query = useQuery({
    queryKey: queryKeys.admin.products(params),
    queryFn: () => adminService.listProducts(params),
    placeholderData: keepPreviousData,
  });
  return { ...query, products: query.data?.items ?? [], meta: query.data?.meta ?? null };
}

export function useAdminOrders(params = {}) {
  const query = useQuery({
    queryKey: queryKeys.admin.orders(params),
    queryFn: () => adminService.listOrders(params),
    placeholderData: keepPreviousData,
  });
  return { ...query, orders: query.data?.items ?? [], meta: query.data?.meta ?? null };
}

export function useShiprocketTracking(orderId, enabled = false) {
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ["admin", "orders", orderId, "shiprocket", "tracking"],
    queryFn: () => adminService.getShipmentTracking(orderId),
    enabled: Boolean(orderId && enabled),
    staleTime: 60 * 1000, // cache tracking for 1 minute
  });

  const trackingData = query.data;

  // Invalidate general orders query so the top header badges and stats match
  useEffect(() => {
    if (trackingData) {
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.orders() });
      queryClient.invalidateQueries({ queryKey: queryKeys.admin.stats });
    }
  }, [trackingData, queryClient]);

  return { ...query, tracking: trackingData ?? null };
}

export function useAdminUsers(params = {}) {
  const query = useQuery({
    queryKey: queryKeys.admin.users(params),
    queryFn: () => adminService.listUsers(params),
    placeholderData: keepPreviousData,
  });
  return { ...query, users: query.data?.items ?? [], meta: query.data?.meta ?? null };
}

export function useAdminCategories() {
  const query = useQuery({
    queryKey: ["admin", "categories"],
    queryFn: adminService.listCategories,
  });
  return { ...query, categories: query.data ?? [] };
}

export function useAdminBlogs(params = {}) {
  const query = useQuery({
    queryKey: ["admin", "blogs", params],
    queryFn: () => adminService.listBlogs(params),
    placeholderData: keepPreviousData,
  });
  return { ...query, blogs: query.data?.items ?? [], meta: query.data?.meta ?? null };
}

export function useAdminMutations() {
  const qc = useQueryClient();
  const invalidateProducts = () => qc.invalidateQueries({ queryKey: ["admin", "products"] });
  const invalidateOrders = () => {
    qc.invalidateQueries({ queryKey: ["admin", "orders"] });
    qc.invalidateQueries({ queryKey: queryKeys.admin.stats });
  };

  const createProduct = useMutation({
    mutationFn: (data) => adminService.createProduct(data),
    onSuccess: () => { invalidateProducts(); toast.success("Product created"); },
    onError: (err) => toast.error(err?.message || "Could not create the product."),
  });

  const updateProduct = useMutation({
    mutationFn: ({ id, data }) => adminService.updateProduct(id, data),
    onSuccess: () => { invalidateProducts(); toast.success("Product updated"); },
    onError: (err) => toast.error(err?.message || "Could not update the product."),
  });

  const deleteProduct = useMutation({
    mutationFn: (id) => adminService.deleteProduct(id),
    onSuccess: () => { invalidateProducts(); toast.success("Product deleted"); },
    onError: (err) => toast.error(err?.message || "Could not delete the product."),
  });

  const updateOrderStatus = useMutation({
    mutationFn: ({ orderId, status, note, deliveryMethod, localDelivery }) =>
      adminService.updateOrderStatus(orderId, status, note, deliveryMethod, localDelivery),
    onSuccess: () => { invalidateOrders(); toast.success("Order status updated"); },
    onError: (err) => toast.error(err?.message || "Could not update the order."),
  });
 
  const deleteOrder = useMutation({
    mutationFn: (orderId) => adminService.deleteOrder(orderId),
    onSuccess: () => { invalidateOrders(); toast.success("Order deleted"); },
    onError: (err) => toast.error(err?.message || "Could not delete the order."),
  });

  const pushToShiprocket = useMutation({
    mutationFn: ({ orderId, dimensions }) => adminService.pushToShiprocket(orderId, dimensions),
    onSuccess: () => { invalidateOrders(); toast.success("Order pushed to Shiprocket"); },
    onError: (err) => toast.error(err?.message || "Failed to push to Shiprocket."),
  });

  const assignShiprocketAWB = useMutation({
    mutationFn: (orderId) => adminService.assignShiprocketAWB(orderId),
    onSuccess: () => { invalidateOrders(); toast.success("AWB assigned and courier booked"); },
    onError: (err) => toast.error(err?.message || "Failed to assign AWB."),
  });

  const getShiprocketLabel = useMutation({
    mutationFn: (orderId) => adminService.getShiprocketLabel(orderId),
    onSuccess: (data) => {
      invalidateOrders();
      toast.success("Label generated successfully");
      if (data?.labelUrl) {
        window.open(data.labelUrl, "_blank");
      }
    },
    onError: (err) => toast.error(err?.message || "Failed to generate label."),
  });

  // ── Categories ──
  const invalidateCategories = () => {
    qc.invalidateQueries({ queryKey: ["admin", "categories"] });
    qc.invalidateQueries({ queryKey: queryKeys.categories.all }); // storefront too
  };

  const createCategory = useMutation({
    mutationFn: (data) => adminService.createCategory(data),
    onSuccess: () => { invalidateCategories(); toast.success("Category created"); },
    onError: (err) => toast.error(err?.message || "Could not create the category."),
  });

  const updateCategory = useMutation({
    mutationFn: ({ slug, data }) => adminService.updateCategory(slug, data),
    onSuccess: () => { invalidateCategories(); toast.success("Category updated"); },
    onError: (err) => toast.error(err?.message || "Could not update the category."),
  });

  const deleteCategory = useMutation({
    mutationFn: (slug) => adminService.deleteCategory(slug),
    onSuccess: () => { invalidateCategories(); toast.success("Category deleted"); },
    onError: (err) => toast.error(err?.message || "Could not delete the category."),
  });

  // ── Blogs ──
  const invalidateBlogs = () => {
    qc.invalidateQueries({ queryKey: ["admin", "blogs"] });
    qc.invalidateQueries({ queryKey: queryKeys.blogs.all });
  };

  const createBlog = useMutation({
    mutationFn: (data) => adminService.createBlog(data),
    onSuccess: () => { invalidateBlogs(); toast.success("Article published"); },
    onError: (err) => toast.error(err?.message || "Could not create the article."),
  });

  const updateBlog = useMutation({
    mutationFn: ({ id, data }) => adminService.updateBlog(id, data),
    onSuccess: () => { invalidateBlogs(); toast.success("Article updated"); },
    onError: (err) => toast.error(err?.message || "Could not update the article."),
  });

  const deleteBlog = useMutation({
    mutationFn: (id) => adminService.deleteBlog(id),
    onSuccess: () => { invalidateBlogs(); toast.success("Article deleted"); },
    onError: (err) => toast.error(err?.message || "Could not delete the article."),
  });

  return {
    createProduct, updateProduct, deleteProduct,
    updateOrderStatus, deleteOrder,
    pushToShiprocket, assignShiprocketAWB, getShiprocketLabel,
    createCategory, updateCategory, deleteCategory,
    createBlog, updateBlog, deleteBlog,
  };
}
