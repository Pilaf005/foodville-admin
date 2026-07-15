"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import authService from "@/features/auth/services/auth.service";
import { queryKeys } from "@/lib/queryKeys";

/**
 * Current user. Returns null (not an error) when signed out, so components can
 * simply check `user`.
 */
export function useAuth() {
  const { data: user, isLoading, isFetching } = useQuery({
    queryKey: queryKeys.auth.me,
    queryFn: authService.getCurrentUser,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    user: user ?? null,
    isAuthenticated: !!user,
    isAdmin: user?.role === "admin",
    isLoading,
    isFetching,
  };
}

export function useRequestOtp() {
  return useMutation({
    mutationFn: (email) => authService.requestOtp(email),
    onError: (err) => toast.error(err?.message || "Could not send the code."),
  });
}

export function useVerifyOtp() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => authService.verifyOtp(payload),
    onSuccess: (data) => {
      // Seed the cache so the UI is signed-in immediately, then refetch fresh.
      queryClient.setQueryData(queryKeys.auth.me, data?.user ?? null);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (err) => toast.error(err?.message || "That code didn't work."),
  });
}

export function useLoginWithPassword() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (payload) => authService.loginWithPassword(payload),
    onSuccess: (data) => {
      queryClient.setQueryData(queryKeys.auth.me, data?.user ?? null);
      queryClient.invalidateQueries({ queryKey: queryKeys.auth.me });
    },
    onError: (err) => toast.error(err?.message || "Invalid email or password."),
  });
}

export function useLogout() {
  const queryClient = useQueryClient();
  const router = useRouter();
  return useMutation({
    mutationFn: authService.logout,
    onSuccess: () => {
      queryClient.setQueryData(queryKeys.auth.me, null);
      queryClient.clear();
      toast.success("Signed out");
      router.push("/");
    },
    onError: (err) => toast.error(err?.message || "Could not sign out."),
  });
}
