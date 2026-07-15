"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { toast } from "sonner";
import { useLoginWithPassword, useAuth, useLogout } from "@/features/auth/hooks/useAuth";

function LoginCard() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirect = searchParams.get("redirect") || "/";

  const { user, isAuthenticated, isAdmin, isLoading: authLoading } = useAuth();
  const login = useLoginWithPassword();
  const logout = useLogout();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  // Auto-redirect if already authenticated as admin
  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      if (isAdmin) {
        router.replace(redirect);
      } else {
        toast.error("Access denied. Admin role required.");
        logout.mutate();
      }
    }
  }, [authLoading, isAuthenticated, isAdmin, redirect, router, logout]);

  async function handleLogin(e) {
    e?.preventDefault();
    const cleanEmail = email.trim().toLowerCase();
    if (!cleanEmail || !cleanEmail.includes("@")) {
      toast.error("Please enter a valid email address.");
      return;
    }
    if (!password.trim()) {
      toast.error("Please enter your password.");
      return;
    }

    try {
      const res = await login.mutateAsync({ email: cleanEmail, password });
      if (res?.user?.role !== "admin") {
        toast.error("Access denied: You must be an authorized admin to sign in.");
        logout.mutate();
        return;
      }
      toast.success("Welcome back, Admin!");
      router.replace(redirect);
    } catch {
      // Toast message is handled by the hook
    }
  }

  if (authLoading) {
    return (
      <div className="mx-auto flex h-64 w-full max-w-md items-center justify-center rounded-3xl bg-white/80 p-8 shadow-sm">
        <Spinner label="Checking session..." />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md pt-8 sm:pt-16">
      <div className="rounded-3xl border border-cardline bg-white p-6 sm:p-8 shadow-sm">
        <div className="text-center">
          <span className="inline-block text-3xl mb-2">🔐</span>
          <h1 className="text-xl font-black uppercase tracking-tight text-ink sm:text-2xl">
            Admin Sign In
          </h1>
          <p className="mt-1 text-xs text-muted">
            Enter your admin credentials to access the dashboard.
          </p>
        </div>

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label htmlFor="admin-email" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Admin Email
            </label>
            <input
              id="admin-email"
              type="email"
              required
              placeholder="admin@foodville.in"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="input text-sm focus:border-olive"
              autoFocus
            />
          </div>

          <div>
            <label htmlFor="admin-password" className="block text-xs font-bold uppercase tracking-wider text-muted mb-1">
              Password
            </label>
            <div className="relative">
              <input
                id="admin-password"
                type={showPassword ? "text" : "password"}
                required
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="input text-sm pr-10 focus:border-olive"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition"
              >
                {showPassword ? (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={login.isPending || !email.trim() || !password.trim()}
            className="w-full rounded-2xl bg-olive py-3 text-xs font-bold text-white transition hover:bg-olive-dark active:scale-[0.98] disabled:opacity-50 mt-2"
          >
            {login.isPending ? <Spinner label="Signing In..." /> : "Sign In →"}
          </button>
        </form>
      </div>
    </div>
  );
}

function Spinner({ label }) {
  return (
    <span className="inline-flex items-center gap-2">
      <svg className="h-4 w-4 animate-spin text-current" viewBox="0 0 24 24" fill="none">
        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
      </svg>
      {label}
    </span>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={<div className="mx-auto h-64 w-full max-w-md animate-pulse rounded-3xl bg-white/60" />}>
      <LoginCard />
    </Suspense>
  );
}
