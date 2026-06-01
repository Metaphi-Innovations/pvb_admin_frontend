"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import {
  Plus, AlertCircle, Info, Edit2, Trash2, MapPin,
  CircleDot, Circle, AlertTriangle, CheckCircle2,
} from "lucide-react";

// ── Role → Geography Level mapping ────────────────────────────────────────────
export const ROLE_GEO_MAP: Record<string, string> = {
  NSM:         "__all__",
  ZSM:         "Zone",
  RSM:         "Region",
  ASM:         "Area",
  TM:          "Territory",
  FMO:         "Territory",
  DO:          "City",
  Intern:      "City",
  KAM:         "__any__",
  "HR Manager":"__none__",
  Accounts:    "__none__",
  Procurement: "__none__",
  "Order Mgr": "__none__",
  Admin:       "__none__",
  // Demo fallback
  Manager:     "Area",
};

// ── Mock geography nodes per level ────────────────────────────────────────────
const GEO_BY_LEVEL: Record<string, Array<{ id: number; name: string; path: string }>> = {
  Zone: [
    { id: 1, name: "West Zone",  path: "" },
    { id: 2, name: "South Zone", path: "" },
  ],
  Region: [
    { id: 7,  name: "Mumbai Region",    path: "West Zone › Maharashtra" },
    { id: 8,  name: "Pune Region",      path: "West Zone › Maharashtra" },
    { id: 11, name: "Bangalore Region", path: "South Zone › Karnataka" },
    { id: 13, name: "Chennai Region",   path: "South Zone › Tamil Nadu" },
  ],
  Area: [
    { id: 15, name: "Mumbai Central Area",  path: "West Zone › Maharashtra › Mumbai Region" },
    { id: 16, name: "Mumbai North Area",    path: "West Zone › Maharashtra › Mumbai Region" },
    { id: 17, name: "Mumbai South Area",    path: "West Zone › Maharashtra › Mumbai Region" },
    { id: 18, name: "Pune Central Area",    path: "West Zone › Maharashtra › Pune Region" },
    { id: 19, name: "Bangalore East Area",  path: "South Zone › Karnataka › Bangalore Region" },
    { id: 21, name: "Chennai Central Area", path: "South Zone › Tamil Nadu › Chennai Region" },
  ],
  Territory: [
    { id: 23, name: "Dadar-Parel Territory",    path: "West Zone › Maharashtra › Mumbai Region › Mumbai Central Area" },
    { id: 24, name: "Matunga Territory",        path: "West Zone › Maharashtra › Mumbai Region › Mumbai Central Area" },
    { id: 25, name: "Borivali-Kandivali Terr.", path: "West Zone › Maharashtra › Mumbai Region › Mumbai North Area" },
    { id: 27, name: "Indiranagar Territory",    path: "South Zone › Karnataka › Bangalore Region › Bangalore East Area" },
  ],
  City: [
    { id: 31, name: "Dadar",         path: "West Zone › ... › Dadar-Parel Territory" },
    { id: 32, name: "Parel",         path: "West Zone › ... › Dadar-Parel Territory" },
    { id: 33, name: "Borivali East", path: "West Zone › ... › Borivali-Kandivali Terr." },
  ],
};

// ── Types ─────────────────────────────────────────────────────────────────────
interface GeoAssignment {
  id: number;
  geoId: number;
  geoName: string;
  geoLevel: string;
  path: string;
  isPrimary: boolean;
  validFrom: string;
  validTo: string;
  isDeactivated?: boolean;
}

