"use client";

import Link from "next/link";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function UnauthorizedPage() {
  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] px-4 text-center">
      <div className="w-14 h-14 rounded-2xl bg-rose-50 border border-rose-200 flex items-center justify-center mb-4">
        <ShieldX className="w-7 h-7 text-rose-600" />
      </div>
      <h1 className="text-2xl font-bold text-foreground tracking-tight">403 — Unauthorized</h1>
      <p className="text-sm text-muted-foreground mt-2 max-w-md">
        You do not have permission to access this page. Contact your administrator if you believe
        this is a mistake.
      </p>
      <div className="flex items-center gap-3 mt-6">
        <Button asChild variant="outline">
          <Link href="/dashboard">Go to Dashboard</Link>
        </Button>
      </div>
    </div>
  );
}
