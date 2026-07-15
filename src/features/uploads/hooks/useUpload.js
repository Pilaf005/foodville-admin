"use client";

import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import uploadService from "@/features/uploads/services/upload.service";

export function useImageUpload() {
  return useMutation({
    mutationFn: (payload) => uploadService.image(payload),
    onError: (err) => toast.error(err?.message || "Image upload failed."),
  });
}

export default useImageUpload;