interface Props {
  role: string;
  employeeName: string;
  isInactive: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

// ── Level pill ────────────────────────────────────────────────────────────────
const LEVEL_STYLES: Record<string, string> = {
  Zone:      "bg-blue-50 text-blue-700 border border-blue-200",
  Region:    "bg-purple-50 text-purple-700 border border-purple-200",
  Area:      "bg-amber-50 text-amber-700 border border-amber-200",
  Territory: "bg-orange-50 text-orange-700 border border-orange-200",
  City:      "bg-slate-100 text-slate-600 border border-slate-200",
};

function LevelPill({ level }: { level: string }) {
  return (
    <span className={cn(
      "inline-flex items-center text-[10px] font-medium px-1.5 py-px rounded-full",
      LEVEL_STYLES[level] ?? "bg-muted text-muted-foreground border border-muted",
    )}>
      {level}
    </span>
  );
}

function todayStr() { return new Date().toISOString().slice(0, 10); }

// ── Main Component ────────────────────────────────────────────────────────────
export default function GeographyAssignmentSection({ role, employeeName, isInactive, onToast }: Props) {
  const geoLevel = ROLE_GEO_MAP[role] ?? "__any__";

  const [assignments, setAssignments] = useState<GeoAssignment[]>([
    { id: 1, geoId: 15, geoName: "Mumbai Central Area", geoLevel: "Area", path: "West Zone › Maharashtra › Mumbai Region", isPrimary: true,  validFrom: "2024-04-01", validTo: "", isDeactivated: false },
    { id: 2, geoId: 18, geoName: "Pune Central Area",   geoLevel: "Area", path: "West Zone › Maharashtra › Pune Region",   isPrimary: false, validFrom: "2024-04-01", validTo: "", isDeactivated: false },
  ]);

  // Add form state
  const [showAddForm, setShowAddForm] = useState(false);
  const [addForm, setAddForm] = useState({
    geoId: 0,
    isPrimary: false,
    validFrom: todayStr(),
    validTo: "",
  });
  const [addSearch, setAddSearch] = useState("");

  // Edit dates state
  const [editId, setEditId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({ validFrom: "", validTo: "" });

  // Remove confirm
  const [removeTarget, setRemoveTarget] = useState<GeoAssignment | null>(null);

  // ── Geo options for add dropdown (filtered to role level, exclude already assigned) ──
  const assignedIds = assignments.map(a => a.geoId);
  const levelKey = (geoLevel === "__any__" || geoLevel === "__all__") ? "Area" : geoLevel;
  const geoOptions = (GEO_BY_LEVEL[levelKey] ?? []).filter(n =>
    n.name.toLowerCase().includes(addSearch.toLowerCase()),
  );

  // ── Handlers ─────────────────────────────────────────────────────────────────
  const setPrimary = (id: number) => {
    if (isInactive) return;
    setAssignments(prev => prev.map(a => ({ ...a, isPrimary: a.id === id })));
    onToast("Primary geography updated.");
  };

  const openEdit = (a: GeoAssignment) => {
    setEditId(a.id);
    setEditForm({ validFrom: a.validFrom, validTo: a.validTo });
  };

  const saveEdit = () => {
    setAssignments(prev => prev.map(a =>
      a.id === editId ? { ...a, ...editForm } : a,
    ));
    setEditId(null);
    onToast("Assignment dates updated.");
  };

  const confirmRemove = () => {
    if (!removeTarget) return;
    const activeCount = assignments.filter(a => !a.validTo).length;
    if (activeCount <= 1) {
      onToast("Employee must have at least one active geography assigned.", "error");
      setRemoveTarget(null);
      return;
    }
    setAssignments(prev => prev.filter(a => a.id !== removeTarget.id));
    setRemoveTarget(null);
    onToast("Geography assignment removed.");
  };

  const handleAddSave = () => {
    if (!addForm.geoId) {
      onToast("Please select a geography.", "error");
      return;
    }
    const node = (GEO_BY_LEVEL[levelKey] ?? []).find(n => n.id === addForm.geoId);
    if (!node) return;
    const newItem: GeoAssignment = {
      id: Date.now(),
      geoId: addForm.geoId,
      geoName: node.name,
      geoLevel: levelKey,
      path: node.path,
      isPrimary: addForm.isPrimary || assignments.filter(a => !a.validTo).length === 0,
      validFrom: addForm.validFrom,
      validTo: addForm.validTo,
    };
    // If new one is primary, unset old primary
    let updated = [...assignments];
    if (newItem.isPrimary) {
      updated = updated.map(a => ({ ...a, isPrimary: false }));
    }
    setAssignments([...updated, newItem]);
    setShowAddForm(false);
    setAddForm({ geoId: 0, isPrimary: false, validFrom: todayStr(), validTo: "" });
    setAddSearch("");
    onToast("Geography assignment saved.");
  };

  // ── Render ────────────────────────────────────────────────────────────────────
  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div className="pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <MapPin className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Geography Assignment</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Define which geography this employee owns</p>
          </div>
        </div>
      </div>

      {/* Role banner */}
      {geoLevel === "__none__" ? (
        <div className="flex items-start gap-2.5 bg-slate-50 border border-slate-200 rounded-lg px-3.5 py-3">
          <Info className="w-4 h-4 text-slate-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-slate-600">
            This role does not require geography assignment.
          </p>
        </div>
      ) : geoLevel === "__all__" ? (
        <div className="flex items-start gap-2.5 bg-blue-50 border border-blue-200 rounded-lg px-3.5 py-3">
          <Info className="w-4 h-4 text-blue-500 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-blue-700">
            <strong>{role}</strong> has visibility across all geographies by default. No assignment needed.
          </p>
        </div>
      ) : (
        <>
          <div className="flex items-start gap-2.5 bg-brand-50 border border-brand-200 rounded-lg px-3.5 py-3">
            <Info className="w-4 h-4 text-brand-600 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-brand-700">
              This employee is a <strong>{role}</strong>. Geography assignments are restricted to{" "}
              <strong>{geoLevel === "__any__" ? "any" : geoLevel}</strong> level only.
            </p>
          </div>

          {/* Inactive warning */}
          {isInactive && (
            <div className="flex items-start gap-2.5 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
              <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-700">
                This employee is inactive. Geography assignments cannot be modified.
              </p>
            </div>
          )}

          {/* Assignment table */}
          <div className="border border-border rounded-xl overflow-hidden">
            <table className="w-full">
              <thead>
                <tr className="bg-muted/40 border-b border-border">
                  <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Geography</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-24">Level</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground">Zone › State Path</th>
                  <th className="px-3 py-2.5 text-center text-xs font-semibold text-foreground w-20">Primary</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">Valid From</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">Valid To</th>
                  <th className="px-4 py-2 w-28" />
                </tr>
              </thead>
              <tbody>
                {assignments.map(a => {
                  const isPastEnd = a.validTo && a.validTo < todayStr();
                  const isWarningRow = a.isDeactivated;
                  const isEditing = editId === a.id;
                  return (
                    <React.Fragment key={a.id}>
                      <tr className={cn(
                        "border-b border-border/50 transition-colors",
                        isWarningRow ? "bg-amber-50/40" : isPastEnd ? "bg-muted/30 opacity-60" : "hover:bg-muted/20",
                      )}>
                        {/* Name */}
                        <td className="px-4 py-2">
                          <div className="flex items-center gap-2">
                            {isWarningRow && <AlertTriangle className="w-3.5 h-3.5 text-amber-500 flex-shrink-0" />}
                            <div>
                              <p className="text-xs font-semibold text-foreground">{a.geoName}</p>
                              {isWarningRow && (
                                <p className="text-[10px] text-amber-600 mt-0.5">This geography has been deactivated. Please reassign.</p>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Level */}
                        <td className="px-3 py-2.5"><LevelPill level={a.geoLevel} /></td>

                        {/* Path */}
                        <td className="px-3 py-2.5">
                          <p className="text-[11px] text-muted-foreground">{a.path || "—"}</p>
                        </td>

                        {/* Primary toggle */}
                        <td className="px-3 py-2.5 text-center">
                          <button
                            onClick={() => !isPastEnd && !isInactive && setPrimary(a.id)}
                            disabled={isPastEnd || isInactive}
                            className={cn(
                              "transition-colors",
                              isPastEnd || isInactive ? "cursor-not-allowed opacity-40" : "cursor-pointer hover:text-brand-600",
                              a.isPrimary ? "text-brand-600" : "text-muted-foreground",
                            )}
                            title={a.isPrimary ? "Primary geography" : "Set as primary"}
                          >
                            {a.isPrimary
                              ? <CircleDot className="w-4 h-4" />
                              : <Circle className="w-4 h-4" />
                            }
                          </button>
                        </td>

                        {/* Valid From / To */}
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-foreground">{a.validFrom}</span>
                        </td>
                        <td className="px-3 py-2.5">
                          <span className="text-xs text-foreground">{a.validTo || <span className="text-muted-foreground">—</span>}</span>
                        </td>

                        {/* Actions */}
                        <td className="px-4 py-2">
                          {!isInactive && (
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEdit(a)}
                                className="h-6 px-2 text-[11px] border border-border rounded hover:bg-muted transition-colors flex items-center gap-1 text-foreground"
                              >
                                <Edit2 className="w-2.5 h-2.5" /> Edit
                              </button>
                              <button
                                onClick={() => setRemoveTarget(a)}
                                className="h-6 px-2 text-[11px] border border-red-200 rounded hover:bg-red-50 transition-colors flex items-center gap-1 text-red-600"
                              >
                                <Trash2 className="w-2.5 h-2.5" /> Remove
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>

                      {/* Inline edit row */}
                      {isEditing && (
                        <tr className="bg-brand-50/30 border-b border-border/50">
                          <td colSpan={7} className="px-4 py-3">
                            <div className="flex items-end gap-3">
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium">Valid From</Label>
                                <input
                                  type="date"
                                  value={editForm.validFrom}
                                  onChange={e => setEditForm(f => ({ ...f, validFrom: e.target.value }))}
                                  className="h-8 px-2 text-xs border border-border rounded-lg focus:outline-none focus:border-brand-500"
                                />
                              </div>
                              <div className="space-y-1">
                                <Label className="text-[11px] font-medium">Valid To <span className="text-muted-foreground">(optional)</span></Label>
                                <input
                                  type="date"
                                  value={editForm.validTo}
                                  onChange={e => setEditForm(f => ({ ...f, validTo: e.target.value }))}
                                  className="h-8 px-2 text-xs border border-border rounded-lg focus:outline-none focus:border-brand-500"
                                />
                              </div>
                              <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={saveEdit}>
                                Save
                              </Button>
                              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setEditId(null)}>
                                Cancel
                              </Button>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>

            {/* Add form inline */}
            {showAddForm ? (
              <div className="px-4 py-4 border-t border-border bg-muted/20 space-y-3">
                <p className="text-xs font-semibold text-foreground">Add Geography Assignment</p>
                <div className="grid grid-cols-2 gap-3">
                  {/* Geography select */}
                  <div className="col-span-2 space-y-1.5">
                    <Label className="text-xs font-medium">Geography <span className="text-red-500">*</span></Label>
                    <div className="relative">
                      <input
                        type="text"
                        placeholder={`Search ${levelKey === "__any__" ? "geography" : levelKey}…`}
                        value={addSearch}
                        onChange={e => setAddSearch(e.target.value)}
                        className="w-full h-9 px-3 text-sm border border-border rounded-lg focus:outline-none focus:border-brand-500"
                      />
                    </div>
                    {/* Dropdown list */}
                    <div className="border border-border rounded-lg max-h-44 overflow-y-auto bg-white">
                      {geoOptions.length === 0 ? (
                        <p className="px-3 py-2 text-xs text-muted-foreground">No options found</p>
                      ) : (
                        geoOptions.map(n => {
                          const alreadyAssigned = assignedIds.includes(n.id);
                          return (
                            <button
                              key={n.id}
                              disabled={alreadyAssigned}
                              onClick={() => { setAddForm(f => ({ ...f, geoId: n.id })); setAddSearch(n.name); }}
                              className={cn(
                                "w-full flex items-center justify-between px-3 py-2 text-left transition-colors",
                                alreadyAssigned
                                  ? "text-muted-foreground cursor-not-allowed bg-muted/20"
                                  : addForm.geoId === n.id
                                    ? "bg-brand-50 text-brand-700"
                                    : "hover:bg-muted/60 text-foreground",
                              )}
                            >
                              <span className="text-xs">{n.name}</span>
                              <div className="flex items-center gap-2">
                                {n.path && <span className="text-[10px] text-muted-foreground">{n.path}</span>}
                                {alreadyAssigned && <span className="text-[10px] text-muted-foreground">(already assigned)</span>}
                                {addForm.geoId === n.id && <CheckCircle2 className="w-3.5 h-3.5 text-brand-600" />}
                              </div>
                            </button>
                          );
                        })
                      )}
                    </div>
                  </div>

                  {/* Primary checkbox */}
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="set-primary"
                      checked={addForm.isPrimary}
                      onChange={e => setAddForm(f => ({ ...f, isPrimary: e.target.checked }))}
                      className="w-4 h-4 accent-brand-600"
                    />
                    <Label htmlFor="set-primary" className="text-xs font-medium cursor-pointer">Set as Primary</Label>
                  </div>

                  {/* Valid From */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Valid From <span className="text-red-500">*</span></Label>
                    <input
                      type="date"
                      value={addForm.validFrom}
                      onChange={e => setAddForm(f => ({ ...f, validFrom: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-border rounded-lg focus:outline-none focus:border-brand-500"
                    />
                  </div>

                  {/* Valid To */}
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">Valid To <span className="text-muted-foreground text-[11px]">(optional)</span></Label>
                    <input
                      type="date"
                      value={addForm.validTo}
                      onChange={e => setAddForm(f => ({ ...f, validTo: e.target.value }))}
                      className="w-full h-8 px-2 text-xs border border-border rounded-lg focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={handleAddSave}>
                    Save Assignment
                  </Button>
                  <Button variant="outline" size="sm" className="h-8 text-xs"
                    onClick={() => { setShowAddForm(false); setAddSearch(""); setAddForm({ geoId: 0, isPrimary: false, validFrom: todayStr(), validTo: "" }); }}>
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              !isInactive && (
                <div className="px-4 py-3 border-t border-border">
                  <button
                    onClick={() => setShowAddForm(true)}
                    className="flex items-center gap-1.5 text-xs text-brand-600 hover:text-brand-700 font-medium transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" /> Add Geography
                  </button>
                </div>
              )
            )}
          </div>
        </>
      )}

      {/* Remove confirm dialog */}
      <Dialog open={!!removeTarget} onOpenChange={() => setRemoveTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-red-50 border border-red-200">
                <AlertTriangle className="w-4 h-4 text-red-500" />
              </div>
              Remove Assignment?
            </DialogTitle>
            <DialogDescription className="pt-1">
              Remove <strong>{removeTarget?.geoName}</strong> from {employeeName}&apos;s geography assignments?
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setRemoveTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-8 text-xs bg-red-600 hover:bg-red-700 text-white" onClick={confirmRemove}>
              Remove
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
