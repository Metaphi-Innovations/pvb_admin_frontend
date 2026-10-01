"use client";

import type { ReactNode } from "react";
import { AppLayout } from "@/components/layout/AppLayout";

export default function EmployeeLayout({ children }: { children: ReactNode }) {
  return (
    <AppLayout noPadding className="bg-muted/20">
      {children}
    </AppLayout>
  );
}
