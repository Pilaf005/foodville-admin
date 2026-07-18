import api, { unwrap } from "@/lib/api";

export const adminService = {
  async stats() {
    return unwrap(await api.get("/admin/stats"));
  },

  async listProducts(params = {}) {
    const res = await api.get("/admin/products", { params });
    return { items: res.data?.data ?? [], meta: res.data?.meta ?? null };
  },
  async createProduct(data) {
    return unwrap(await api.post("/admin/products", data));
  },
  async updateProduct(numericId, data) {
    return unwrap(await api.put(`/admin/products/${numericId}`, data));
  },
  async deleteProduct(numericId) {
    return unwrap(await api.delete(`/admin/products/${numericId}`));
  },

  async listOrders(params = {}) {
    const res = await api.get("/admin/orders", { params });
    return { items: res.data?.data ?? [], meta: res.data?.meta ?? null };
  },
  async updateOrderStatus(orderId, status, note, deliveryMethod, localDelivery) {
    return unwrap(await api.patch(`/admin/orders/${orderId}`, { status, note, deliveryMethod, localDelivery }));
  },
  async deleteOrder(orderId) {
    return unwrap(await api.delete(`/admin/orders/${orderId}`));
  },

  async pushToShiprocket(orderId, dimensions) {
    return unwrap(await api.post(`/admin/orders/${orderId}/shiprocket`, dimensions));
  },
  async assignShiprocketAWB(orderId) {
    return unwrap(await api.put(`/admin/orders/${orderId}/shiprocket`));
  },
  async getShiprocketLabel(orderId) {
    return unwrap(await api.get(`/admin/orders/${orderId}/shiprocket`));
  },
  async getShipmentTracking(orderId) {
    return unwrap(await api.get(`/admin/orders/${orderId}/shiprocket/track`));
  },

  async listUsers(params = {}) {
    const res = await api.get("/admin/users", { params });
    return { items: res.data?.data ?? [], meta: res.data?.meta ?? null };
  },

  // ── Categories ──
  async listCategories() {
    return unwrap(await api.get("/admin/categories"));
  },
  async createCategory(data) {
    return unwrap(await api.post("/admin/categories", data));
  },
  async updateCategory(slug, data) {
    return unwrap(await api.put(`/admin/categories/${slug}`, data));
  },
  async deleteCategory(slug) {
    return unwrap(await api.delete(`/admin/categories/${slug}`));
  },

  // ── Blogs ──
  async listBlogs(params = {}) {
    const res = await api.get("/admin/blogs", { params });
    return { items: res.data?.data ?? [], meta: res.data?.meta ?? null };
  },
  async createBlog(data) {
    return unwrap(await api.post("/admin/blogs", data));
  },
  async updateBlog(numericId, data) {
    return unwrap(await api.put(`/admin/blogs/${numericId}`, data));
  },
  async deleteBlog(numericId) {
    return unwrap(await api.delete(`/admin/blogs/${numericId}`));
  },
};

export default adminService;
