"use client";

import React, { useMemo, useState } from "react";
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
import { Pagination } from "@/components/listing/Pagination";
import { HrStatusBadge } from "../../components/HrStatusBadge";
import { Plus, Pencil, Trash2, History, Search } from "lucide-react";
import type { PolicyBase } from "@/lib/hr/policy-common";
import { appendPolicyAudit, loadPolicyAuditLog, type PolicyAuditEntry } from "../tada-policy-data";

export type PolicyColumn<T> = {
  key: keyof T | string;
  header: string;
  render?: (row: T) => React.ReactNode;
  sortable?: boolean;
};

type SheetMode = "add" | "edit" | null;

export function PolicyMasterTable<T extends PolicyBase>({
  title,
  description,
  entityName,
  records,
  onSave,
  columns,
  defaultForm,
  getFormFromRecord,
  recordFromForm,
  validate,
  renderFormFields,
  searchKeys,
  filterOptions,
  showImportExport,
  headerActions,
}: {
  title: string;
  description?: string;
  entityName: string;
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
  filterOptions?: {
    key: keyof T;
    label: string;
    values: (string | { v: string; l: string })[];
  }[];
  showImportExport?: boolean;
  headerActions?: React.ReactNode;
}) {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [pageJump, setPageJump] = useState("");
  const [sortKey, setSortKey] = useState<string>("");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [filters, setFilters] = useState<Record<string, string>>({});
  const [mode, setMode] = useState<SheetMode>(null);
  const [active, setActive] = useState<T | null>(null);
  const [form, setForm] = useState<Partial<T>>(defaultForm);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [auditOpen, setAuditOpen] = useState(false);

  const filtered = useMemo(() => {
    let r = [...records];
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter((row) =>
        searchKeys.some((k) => String(row[k] ?? "").toLowerCase().includes(q)),
      );
    }
    for (const [key, val] of Object.entries(filters)) {
      if (val && val !== "all") {
        r = r.filter((row) => String((row as Record<string, unknown>)[key]) === val);
      }
    }
    if (sortKey) {
      r.sort((a, b) => {
        const av = String((a as Record<string, unknown>)[sortKey] ?? "");
        const bv = String((b as Record<string, unknown>)[sortKey] ?? "");
        return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
      });
    }
    return r;
  }, [records, search, sortKey, sortDir, searchKeys, filters]);

  const paginated = useMemo(() => {
    const start = (page - 1) * pageSize;
    return filtered.slice(start, start + pageSize);
  }, [filtered, page, pageSize]);

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
    if (mode === "add") {
      onSave([...records, next]);
      appendPolicyAudit({ user: "Admin", action: "Created", entity: entityName, details: `Added record #${id}` });
    } else {
      onSave(records.map((r) => (r.id === id ? next : r)));
      appendPolicyAudit({ user: "Admin", action: "Updated", entity: entityName, details: `Updated record #${id}` });
    }
    setMode(null);
  };

  const remove = (row: T) => {
    if (!confirm("Delete this record?")) return;
    onSave(records.filter((r) => r.id !== row.id));
    appendPolicyAudit({ user: "Admin", action: "Deleted", entity: entityName, details: `Deleted record #${row.id}` });
  };

  const handleSort = (key: string) => {
    if (sortKey === key) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortKey(key);
      setSortDir("asc");
    }
  };

  const handlePageJump = () => {
    const n = parseInt(pageJump, 10);
    const totalPages = Math.ceil(filtered.length / pageSize);
    if (n >= 1 && n <= totalPages) setPage(n);
    setPageJump("");
  };

  const auditLog = loadPolicyAuditLog().filter((e) => e.entity.includes(entityName.split(" ")[0]) || entityName.includes(e.entity.split(" ")[0]));

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h2 className="text-section-title text-navy-900">{title}</h2>
          {description && <p className="text-helper text-muted-foreground mt-0.5">{description}</p>}
        </div>
        <div className="flex gap-2 flex-wrap">
          {showImportExport && (
            <>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert("Import — UI only (no backend)")}>Import</Button>
              <Button variant="outline" size="sm" className="text-xs" onClick={() => alert("Export — UI only (no backend)")}>Export</Button>
            </>
          )}
          {headerActions}
          <Button variant="outline" size="sm" onClick={() => setAuditOpen(true)}>
            <History className="w-3.5 h-3.5" /> Audit
          </Button>
          <Button size="sm" onClick={openAdd}>
            <Plus className="w-3.5 h-3.5" /> Add
          </Button>
        </div>
      </div>

      <div className="flex flex-wrap gap-2 items-center">
        <div className="relative">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            placeholder="Search…"
            className="h-8 pl-7 max-w-xs text-table"
          />
        </div>
        {filterOptions?.map((fo) => (
          <Select
            key={String(fo.key)}
            value={filters[String(fo.key)] ?? "all"}
            onValueChange={(v) => {
              setFilters((f) => ({ ...f, [String(fo.key)]: v }));
              setPage(1);
            }}
          >
            <SelectTrigger className="h-8 w-[140px] text-xs">
              <SelectValue placeholder={fo.label} />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all" className="text-xs">All {fo.label}</SelectItem>
              {fo.values.map((item) => {
                const v = typeof item === "string" ? item : item.v;
                const l = typeof item === "string" ? item : item.l;
                return (
                  <SelectItem key={v} value={v} className="text-xs">{l}</SelectItem>
                );
              })}
            </SelectContent>
          </Select>
        ))}
      </div>

      <div className="page-shell overflow-hidden">
        <div className="overflow-x-auto">
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
                <th className="px-3 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground">Status</th>
                <th className="px-3 py-2 w-20" />
              </tr>
            </thead>
            <tbody>
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={columns.length + 2} className="px-3 py-10 text-center text-muted-foreground text-xs">
                    No records. Click Add to create policy configuration.
                  </td>
                </tr>
              ) : (
                paginated.map((row) => (
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
        <Pagination
          page={page}
          pageSize={pageSize}
          totalRecords={filtered.length}
          onPageChange={setPage}
          onPageSizeChange={(s) => {
            setPageSize(s);
            setPage(1);
          }}
        />
        <div className="px-4 py-2 border-t flex items-center gap-2 bg-muted/5">
          <span className="text-[11px] text-muted-foreground">Go to page:</span>
          <Input
            value={pageJump}
            onChange={(e) => setPageJump(e.target.value)}
            className="h-7 w-16 text-xs"
            placeholder="#"
            onKeyDown={(e) => e.key === "Enter" && handlePageJump()}
          />
          <Button variant="outline" size="sm" className="h-7 text-xs" onClick={handlePageJump}>
            Go
          </Button>
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
            <Button variant="outline" size="sm" onClick={() => setMode(null)}>Cancel</Button>
            <Button size="sm" onClick={persist}>Save</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <AuditHistoryDrawer open={auditOpen} onOpenChange={setAuditOpen} entries={auditLog.length ? auditLog : loadPolicyAuditLog()} entityName={entityName} />
    </div>
  );
}

function AuditHistoryDrawer({
  open,
  onOpenChange,
  entries,
  entityName,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  entries: PolicyAuditEntry[];
  entityName: string;
}) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg">
        <SheetHeader>
          <SheetTitle className="text-base">Audit History — {entityName}</SheetTitle>
        </SheetHeader>
        <SheetBody>
          <div className="space-y-2 max-h-[70vh] overflow-y-auto">
            {entries.length === 0 ? (
              <p className="text-xs text-muted-foreground">No audit entries yet.</p>
            ) : (
              entries.map((e) => (
                <div key={e.id} className="p-2.5 rounded-lg border bg-muted/10 text-xs">
                  <div className="flex justify-between gap-2">
                    <span className="font-medium">{e.action}</span>
                    <span className="text-muted-foreground">{e.timestamp}</span>
                  </div>
                  <p className="text-muted-foreground mt-0.5">{e.user} · {e.entity}</p>
                  <p className="mt-1">{e.details}</p>
                </div>
              ))
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}

export { PolicyField, compactSelect } from "../../components/HrPolicySection";

/** Radix Select inside the right-side Sheet — avoids hidden menus and z-index clashes. */
export const SHEET_SELECT_CONTENT_PROPS = {
  position: "popper" as const,
  side: "bottom" as const,
  align: "end" as const,
  className: "z-[500]",
};
