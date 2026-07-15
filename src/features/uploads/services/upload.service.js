import api from "@/lib/api";

export const uploadService = {
  /** Uploads an image to R2 and returns { key, url }. */
  async image({ file, folder, ownerId, replaceUrl }) {
    const form = new FormData();
    form.append("file", file);
    form.append("folder", folder);
    if (ownerId) form.append("ownerId", ownerId);
    if (replaceUrl) form.append("replaceUrl", replaceUrl);

    const res = await api.post("/uploads", form, {
      headers: { "Content-Type": "multipart/form-data" },
    });
    return res.data?.data;
  },
};

export default uploadService;
