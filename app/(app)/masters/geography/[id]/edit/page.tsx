"use client";

import React, { useState, useMemo, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, AlertCircle, MapPin, Info, Trash2 } from "lucide-react";
import {
  type GeoNode, type GeoLevel,
  PARENT_LEVEL, loadGeoNodes, saveGeoNodes, todayStr,
  DEFAULT_GEO_USER, findGeoDuplicate, validateParentChange,
} from "../../geo-data";
import { LevelBadge } from "../../components/LevelBadge";
import { GeographyDeleteDialog } from "../../components/GeographyDeleteDialog";
import { ActiveInactiveToggle } from "@/components/ui/ActiveInactiveToggle";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

const NAME_PLACEHOLDER: Record<GeoLevel, string> = {
  Zone: "e.g. West Zone",
  Region: "e.g. Maharashtra Region",
  State: "e.g. Maharashtra State",
  Area: "e.g. Pune Area",
  Territory: "e.g. West Territory",
  District: "e.g. Pune District",
  City: "e.g. Pune City",
  Town: "e.g. Kothrud Town",
  Pincode: "e.g. 411038",
};

export default function EditGeographyPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [existing, setExisting] = useState<GeoNode | null>(null);
  const [form, setForm] = useState({
    parentId: null as number | null,
    name: "",
    pincode: "",
    status: "active" as "active" | "inactive",
  });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [deleteOpen, setDeleteOpen] = useState(false);

  useEffect(() => {
    const all = loadGeoNodes();
    setNodes(all);
    const found = all.find((n) => n.id === id) ?? null;
    setExisting(found);
    if (found) {
      setForm({
        parentId: found.parentId,
        name: found.name,
        pincode: found.pincode,
        status: found.status,
      });
    }
  }, [id]);

  const parentOptions = useMemo(() => {
    if (!existing) return [];
    const requiredParentLevel = PARENT_LEVEL[existing.level];
    if (!requiredParentLevel) return [];
    return nodes.filter(
      (n) => n.level === requiredParentLevel && n.status === "active" && n.id !== id,
    );
  }, [existing, nodes, id]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: digits, name: digits }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const isPincode = existing?.level === "Pincode";
    const nameValue = isPincode ? form.pincode.trim() : form.name.trim();

    if (!isPincode && !form.name.trim()) { e.name = "Name is required"; }
    if (!isPincode && form.name.trim().length > 100) { e.name = "Name must be 100 characters or less"; }
    if (existing && PARENT_LEVEL[existing.level] !== null && !form.parentId) {
      e.parentId = isPincode
        ? "Select a town for this pincode"
        : "Parent is required for this level";
    }
    if (isPincode && !form.pincode.trim()) {
      e.pincode = "Pincode is required";
    }
    if (form.pincode && !/^\d{6}$/.test(form.pincode)) {
      e.pincode = "Pincode must be exactly 6 digits";
    }
    if (existing && nameValue) {
      const parent = form.parentId ? nodes.find((n) => n.id === form.parentId) : null;
      const duplicate = findGeoDuplicate(
        existing.level,
        nameValue,
        form.parentId,
        nodes,
        id,
      );
      if (duplicate) {
        const msg = isPincode
          ? `Pincode ${nameValue} already exists${parent ? ` under ${parent.name}` : ""}.`
          : `A ${existing.level} with this name already exists${parent ? ` under ${parent.name}` : ""}.`;
        if (isPincode) e.pincode = msg;
        else e.name = msg;
      }
    }
    if (existing) {
      const parentErr = validateParentChange(existing, form.parentId, nodes);
      if (parentErr) e.parentId = parentErr;
    }
    if (existing && form.status === "inactive" && existing.status === "active") {
      const hasActiveChildren = nodes.some(
        (n) => n.parentId === id && n.status === "active",
      );
      if (hasActiveChildren) {
        e.status = "Deactivate all child nodes before deactivating this geography.";
      }
    }
    if (existing && form.status === "active" && existing.status === "inactive") {
      if (form.parentId !== null) {
        const parent = nodes.find((n) => n.id === form.parentId);
        if (parent && parent.status !== "active") {
          e.status = `Cannot activate. Parent "${parent.name}" is inactive. Activate the parent first.`;
        }
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate() || !existing) return;
    const isPincode = existing.level === "Pincode";
    const updated = nodes.map((n) =>
      n.id === id
        ? {
            ...n,
            parentId: form.parentId,
            name: isPincode ? form.pincode.trim() : form.name.trim(),
            pincode: isPincode ? form.pincode.trim() : form.pincode,
            status: form.status,
            updatedDate: todayStr(),
            updatedBy: DEFAULT_GEO_USER,
          }
        : n,
    );
    saveGeoNodes(updated);
    router.push(`/masters/geography/${id}`);
  };

  const handleDeleted = (_count: number) => {
    router.push("/masters/geography");
  };

  if (nodes.length > 0 && !existing) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Geography node not found</p>
          <button onClick={() => router.push("/masters/geography")} className="text-xs text-brand-600 hover:underline">
            ← Back to Geography
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!existing) return null;

  const needsParent = PARENT_LEVEL[existing.level] !== null;

  return (
    <AppLayout>
      <div className="max-w-[560px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push(`/masters/geography/${id}`)}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <p className="text-[11px] text-muted-foreground">Masters &rsaquo; Geography &rsaquo; Edit</p>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Edit — {existing.name}</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
            </div>
            <div className="flex-1">
              <p className="text-xs font-semibold text-foreground">Edit Geography Node</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">Level: <strong>{existing.level}</strong></p>
            </div>
            <LevelBadge level={existing.level} />
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Level</Label>
              <div className="h-9 px-3 border border-border rounded-lg bg-muted/30 flex items-center">
                <LevelBadge level={existing.level} />
              </div>
              <div className="flex items-start gap-1.5 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                <Info className="w-3.5 h-3.5 text-amber-600 flex-shrink-0 mt-0.5" />
                <p className="text-[11px] text-amber-700">Level cannot be changed after creation.</p>
              </div>
            </div>

            {needsParent && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {existing.level === "Pincode" ? "Town" : `Parent (${PARENT_LEVEL[existing.level]})`}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                {existing.level === "Pincode" && (
                  <p className="text-[11px] text-muted-foreground -mt-0.5">
                    Select the town this pincode belongs to
                  </p>
                )}
                <AutocompleteSelect
                  options={parentOptions.map((n) => ({ value: String(n.id), label: n.name }))}
                  value={form.parentId != null ? String(form.parentId) : ""}
                  onChange={(v) => set("parentId", v ? Number(v) : null)}
                  placeholder={`Select ${existing.level === "Pincode" ? "Town" : PARENT_LEVEL[existing.level]}…`}
                  searchPlaceholder={`Search ${existing.level === "Pincode" ? "town" : PARENT_LEVEL[existing.level]!.toLowerCase()}…`}
                  error={!!errors.parentId}
                  className="h-9 text-sm"
                />
                {errors.parentId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.parentId}
                  </p>
                )}
              </div>
            )}

            {existing.level === "Pincode" ? (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Pincode <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.pincode}
                  onChange={(e) => handlePincodeChange(e.target.value)}
                  placeholder="e.g. 411038"
                  maxLength={6}
                  inputMode="numeric"
                  className={cn("h-9 text-sm rounded-lg font-mono", errors.pincode && "border-red-400")}
                />
                {errors.pincode && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.pincode}
                  </p>
                )}
                <p className="text-[11px] text-muted-foreground">Enter 6-digit pincode. It will be saved as the record name.</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  Name <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  placeholder={NAME_PLACEHOLDER[existing.level]}
                  maxLength={100}
                  className={cn("h-9 text-sm rounded-lg", errors.name && "border-red-400")}
                />
                {errors.name && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.name}
                  </p>
                )}
              </div>
            )}

            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Status</Label>
              <div className="flex items-center gap-3">
                <ActiveInactiveToggle
                  active={form.status === "active"}
                  onChange={(active) => set("status", active ? "active" : "inactive")}
                />
                <StatusBadge status={form.status} />
              </div>
              {errors.status && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.status}
                </p>
              )}
              <p className="text-[11px] text-muted-foreground">
                Inactive records remain in the hierarchy but are hidden from the Active tab and assignment dropdowns.
              </p>
            </div>

            <div className="bg-muted/30 rounded-xl p-3.5 space-y-2 text-[11px]">
              <p className="font-semibold text-muted-foreground uppercase tracking-wider text-[10px]">Record Info</p>
              <div className="grid grid-cols-2 gap-y-1.5 gap-x-4">
                <div>
                  <span className="text-muted-foreground">Created By</span>
                  <p className="font-medium">{existing.createdBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Created</span>
                  <p className="font-medium">{existing.createdDate}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Updated By</span>
                  <p className="font-medium">{existing.updatedBy}</p>
                </div>
                <div>
                  <span className="text-muted-foreground">Last Updated</span>
                  <p className="font-medium">{existing.updatedDate}</p>
                </div>
              </div>
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-between gap-2">
            <Button
              variant="destructive"
              size="sm"
              className="h-8 text-xs gap-1.5"
              onClick={() => setDeleteOpen(true)}
            >
              <Trash2 className="w-3.5 h-3.5" /> Delete
            </Button>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push(`/masters/geography/${id}`)}>
                Cancel
              </Button>
              <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
                <Save className="w-3.5 h-3.5" /> Save Changes
              </Button>
            </div>
          </div>
        </div>

        <GeographyDeleteDialog
          node={existing}
          nodes={nodes}
          open={deleteOpen}
          onClose={() => setDeleteOpen(false)}
          onDeleted={handleDeleted}
        />
      </div>
    </AppLayout>
  );
}
