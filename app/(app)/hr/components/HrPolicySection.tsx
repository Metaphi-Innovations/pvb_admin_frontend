"use client";

import React, { useCallback, useMemo, useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { HrStatusBadge } from "./HrStatusBadge";
import { Plus, Pencil, Trash2 } from "lucide-react";
import type { PolicyBase } from "@/lib/hr/policy-common";

export type PolicyColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type SheetMode = "add" | "edit" | null;

export function HrPolicySection<T extends PolicyBase>({
  title,
  description,
  records,
  onSave,
  columns,
  defaultForm,
  getFormFromRecord,
  recordFromForm,
  validate,
  renderFormFields,
  searchKeys,
}: {
  title: string;
  description?: string;
  records: T[];
  onSave: (list: T[]) => void;
  columns: PolicyColumn<T>[];
  defaultForm: Partial<T>;
  getFormFromRecord: (r: T) => Partial<T>;
  recordFromForm: (form: Partial<T>, id: number, existing?: T) => T;
  validate: (form: Partial<T>) => string | null;
  renderFormFields: (ctx: {
    form: Partial<T>;
    setForm: React.Dispatch<React.SetStateAction<Partial<T>>>;
    errors: Record<string, string>;
  }) => React.ReactNode;
  searchKeys: (keyof T)[];
}) {
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [mode, setMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<T | null>(null);
  const [form, setForm] = useState<Partial<T>>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const filtered = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      );
    }
    if (sortKey) {
      r.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey] ?? "");
        const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [records, search, sortKey, sortDir, searchKeys]);

  const openAdd = () => {
    setForm({ ...defaultForm });
    setActive(null);
    setErrors({});
    setMode("add");
  };

  const openEdit = (row: T) => {
    setForm(getFormFromRecord(row));
    setActive(row);
    setErrors({});
    setMode("edit");
  };

  const persist = () => {
    const err = validate(form);
    if (err) {
      setErrors({ _form: err });
      return;
    }
    const id = mode === "add" ? Math.max(0, ...records.map((r) => r.id)) + 1 : active!.id;
    const next = recordFromForm(form, id, active ?? undefined);
    if (mode === "add") onSave([...records, next]);
    else onSave(records.map((r) => (r.id === id ? next : r)));
    setMode(null);
  };

  const remove = (row: T) => {
    if (!confirm("Delete this record?")) return;
    onSave(records.filter((r) => r.id !== row.id));
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-section-title text-navy-900">{title}</h2>
          {description && <p className="text-helper text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <Button size="sm" onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add
        </Button>
      </div>

      <div className="flex gap-2">
        <Input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search…"
          className="h-8 max-w-xs text-table"
        />
      </div>

      <div className="page-shell overflow-hidden">
        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-table">
            <thead className="sticky top-0 z-10 bg-white border-b border-border">
              <tr>
                {columns.map((col) => (
                  <th
                    key={String(col.key)}
                    className={cn(
                      "px-3 py-2 text-left text-[10px] font-semibold uppercase tracking-wider text-muted-foreground",
                      col.sortable && "cursor-pointer hover:text-foreground",
                    )}
                    onClick={() => col.sortable && handleSort(String(col.key))}
                  >
                    {col.header}
                  </th>
                ))}
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                  Status
                </th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-muted-foreground text-xs">
                    No records. Click Add to create policy configuration.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr key={row.id} className="border-b border-border/50 hover:bg-brand-50/30">
                    {columns.map((col) => (
                      <td key={String(col.key)} className="px-3 py-2 text-xs">
                        {col.render ? col.render(row) : String((row as Record<string, unknown>)[col.key as string] ?? "—")}
                      </td>
                    ))}
                    <td className="px-3 py-2">
                      <HrStatusBadge status={row.status} />
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(row)}>
                          <Pencil className="w-3.5 h-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-red-600" onClick={() => remove(row)}>
                          <Trash2 className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <Sheet open={mode !== null} onOpenChange={(o) => !o && setMode(null)}>
        <SheetContent className="sm:max-w-md">
          <SheetHeader>
            <SheetTitle className="text-base">{mode === "add" ? `Add ${title}` : `Edit ${title}`}</SheetTitle>
          </SheetHeader>
          <SheetBody>
            {errors._form && <p className="text-xs text-red-600 mb-2">{errors._form}</p>}
            {renderFormFields({ form, setForm, errors })}
            <div className="flex items-center justify-between p-2.5 rounded-lg border bg-muted/20 mt-3">
              <Label className="text-xs">Active</Label>
              <Switch
                checked={(form.status ?? "active") === "active"}
                onCheckedChange={(v) => setForm((f) => ({ ...f, status: v ? "active" : "inactive" }))}
              />
            </div>
          </SheetBody>
          <SheetFooter>
            <Button variant="outline" size="sm" onClick={() => setMode(null)}>
              Cancel
            </Button>
            <Button size="sm" onClick={persist}>
              Save
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}

export function PolicyField({
  label,
  required,
  error,
  className,
  children,
}: {
  label: string;
  required?: boolean;
  error?: string;
  className?: string;
  children: React.ReactNode;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className="text-xs font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function compactSelect(className?: string) {
  return cn("h-8 text-xs", className);
}
