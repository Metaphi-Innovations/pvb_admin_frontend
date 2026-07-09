"use client";

import React from "react";
import { AppLayout } from "@/components/layout/AppLayout";

export function POFormPageSkeleton() {
  return (
    <AppLayout>
      <div className="w-full space-y-4">
        <div className="flex items-center justify-between border-b pb-3">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-lg bg-muted animate-pulse" />
            <div className="space-y-2">
              <div className="h-4 w-44 rounded bg-muted animate-pulse" />
              <div className="h-3 w-64 rounded bg-muted animate-pulse" />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="h-9 w-24 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-40 rounded-lg bg-muted animate-pulse" />
            <div className="h-9 w-28 rounded-lg bg-muted animate-pulse" />
          </div>
        </div>

        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="space-y-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-5">
              {Array.from({ length: 10 }).map((_, idx) => (
                <div key={idx} className="space-y-1">
                  <div className="h-3 w-24 rounded bg-muted animate-pulse" />
                  <div className="h-8 w-full rounded-lg bg-muted animate-pulse" />
                </div>
              ))}
            </div>
            <div className="h-56 rounded-lg border border-border bg-muted/30 animate-pulse" />
            <div className="h-32 rounded-lg border border-border bg-muted/30 animate-pulse" />
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

export function PODetailPageSkeleton() {
  return (
    <AppLayout>
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div className="space-y-2">
              <div className="h-4 w-56 rounded bg-muted animate-pulse" />
              <div className="h-3 w-40 rounded bg-muted animate-pulse" />
            </div>
            <div className="h-8 w-28 rounded-lg bg-muted animate-pulse" />
          </div>
          <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-3">
            {Array.from({ length: 3 }).map((_, idx) => (
              <div key={idx} className="h-20 rounded-lg border border-border bg-muted/30 animate-pulse" />
            ))}
          </div>
        </div>
        <div className="h-8 w-48 rounded-lg bg-muted animate-pulse" />
        <div className="h-[420px] rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="space-y-3">
            {Array.from({ length: 8 }).map((_, idx) => (
              <div key={idx} className="h-8 rounded-lg bg-muted/50 animate-pulse" />
            ))}
          </div>
        </div>
      </div>
    </AppLayout>
  );
}

