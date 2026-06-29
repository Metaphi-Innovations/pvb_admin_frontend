"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle, Eye, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
import {
  type SalesRole,
  SALES_ROLES,
  ROLE_LEVEL_HINT,
  assignUser,
  endUserAssignment,
  getAssignableManagersForRole,
  getAssignableUserById,
  getAssignableUsersForRole,
  getGeographyOptionsForRole,
  getGeographyPathLabel,
  loadUserAssignments,
  validateUserAssignment,
  isUserAssignmentBlocking,
  type GeographyAssignableUser,
  type GeographyUserAssignment,
} from "../geography-workflow-data";
import { getGeographyById, todayStr } from "../geography-master-data";

function UserOptionLabel({ user }: { user: GeographyAssignableUser }) {
  return (
    <div className="flex flex-col py-0.5 leading-tight">
      <span className="font-medium text-foreground">{user.fullName}</span>
      <span className="text-[10px] font-mono text-muted-foreground">{user.employeeId}</span>
      <span className="text-[10px] text-muted-foreground">{user.role} | {user.department}</span>
    </div>
  );
}

export function UserAssignmentTab({
  initialGeographyId,
}: {
  initialGeographyId?: number | null;
}) {
  const [tick, setTick] = useState(0);
  const [formOpen, setFormOpen] = useState(false);
  const [viewRecord, setViewRecord] = useState<GeographyUserAssignment | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [allowShared, setAllowShared] = useState(false);

  const [geographyId, setGeographyId] = useState(initialGeographyId ?? 0);
  const [role, setRole] = useState<SalesRole>("NSM");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [parentManagerId, setParentManagerId] = useState("");
  const [effectiveFrom, setEffectiveFrom] = useState(todayStr());
  const [effectiveTo, setEffectiveTo] = useState("");

  useEffect(() => { if (initialGeographyId) setGeographyId(initialGeographyId); }, [initialGeographyId]);

  const geoOptions = useMemo(() => getGeographyOptionsForRole(role), [role, tick]);
  const usersForRole = useMemo(() => getAssignableUsersForRole(role), [role, tick]);
  const managersForRole = useMemo(() => getAssignableManagersForRole(role), [role, tick]);
  const assignments = useMemo(() => loadUserAssignments(), [tick]);
  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    if (geoOptions.length > 0 && !geoOptions.some((g) => g.id === geographyId)) {
      setGeographyId(geoOptions[0].id);
    }
  }, [role, geoOptions, geographyId]);

  useEffect(() => {
    if (selectedUserId && !usersForRole.some((u) => String(u.id) === selectedUserId)) {
      setSelectedUserId("");
    }
  }, [role, usersForRole, selectedUserId]);

  const selectedUser = selectedUserId ? getAssignableUserById(Number(selectedUserId)) : undefined;
  const parentManager = parentManagerId ? getAssignableUserById(Number(parentManagerId))?.fullName ?? "—" : "—";

  const handleRoleChange = (nextRole: SalesRole) => {
    setRole(nextRole);
    setSelectedUserId("");
    setParentManagerId("");
    setWarnings([]);
  };

  const openForm = () => {
    setSelectedUserId("");
    setParentManagerId("");
    setWarnings([]);
    setAllowShared(false);
    setEffectiveFrom(todayStr());
    setEffectiveTo("");
    setFormOpen(true);
    refresh();
  };

  const handleAssign = () => {
    const userName = selectedUser?.fullName ?? "";
    const w = validateUserAssignment({
      geographyId,
      role,
      userName,
      userRole: selectedUser?.role,
      effectiveFrom,
      allowSharedOwnership: allowShared,
    });
    setWarnings(w);
    if (isUserAssignmentBlocking(w)) return;
    assignUser({
      geographyId,
      role,
      userName,
      parentManager,
      effectiveFrom,
      effectiveTo: effectiveTo || null,
      status: "active",
      allowSharedOwnership: allowShared,
    });
    setSelectedUserId("");
    setParentManagerId("");
    setEffectiveTo("");
    setFormOpen(false);
    setWarnings([]);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
        <div>
          <h2 className="text-base font-semibold">User Assignment</h2>
          <p className="text-xs text-muted-foreground mt-0.5">
            NSM → Zone · ZSM/RSM → Region · ASM → Area · TM/DO/Intern → Territory. Users are loaded from User Management (active employees only).
          </p>
        </div>
        <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white gap-1.5" onClick={openForm}>
          <Plus className="w-3.5 h-3.5" /> Assign User
        </Button>
      </div>

      <div className="rounded-xl border border-border bg-white overflow-x-auto">
        <table className="w-full text-xs min-w-[900px]">
          <thead>
            <tr className="bg-muted/40 border-b border-border">
              {["User Name", "Role", "Assigned Geography", "Geography Type", "Parent Manager", "Effective From", "Effective To", "Status", "Actions"].map((h) => (
                <th key={h} className="text-left px-3 py-2.5 font-semibold">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {assignments.length === 0 ? (
              <tr><td colSpan={9} className="px-3 py-8 text-center text-muted-foreground">No users assigned yet.</td></tr>
            ) : assignments.map((a) => {
              const geo = getGeographyById(a.geographyId);
              return (
                <tr key={a.id} className="border-b border-border/60">
                  <td className="px-3 py-2.5 font-medium">{a.userName}</td>
                  <td className="px-3 py-2.5 font-semibold">{a.role}</td>
                  <td className="px-3 py-2.5">{getGeographyPathLabel(a.geographyId)}</td>
                  <td className="px-3 py-2.5 text-muted-foreground">{geo?.geographyType ?? "—"}</td>
                  <td className="px-3 py-2.5">{a.parentManager}</td>
                  <td className="px-3 py-2.5 font-mono">{a.effectiveFrom}</td>
                  <td className="px-3 py-2.5 font-mono">{a.effectiveTo ?? "—"}</td>
                  <td className="px-3 py-2.5"><StatusBadge status={a.status} /></td>
                  <td className="px-3 py-2.5">
                    <div className="flex gap-1">
                      <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px]" onClick={() => setViewRecord(a)}><Eye className="w-3 h-3" /></Button>
                      {a.status === "active" && (
                        <Button variant="ghost" size="sm" className="h-7 px-2 text-[11px] text-red-600" onClick={() => { endUserAssignment(a.id, todayStr()); refresh(); }}>
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      <Dialog open={formOpen} onOpenChange={setFormOpen}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle className="text-base">Assign User to Geography</DialogTitle>
            <DialogDescription>
              Choose a role first — the user list shows only active employees with that role from User Management.
            </DialogDescription>
          </DialogHeader>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label className="text-xs">Role *</Label>
              <Select value={role} onValueChange={(v) => handleRoleChange(v as SalesRole)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue /></SelectTrigger>
                <SelectContent>{SALES_ROLES.map((r) => <SelectItem key={r} value={r} className="text-xs">{r}</SelectItem>)}</SelectContent>
              </Select>
              <p className="text-[10px] text-muted-foreground">{ROLE_LEVEL_HINT[role]}</p>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Assigned Geography *</Label>
              <Select value={geoOptions.length ? String(geographyId) : ""} onValueChange={(v) => setGeographyId(Number(v))}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select geography" /></SelectTrigger>
                <SelectContent>
                  {geoOptions.length === 0 ? (
                    <SelectItem value="__none__" disabled className="text-xs">No {ROLE_LEVEL_HINT[role].replace("Assign to ", "")} available</SelectItem>
                  ) : (
                    geoOptions.map((o) => <SelectItem key={o.id} value={String(o.id)} className="text-xs">{o.label}</SelectItem>)
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">User * (from User Management)</Label>
              <Select
                value={selectedUserId || "__none__"}
                onValueChange={(v) => setSelectedUserId(v === "__none__" ? "" : v)}
              >
                <SelectTrigger className="h-auto min-h-9 text-sm py-1.5">
                  <SelectValue placeholder="Select user">
                    {selectedUser ? (
                      <UserOptionLabel user={selectedUser} />
                    ) : (
                      "Select user"
                    )}
                  </SelectValue>
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">Select user…</SelectItem>
                  {usersForRole.length === 0 ? (
                    <SelectItem value="__empty__" disabled className="text-xs">
                      No active {role} users in User Management
                    </SelectItem>
                  ) : (
                    usersForRole.map((u) => (
                      <SelectItem key={u.id} value={String(u.id)} className="text-xs py-2">
                        <UserOptionLabel user={u} />
                      </SelectItem>
                    ))
                  )}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2">
              <Label className="text-xs">Parent Manager</Label>
              <Select value={parentManagerId || "__none__"} onValueChange={(v) => setParentManagerId(v === "__none__" ? "" : v)}>
                <SelectTrigger className="h-9 text-sm"><SelectValue placeholder="Select manager" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="__none__" className="text-xs">None</SelectItem>
                  {managersForRole.map((u) => (
                    <SelectItem key={u.id} value={String(u.id)} className="text-xs py-2">
                      <UserOptionLabel user={u} />
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective From *</Label>
              <Input type="date" className="h-9 text-sm" value={effectiveFrom} onChange={(e) => setEffectiveFrom(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Effective To</Label>
              <Input type="date" className="h-9 text-sm" value={effectiveTo} onChange={(e) => setEffectiveTo(e.target.value)} />
            </div>
            <label className="sm:col-span-2 flex items-center gap-2 text-xs">
              <input type="checkbox" checked={allowShared} onChange={(e) => setAllowShared(e.target.checked)} />
              Allow shared ownership (same role on same geography)
            </label>
          </div>
          {warnings.length > 0 && (
            <div className="rounded-lg border border-amber-200 bg-amber-50 p-3 space-y-1">
              {warnings.map((w) => (
                <p key={w} className="text-xs text-amber-900 flex items-start gap-1.5"><AlertTriangle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />{w}</p>
              ))}
            </div>
          )}
          <div className="flex justify-end gap-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setFormOpen(false)}>Cancel</Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleAssign}
              disabled={!selectedUserId || geoOptions.length === 0}
            >
              Assign User
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={!!viewRecord} onOpenChange={() => setViewRecord(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader><DialogTitle className="text-base">Assignment Details</DialogTitle></DialogHeader>
          {viewRecord && (
            <div className="space-y-2 text-xs">
              <p><span className="text-muted-foreground">User:</span> {viewRecord.userName}</p>
              <p><span className="text-muted-foreground">Role:</span> {viewRecord.role}</p>
              <p><span className="text-muted-foreground">Geography:</span> {getGeographyPathLabel(viewRecord.geographyId)}</p>
              <p><span className="text-muted-foreground">Parent Manager:</span> {viewRecord.parentManager}</p>
              <p><span className="text-muted-foreground">Effective:</span> {viewRecord.effectiveFrom} → {viewRecord.effectiveTo ?? "Open"}</p>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
