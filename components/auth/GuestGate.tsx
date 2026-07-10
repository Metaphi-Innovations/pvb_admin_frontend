"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useAuth } from "@/lib/auth/auth-context";

export const FY_PENDING_KEY = "ds_login_fy_pending";

/** Redirect authenticated users away from login/auth pages (unless FY selection is pending). */
export function GuestGate({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, isLoading } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fyPending =
    mounted && typeof window !== "undefined" && sessionStorage.getItem(FY_PENDING_KEY) === "1";

  useEffect(() => {
    if (!mounted || isLoading) return;
    if (!isAuthenticated) return;
    if (sessionStorage.getItem(FY_PENDING_KEY) === "1") return;

    const next = searchParams?.get("next");
    router.replace(next && next.startsWith("/") ? next : "/dashboard");
  }, [mounted, isAuthenticated, isLoading, router, searchParams]);

  if (!mounted || isLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
        Loading…
      </div>
    );
  }

  if (isAuthenticated && !fyPending) {
    return (
      <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
        Redirecting…
      </div>
    );
  }

  return <>{children}</>;
}
