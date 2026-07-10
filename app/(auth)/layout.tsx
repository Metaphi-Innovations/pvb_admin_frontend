"use client";

import { Suspense } from "react";
import { GuestGate } from "@/components/auth/GuestGate";

export default function AuthGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <Suspense
      fallback={
        <div className="flex items-center justify-center min-h-screen text-sm text-muted-foreground">
          Loading…
        </div>
      }
    >
      <GuestGate>{children}</GuestGate>
    </Suspense>
  );
}
