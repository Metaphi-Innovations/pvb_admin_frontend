"use client";

import React, { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ArrowLeft, Save, AlertCircle, MapPin } from "lucide-react";
import {
  type GeoNode, type GeoLevel,
  LEVELS, PARENT_LEVEL, loadGeoNodes, saveGeoNodes, nextGeoId, todayStr,
  DEFAULT_GEO_USER, findGeoDuplicate,
} from "../geo-data";
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

const HIERARCHY_HINT =
  "Zone → Region → State → Area → Territory → District → City → Town → Pincode";

export default function AddGeographyPage() {
  const router = useRouter();

  const [form, setForm] = useState({
    level: "" as GeoLevel | "",
    parentId: null as number | null,
    name: "",
    pincode: "",
    status: "active" as "active" | "inactive",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});

  const nodes = useMemo(() => loadGeoNodes(), []);

  const parentOptions = useMemo(() => {
    if (!form.level) return [];
    const requiredParentLevel = PARENT_LEVEL[form.level];
    if (!requiredParentLevel) return [];
    return nodes.filter((n) => n.level === requiredParentLevel && n.status === "active");
  }, [form.level, nodes]);

  const set = (k: string, v: unknown) => setForm((f) => ({ ...f, [k]: v }));

  const handleLevelChange = (level: GeoLevel | "") => {
    setForm({
      level,
      parentId: null,
      name: "",
      pincode: "",
      status: form.status,
    });
    setErrors({});
  };

  const handlePincodeChange = (value: string) => {
    const digits = value.replace(/\D/g, "").slice(0, 6);
    setForm((f) => ({ ...f, pincode: digits, name: digits }));
  };

  const validate = (): boolean => {
    const e: Record<string, string> = {};
    const isPincode = form.level === "Pincode";
    const nameValue = isPincode ? form.pincode.trim() : form.name.trim();

    if (!form.level) { e.level = "Level is required"; }
    if (!isPincode && !form.name.trim()) { e.name = "Name is required"; }
    if (!isPincode && form.name.trim().length > 100) { e.name = "Name must be 100 characters or less"; }
    if (form.level && PARENT_LEVEL[form.level] !== null && !form.parentId) {
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
    if (form.level && nameValue) {
      const parent = form.parentId ? nodes.find((n) => n.id === form.parentId) : null;
      const duplicate = findGeoDuplicate(form.level as GeoLevel, nameValue, form.parentId, nodes);
      if (duplicate) {
        const msg = isPincode
          ? `Pincode ${nameValue} already exists${parent ? ` under ${parent.name}` : ""}.`
          : `A ${form.level} with this name already exists${parent ? ` under ${parent.name}` : ""}.`;
        if (isPincode) e.pincode = msg;
        else e.name = msg;
      }
    }
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const handleSave = () => {
    if (!validate()) return;
    const all = loadGeoNodes();
    const today = todayStr();
    const isPincode = form.level === "Pincode";
    const newNode: GeoNode = {
      id: nextGeoId(all),
      level: form.level as GeoLevel,
      name: isPincode ? form.pincode.trim() : form.name.trim(),
      parentId: form.parentId,
      pincode: isPincode ? form.pincode.trim() : form.pincode,
      status: form.status,
      createdBy: DEFAULT_GEO_USER,
      createdDate: today,
      updatedBy: DEFAULT_GEO_USER,
      updatedDate: today,
    };
    saveGeoNodes([...all, newNode]);
    router.push("/masters/geography");
  };

  return (
    <AppLayout>
      <div className="max-w-[560px] mx-auto">
        <div className="flex items-center gap-3 mb-5">
          <button
            onClick={() => router.push("/masters/geography")}
            className="w-8 h-8 rounded-lg border border-border flex items-center justify-center hover:bg-muted transition-colors"
          >
            <ArrowLeft className="w-4 h-4 text-muted-foreground" />
          </button>
          <div>
            <p className="text-[11px] text-muted-foreground">Masters &rsaquo; Geography &rsaquo; Add</p>
            <h2 className="text-sm font-semibold text-foreground leading-tight">Add Geography Node</h2>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <MapPin className="w-3.5 h-3.5 text-brand-600" />
            </div>
            <div>
              <p className="text-xs font-semibold text-foreground">New Geography Node</p>
              <p className="text-[11px] text-muted-foreground mt-0.5">{HIERARCHY_HINT}</p>
            </div>
          </div>

          <div className="p-5 space-y-4">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">
                Level <span className="text-red-500">*</span>
              </Label>
              <div className="flex flex-wrap gap-1.5">
                {LEVELS.map((l) => (
                  <button
                    key={l}
                    type="button"
                    onClick={() => handleLevelChange(l)}
                    className={cn(
                      "h-8 px-3 rounded-lg border text-xs font-medium transition-colors",
                      form.level === l
                        ? "bg-brand-600 text-white border-brand-600"
                        : "border-border text-muted-foreground hover:bg-muted hover:text-foreground",
                    )}
                  >
                    {l}
                  </button>
                ))}
              </div>
              {errors.level && (
                <p className="text-xs text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.level}
                </p>
              )}
            </div>

            {form.level && PARENT_LEVEL[form.level] !== null && (
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  {form.level === "Pincode" ? "Town" : `Parent (${PARENT_LEVEL[form.level]})`}{" "}
                  <span className="text-red-500">*</span>
                </Label>
                {form.level === "Pincode" && (
                  <p className="text-[11px] text-muted-foreground -mt-0.5">
                    Select the town this pincode belongs to
                  </p>
                )}
                <AutocompleteSelect
                  options={parentOptions.map((n) => ({ value: String(n.id), label: n.name }))}
                  value={form.parentId != null ? String(form.parentId) : ""}
                  onChange={(v) => set("parentId", v ? Number(v) : null)}
                  placeholder={`Select ${form.level === "Pincode" ? "Town" : PARENT_LEVEL[form.level]}…`}
                  searchPlaceholder={`Search ${form.level === "Pincode" ? "town" : PARENT_LEVEL[form.level]!.toLowerCase()}…`}
                  error={!!errors.parentId}
                  className="h-9 text-sm"
                />
                {parentOptions.length === 0 && (
                  <p className="text-[11px] text-amber-600">
                    No active {PARENT_LEVEL[form.level]} nodes found. Add one first.
                  </p>
                )}
                {errors.parentId && (
                  <p className="text-xs text-red-500 flex items-center gap-1">
                    <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" /> {errors.parentId}
                  </p>
                )}
              </div>
            )}

            {form.level === "Pincode" ? (
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
                  placeholder={form.level ? NAME_PLACEHOLDER[form.level] : "Select a level first"}
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
            </div>
          </div>

          <div className="px-5 py-4 border-t border-border bg-muted/20 flex items-center justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => router.push("/masters/geography")}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
              <Save className="w-3.5 h-3.5" /> Save
            </Button>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
