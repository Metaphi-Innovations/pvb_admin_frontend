"use client";

import "./hr-module.css";
import { HrSidebarProvider } from "./components/HrSidebarContext";
import { HrModuleShell } from "./components/HrModuleShell";
import { HR_VIEWPORT_HEIGHT } from "@/lib/hr/hr-layout-constants";

/**
 * HR module layout — persistent contextual sidebar (Accounts-style pattern).
 * Shared by Settings, Employees, Attendance, Claims, etc.
 * Does not modify AppShell / TopNavbar / Accounts.
 */
export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className="flex h-full min-h-0 w-full overflow-hidden"
      style={{ height: HR_VIEWPORT_HEIGHT, maxHeight: HR_VIEWPORT_HEIGHT }}
    >
      <HrSidebarProvider>
        <HrModuleShell>{children}</HrModuleShell>
      </HrSidebarProvider>
    </div>
  );
}
