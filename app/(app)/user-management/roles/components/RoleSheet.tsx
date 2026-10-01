"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Popover, PopoverContent, PopoverTrigger,
} from "@/components/ui/popover";
import { Check, ChevronsUpDown, AlertCircle } from "lucide-react";

// Re-export Role type from shared data so page.tsx can import from here
export type { Role } from "../roles-data";
import { type Role, DEPARTMENTS } from "../roles-data";

interface RoleSheetProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: {
    roleName: string;
    departmentId: number | null;
    status: string;
  }) => void;
  role?: Role | null;
  existingRoles?: Role[];
}

// ── Department Dropdown ───────────────────────────────────────────────────────
function DepartmentDropdown({
  selectedId,
  onChange,
  error,
}: {
  selectedId: number | null;
  onChange: (id: number) => void;
  error?: string;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedDept = DEPARTMENTS.find(d => d.id === selectedId);
  const filtered = DEPARTMENTS.filter(d => d.name.toLowerCase().includes(search.toLowerCase()));

  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-medium">
        Department <span className="text-red-500">*</span>
      </Label>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button className={cn(
            "w-full h-9 px-3 text-sm text-left border rounded-lg bg-background flex items-center justify-between hover:bg-muted/30 transition-colors",
            error && "border-red-400",
          )}>
            <span className={selectedDept ? "text-foreground" : "text-muted-foreground"}>
              {selectedDept ? selectedDept.name : "Select department…"}
            </span>
            <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="w-[--radix-popover-trigger-width] p-0">
          <div className="p-2 border-b border-border">
            <Input
              placeholder="Search…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="h-8 text-xs"
            />
          </div>
          <div className="max-h-[200px] overflow-y-auto">
            {filtered.map(dept => (
              <button
                key={dept.id}
                onClick={() => { onChange(dept.id); setOpen(false); }}
                className={cn(
                  "w-full flex items-center gap-2.5 px-3 py-2 text-sm text-left rounded-lg transition-colors hover:bg-muted/60",
                  selectedId === dept.id && "bg-brand-50",
                )}
              >
                <span className="flex-1">{dept.name}</span>
                {selectedId === dept.id && <Check className="w-4 h-4 text-brand-600" />}
              </button>
            ))}
          </div>
        </PopoverContent>
      </Popover>
      {error && (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="w-3.5 h-3.5" /> {error}
        </p>
      )}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function RoleSheet({
  open, onClose, onSave, role, existingRoles = [],
}: RoleSheetProps) {
  const isEdit = !!role;
  const [form, setForm] = useState({
    roleName:     role?.roleName     ?? "",
    departmentId: role?.departmentId ?? null as number | null,
    status:       role?.status       ?? "active",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    if (!form.roleName.trim()) e.roleName = "Role name is required";
    if (!form.departmentId)   e.departmentId = "Department is required";

    const dup = existingRoles.find(r =>
      r.roleName.toLowerCase() === form.roleName.toLowerCase() &&
      r.departmentId === form.departmentId &&
      r.id !== role?.id,
    );
    if (dup) e.roleName = "This role already exists in the selected department";

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const reset = () => {
    setForm({ roleName: "", departmentId: null, status: "active" });
    setErrors({});
  };

  const handleSave = () => {
    if (!validate()) return;
    onSave({ roleName: form.roleName, departmentId: form.departmentId, status: form.status });
    reset();
  };

  const handleClose = () => { reset(); onClose(); };

  return (
    <Sheet open={open} onOpenChange={handleClose}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Role" : "Add Role"}</SheetTitle>
          <SheetDescription>
            {isEdit ? "Update role details" : "Create a new role. For advanced options like geo level, approval chain, or sub-categories — use the full form."}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="space-y-5">
          {/* Role Name */}
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              Role Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.roleName}
              onChange={e => setForm(f => ({ ...f, roleName: e.target.value }))}
              placeholder="e.g., Sales Manager"
              className={cn("h-9 text-sm rounded-lg", errors.roleName && "border-red-400")}
            />
            {errors.roleName && (
              <p className="text-xs text-red-500 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5" /> {errors.roleName}
              </p>
            )}
          </div>

          {/* Department */}
          <DepartmentDropdown
            selectedId={form.departmentId}
            onChange={id => setForm(f => ({ ...f, departmentId: id }))}
            error={errors.departmentId}
          />

          {/* Status */}
          <div className="flex items-center justify-between p-3.5 rounded-xl border border-border bg-muted/20">
            <div>
              <p className="text-xs font-medium text-foreground">Status</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                {form.status === "active" ? "Active and available" : "Inactive and hidden"}
              </p>
            </div>
            <div className="flex items-center gap-2 flex-shrink-0">
              <span className={cn("text-xs font-medium", form.status === "active" ? "text-emerald-600" : "text-muted-foreground")}>
                {form.status === "active" ? "Active" : "Inactive"}
              </span>
              <Switch
                checked={form.status === "active"}
                onCheckedChange={v => setForm(f => ({ ...f, status: v ? "active" : "inactive" }))}
              />
            </div>
          </div>
        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            {isEdit ? "Update Role" : "Create Role"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
