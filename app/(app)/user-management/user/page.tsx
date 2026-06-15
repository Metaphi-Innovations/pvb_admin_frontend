"use client";

import React, { useState, useCallback, useEffect } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus, Download, MoreVertical, Eye, Edit2, Trash2, Users,
  CheckCircle2, XCircle, X, AlertTriangle,
  Calendar, Clock, MapPin,
} from "lucide-react";
import GeographyAssignmentSection from "./components/GeographyAssignmentSection";
import ReportingAssignmentSection from "./components/ReportingAssignmentSection";

// ── Types ─────────────────────────────────────────────────────────────────────
export interface User {
  id: number;
  employeeId: string;
  fullName: string;
  email: string;
  mobile: string;
  department: string;
  role: string;
  reportingManager: string;
  stateAccess: string[];
  territoryAccess: string[];
  status: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

// ── Seed data ─────────────────────────────────────────────────────────────────
const SEED: User[] = [
  {
    id: 1,
    employeeId: "EMP-001",
    fullName: "Rajesh Kumar",
    email: "rajesh@dharitrisutra.com",
    mobile: "9876543210",
    department: "Sales",
    role: "Manager",
    reportingManager: "Admin",
    stateAccess: ["Maharashtra", "Gujarat"],
    territoryAccess: ["Mumbai", "Pune"],
    status: "active",
    createdBy: "System",
    createdDate: "2024-01-10",
    updatedBy: "System",
    updatedDate: "2024-01-10",
  },
  {
    id: 2,
    employeeId: "EMP-002",
    fullName: "Priya Sharma",
    email: "priya@dharitrisutra.com",
    mobile: "9876543211",
    department: "HR",
    role: "Admin",
    reportingManager: "CEO",
    stateAccess: ["All States"],
    territoryAccess: ["All Territories"],
    status: "active",
    createdBy: "System",
    createdDate: "2024-01-15",
    updatedBy: "System",
    updatedDate: "2024-01-15",
  },
];

// ── Permission modules ────────────────────────────────────────────────────────
const PERMISSION_MODULES = [
  "Dashboard",
  "Masters",
  "Procurement",
  "Sales",
  "HR",
  "Accounts",
  "Farmer",
  "Event",
  "Demo",
  "Settings",
];

const PERMISSION_ACTIONS = ["View", "Create", "Edit", "Delete", "Approve", "Export"];

// ── Toast (shared) ────────────────────────────────────────────────────────────
interface ToastState { msg: string; type: "success" | "error" }

function Toast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div className={cn(
      "fixed bottom-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
      "animate-in slide-in-from-bottom-2 fade-in-0 duration-300",
      toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
    )}>
      {toast.type === "success"
        ? <CheckCircle2 className="w-4 h-4 flex-shrink-0" />
        : <XCircle className="w-4 h-4 flex-shrink-0" />}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ── Tab Component: Geography & Reporting ──────────────────────────────────────
function GeographyReportingTab({ employee }: { employee: User }) {
  const [toast, setToast] = useState<ToastState | null>(null);
  const showToast = useCallback((msg: string, type: "success" | "error" = "success") => {
    setToast({ msg, type });
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const isInactive = employee.status !== "active";

  return (
    <div className="space-y-8">
      {/* No-role warning */}
      {!employee.role && (
        <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">
            Please assign a role to this employee first before setting geography.
          </p>
        </div>
      )}

      {/* Section 1 — Geography Assignment */}
      <GeographyAssignmentSection
        role={employee.role}
        employeeName={employee.fullName}
        isInactive={isInactive}
        onToast={showToast}
      />

      {/* Section 2 — Reporting Assignment */}
      <ReportingAssignmentSection
        role={employee.role}
        employeeId={employee.id}
        employeeName={employee.fullName}
        employeeInitials={employee.fullName.split(" ").map(w => w[0]).join("").slice(0, 2).toUpperCase()}
        isInactive={isInactive}
        onToast={showToast}
      />

      {toast && <Toast toast={toast} onDismiss={() => setToast(null)} />}
    </div>
  );
}

// ── Tab Component: Basic Details ──────────────────────────────────────────────
function BasicDetailsTab() {
  const [form, setForm] = useState({
    employeeId: "EMP-001",
    fullName: "Rajesh Kumar",
    email: "rajesh@dharitrisutra.com",
    mobile: "9876543210",
    department: "Sales",
    role: "Manager",
    reportingManager: "Admin",
    stateAccess: "Maharashtra, Gujarat",
    territoryAccess: "Mumbai, Pune",
  });

  return (
    <div className="space-y-6">
      {/* Basic Information Section */}
      <div>
        <div className="pb-3 border-b border-border mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Basic Information</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Employee ID *</Label>
            <Input
              value={form.employeeId}
              onChange={e => setForm({ ...form, employeeId: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Full Name *</Label>
            <Input
              value={form.fullName}
              onChange={e => setForm({ ...form, fullName: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Email *</Label>
            <Input
              type="email"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Mobile *</Label>
            <Input
              value={form.mobile}
              onChange={e => setForm({ ...form, mobile: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Organization & Access Section */}
      <div>
        <div className="pb-3 border-b border-border mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Organization & Access</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Department *</Label>
            <Input
              value={form.department}
              onChange={e => setForm({ ...form, department: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Role *</Label>
            <Input
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Reporting Manager</Label>
            <Input
              value={form.reportingManager}
              onChange={e => setForm({ ...form, reportingManager: e.target.value })}
              className="h-9 text-sm rounded-lg"
            />
          </div>
        </div>
      </div>

      {/* Geographic Access Section */}
      <div>
        <div className="pb-3 border-b border-border mb-4">
          <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Geographic Access</p>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">State Access</Label>
            <Input
              value={form.stateAccess}
              onChange={e => setForm({ ...form, stateAccess: e.target.value })}
              placeholder="e.g., Maharashtra, Gujarat"
              className="h-9 text-sm rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground">Comma-separated state names</p>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Territory Access</Label>
            <Input
              value={form.territoryAccess}
              onChange={e => setForm({ ...form, territoryAccess: e.target.value })}
              placeholder="e.g., Mumbai, Pune"
              className="h-9 text-sm rounded-lg"
            />
            <p className="text-[11px] text-muted-foreground">Comma-separated territory names</p>
          </div>
        </div>
      </div>

      {/* Audit Info Section */}
      <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
        <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
        <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
          <div>
            <span className="text-muted-foreground">Created By</span>
            <p className="font-medium">System</p>
          </div>
          <div>
            <span className="text-muted-foreground">Created Date</span>
            <p className="font-medium">2024-01-10</p>
          </div>
          <div>
            <span className="text-muted-foreground">Updated By</span>
            <p className="font-medium">System</p>
          </div>
          <div>
            <span className="text-muted-foreground">Updated Date</span>
            <p className="font-medium">2024-01-10</p>
          </div>
        </div>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-2">
        <Button variant="outline" size="sm" className="h-8 text-xs">
          Discard
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
          Save Changes
        </Button>
      </div>
    </div>
  );
}

// ── Tab Component: Permissions ────────────────────────────────────────────────
function PermissionsTab() {
  const [permissions, setPermissions] = useState<Record<string, Record<string, boolean>>>({});

  const togglePermission = (module: string, action: string) => {
    setPermissions(prev => ({
      ...prev,
      [module]: {
        ...prev[module],
        [action]: !prev[module]?.[action],
      },
    }));
  };

  return (
    <div className="space-y-4">
      <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2">
        <p className="text-xs text-blue-700">
          Select permissions for each module. Users can only access features they have permission for.
        </p>
      </div>

      <Accordion type="single" collapsible className="space-y-2">
        {PERMISSION_MODULES.map((module) => (
          <AccordionItem key={module} value={module} className="border border-border rounded-lg px-4">
            <AccordionTrigger className="py-3 hover:no-underline" data-value={module}>
              <span className="text-sm font-semibold text-foreground">{module}</span>
              <span className="ml-auto text-xs text-muted-foreground">
                {Object.values(permissions[module] || {}).filter(Boolean).length} / {PERMISSION_ACTIONS.length}
              </span>
            </AccordionTrigger>
            <AccordionContent className="pt-0 pb-4" data-value={module}>
              <div className="grid grid-cols-3 gap-3 mt-4">
                {PERMISSION_ACTIONS.map((action) => (
                  <label
                    key={action}
                    className="flex items-center gap-2.5 cursor-pointer group p-2 hover:bg-muted/40 rounded-lg transition-colors"
                  >
                    <input
                      type="checkbox"
                      checked={permissions[module]?.[action] || false}
                      onChange={() => togglePermission(module, action)}
                      className="w-4 h-4 rounded accent-brand-600 cursor-pointer"
                    />
                    <span className="text-xs font-medium text-foreground group-hover:text-brand-600 transition-colors">
                      {action}
                    </span>
                  </label>
                ))}
              </div>
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>

      {/* Action Buttons */}
      <div className="flex items-center gap-2 pt-4 border-t border-border">
        <Button variant="outline" size="sm" className="h-8 text-xs">
          Reset Permissions
        </Button>
        <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white">
          Save Permissions
        </Button>
      </div>
    </div>
  );
}

// ── Main Page ─────────────────────────────────────────────────────────────────
export default function UserPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>(SEED);

  return (
    <AppLayout>
      <div className="space-y-5">

        {/* ── Page header ── */}
        <div className="flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-bold text-foreground">User</h1>
            <p className="text-xs text-muted-foreground mt-0.5">Manage user accounts and permissions</p>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
              <Download className="w-3.5 h-3.5" /> Export
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            >
              <Plus className="w-3.5 h-3.5" /> Add User
            </Button>
          </div>
        </div>

        {/* ── User Card (Demo) ── */}
        <div className="border border-border rounded-xl bg-white shadow-sm overflow-hidden">
          <div className="p-4 border-b border-border flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand-100 flex items-center justify-center flex-shrink-0">
                <Users className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <p className="text-sm font-semibold text-foreground">Rajesh Kumar</p>
                <p className="text-xs text-muted-foreground">Sales Manager • EMP-001</p>
              </div>
            </div>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 hover:bg-muted rounded-md transition-colors">
                  <MoreVertical className="w-4 h-4 text-muted-foreground" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-44">
                <DropdownMenuLabel className="text-[10px] text-muted-foreground uppercase tracking-widest py-1">
                  Actions
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <button
                  type="button"
                  onClick={() => router.push("/user-management/user/1")}
                  className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm"
                >
                  <Eye className="w-3.5 h-3.5" /> View
                </button>
                <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-foreground hover:bg-muted/60 transition-colors rounded-sm">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </button>
                <DropdownMenuSeparator />
                <button className="flex items-center gap-2 w-full px-2 py-1.5 text-xs text-red-600 hover:bg-red-50 transition-colors rounded-sm">
                  <Trash2 className="w-3.5 h-3.5" /> Delete
                </button>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

          {/* ── Tabs ── */}
          <Tabs defaultValue="basic-details" className="w-full">
            <TabsList className="flex w-full border-b border-border bg-transparent p-0 rounded-none overflow-x-auto scrollbar-none">
              <TabsTrigger
                value="basic-details"
                className={cn(
                  "flex-shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors",
                  "data-[state=active]:border-brand-600 data-[state=active]:text-brand-700",
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                Basic Details
              </TabsTrigger>
              <TabsTrigger
                value="permissions"
                className={cn(
                  "flex-shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors",
                  "data-[state=active]:border-brand-600 data-[state=active]:text-brand-700",
                  "text-muted-foreground hover:text-foreground",
                )}
              >
                Permissions
              </TabsTrigger>
              <TabsTrigger
                value="geography-reporting"
                className={cn(
                  "flex-shrink-0 rounded-none border-b-2 border-transparent px-4 py-3 text-sm font-medium transition-colors",
                  "data-[state=active]:border-brand-600 data-[state=active]:text-brand-700",
                  "text-muted-foreground hover:text-foreground",
                  "flex items-center gap-1.5",
                )}
              >
                <MapPin className="w-3.5 h-3.5" />
                Geography &amp; Reporting
              </TabsTrigger>
            </TabsList>

            <div className="p-6">
              <TabsContent value="basic-details" className="m-0">
                <BasicDetailsTab />
              </TabsContent>
              <TabsContent value="permissions" className="m-0">
                <PermissionsTab />
              </TabsContent>
              <TabsContent value="geography-reporting" className="m-0">
                <GeographyReportingTab employee={users[0]} />
              </TabsContent>
            </div>
          </Tabs>
        </div>

      </div>
    </AppLayout>
  );
}
