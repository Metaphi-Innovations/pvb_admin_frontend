"use client";

import React, { useState } from "react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus, X, Users, Search, Check, AlertTriangle, ChevronRight,
} from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import EscalationPathDisplay, { type EscalationNode } from "./EscalationPathDisplay";

// ── Role hierarchy for solid-line filter ─────────────────────────────────────
const REPORTS_TO_ROLE: Record<string, string> = {
  TM:     "ASM",
  ASM:    "RSM",
  RSM:    "ZSM",
  ZSM:    "NSM",
  DO:     "TM",
  Intern: "TM",
  FMO:    "ASM",
  // Fallback
  Manager: "RSM",
};

// ── Mock employee directory ───────────────────────────────────────────────────
interface Employee {
  id: number;
  name: string;
  role: string;
  initials: string;
  geo: string;
  status: "active" | "on-leave" | "inactive";
}

const EMPLOYEE_DIR: Employee[] = [
  { id: 10, name: "Priya Sharma",  role: "RSM", initials: "PS", geo: "Mumbai Region",       status: "active" },
  { id: 11, name: "Nikhil Joshi",  role: "ZSM", initials: "NJ", geo: "West Zone",           status: "active" },
  { id: 12, name: "Anil Verma",    role: "NSM", initials: "AV", geo: "All India",            status: "active" },
  { id: 13, name: "Suresh Patil",  role: "TM",  initials: "SP", geo: "Dadar-Parel Terr.",   status: "active" },
  { id: 14, name: "Meera Nair",    role: "RSM", initials: "MN", geo: "Pune Region",          status: "on-leave" },
  { id: 15, name: "Vikram Singh",  role: "ASM", initials: "VS", geo: "Mumbai North Area",    status: "active" },
  { id: 16, name: "Kavita Jain",   role: "ZSM", initials: "KJ", geo: "South Zone",           status: "active" },
  { id: 17, name: "Deepak Rao",    role: "RSM", initials: "DR", geo: "Bangalore Region",     status: "active" },
];

// ── Types ─────────────────────────────────────────────────────────────────────
interface Props {
  role: string;
  employeeId: number;
  employeeName: string;
  employeeInitials: string;
  isInactive: boolean;
  onToast: (msg: string, type?: "success" | "error") => void;
}

// ── Manager Avatar card ───────────────────────────────────────────────────────
function ManagerCard({
  employee,
  onRemove,
  showRemove,
}: {
  employee: Employee;
  onRemove?: () => void;
  showRemove?: boolean;
}) {
  return (
    <div className="flex items-center gap-3 p-3 rounded-lg border border-border bg-muted/20">
      <div className="w-9 h-9 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 bg-brand-100 text-brand-700">
        {employee.initials}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 flex-wrap">
          <p className="text-xs font-semibold text-foreground">{employee.name}</p>
          <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-slate-100 text-slate-600">
            {employee.role}
          </span>
          {employee.status === "on-leave" && (
            <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-orange-100 text-orange-700 flex items-center gap-0.5">
              <AlertTriangle className="w-2.5 h-2.5" />On Leave
            </span>
          )}
        </div>
        <p className="text-[11px] text-muted-foreground mt-0.5">{employee.geo}</p>
      </div>
      {showRemove && onRemove && (
        <button
          onClick={onRemove}
          className="w-6 h-6 rounded-md flex items-center justify-center hover:bg-red-50 text-muted-foreground hover:text-red-600 transition-colors flex-shrink-0"
          title="Remove"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      )}
    </div>
  );
}

// ── Manager Search Popover ────────────────────────────────────────────────────
function ManagerSearchPopover({
  label,
  filterRole,
  excludeIds,
  onSelect,
  trigger,
}: {
  label: string;
  filterRole?: string | null;
  excludeIds: number[];
  onSelect: (emp: Employee) => void;
  trigger: React.ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const options = EMPLOYEE_DIR.filter(e => {
    if (excludeIds.includes(e.id)) return false;
    if (filterRole && e.role !== filterRole) return false;
    if (!search.trim()) return true;
    return e.name.toLowerCase().includes(search.toLowerCase());
  });

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>{trigger}</PopoverTrigger>
      <PopoverContent align="start" className="w-80 p-0">
        <div className="px-3 py-2.5 border-b border-border">
          <p className="text-xs font-semibold text-foreground mb-2">{label}</p>
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground pointer-events-none" />
            <Input
              placeholder="Search by name…"
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="pl-8 h-8 text-xs rounded-lg"
            />
          </div>
          {filterRole && (
            <p className="text-[11px] text-muted-foreground mt-1.5">
              Showing <strong>{filterRole}</strong> employees only
            </p>
          )}
        </div>
        <div className="max-h-[260px] overflow-y-auto">
          {options.length === 0 ? (
            <p className="px-3 py-4 text-xs text-muted-foreground text-center">No employees found</p>
          ) : (
            options.map(emp => (
              <button
                key={emp.id}
                onClick={() => { onSelect(emp); setOpen(false); setSearch(""); }}
                className="w-full flex items-center gap-2.5 px-3 py-2.5 text-left hover:bg-muted/60 transition-colors"
              >
                <div className="w-7 h-7 rounded-full bg-brand-100 text-brand-700 flex items-center justify-center text-xs font-bold flex-shrink-0">
                  {emp.initials}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <span className="text-xs font-semibold text-foreground">{emp.name}</span>
                    <span className="text-[10px] font-medium px-1.5 py-px rounded-full bg-slate-100 text-slate-600">{emp.role}</span>
                    {emp.status === "on-leave" && (
                      <span className="text-[10px] text-orange-600">(On Leave)</span>
                    )}
                  </div>
                  <p className="text-[11px] text-muted-foreground">{emp.geo}</p>
                </div>
              </button>
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ReportingAssignmentSection({ role, employeeId, employeeName, employeeInitials, isInactive, onToast }: Props) {
  // Solid line manager
  const [solidManager, setSolidManager] = useState<Employee | null>(
    EMPLOYEE_DIR.find(e => e.id === 10) ?? null, // Priya Sharma (RSM)
  );

  // Dotted line managers
  const [dottedManagers, setDottedManagers] = useState<Employee[]>([]);

  // Build escalation chain from solid line
  const buildChain = (): EscalationNode[] => {
    const chain: EscalationNode[] = [
      { id: employeeId, name: employeeName, role, initials: employeeInitials, status: "active", isCurrentEmployee: true },
    ];
    let current = solidManager;
    let seen = new Set([employeeId]);
    while (current && !seen.has(current.id)) {
      seen.add(current.id);
      chain.push({
        id: current.id,
        name: current.name,
        role: current.role,
        initials: current.initials,
        status: current.status,
      });
      // Find the next manager in chain (who the current manager reports to)
      const nextRole = REPORTS_TO_ROLE[current.role];
      current = nextRole ? EMPLOYEE_DIR.find(e => e.role === nextRole && e.status !== "inactive") ?? null : null;
    }
    return chain;
  };

  const solidLineRole = REPORTS_TO_ROLE[role] ?? null;

  const handleSolidChange = (emp: Employee) => {
    setSolidManager(emp);
    onToast("Reporting manager updated.");
  };

  const addDotted = (emp: Employee) => {
    if (dottedManagers.some(d => d.id === emp.id)) {
      onToast("This person is already assigned as a reporting manager.", "error");
      return;
    }
    if (solidManager?.id === emp.id) {
      onToast("This person is already assigned as a reporting manager.", "error");
      return;
    }
    setDottedManagers(prev => [...prev, emp]);
    onToast("Dotted line manager added.");
  };

  const removeDotted = (id: number) => {
    setDottedManagers(prev => prev.filter(d => d.id !== id));
    onToast("Dotted line manager removed.");
  };

  const excludeFromSearch = [
    employeeId,
    solidManager?.id,
    ...dottedManagers.map(d => d.id),
  ].filter(Boolean) as number[];

  const chain = buildChain();

  return (
    <div className="space-y-4">
      {/* Section heading */}
      <div className="pb-3 border-b border-border">
        <div className="flex items-center gap-2">
          <Users className="w-4 h-4 text-muted-foreground flex-shrink-0" />
          <div>
            <p className="text-xs font-bold uppercase tracking-widest text-muted-foreground">Reporting Assignment</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Define who this employee reports to</p>
          </div>
        </div>
      </div>

      {isInactive && (
        <div className="flex items-start gap-2 bg-amber-50 border border-amber-200 rounded-lg px-3.5 py-3">
          <AlertTriangle className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" />
          <p className="text-xs text-amber-700">This employee is inactive. Reporting assignments cannot be modified.</p>
        </div>
      )}

      {/* Two-column: solid + dotted */}
      <div className="grid grid-cols-2 gap-4">

        {/* ── LEFT: Solid Line ── */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Reports To (Solid Line)</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Primary reporting manager. Approvals and performance reviews go here.
            </p>
          </div>

          {solidManager ? (
            <div className="space-y-2">
              <ManagerCard employee={solidManager} />
              {!isInactive && (
                <ManagerSearchPopover
                  label="Change Reporting Manager"
                  filterRole={solidLineRole}
                  excludeIds={[employeeId, ...dottedManagers.map(d => d.id)]}
                  onSelect={handleSolidChange}
                  trigger={
                    <Button variant="outline" size="sm" className="h-7 text-xs w-full">
                      Change Manager
                    </Button>
                  }
                />
              )}
            </div>
          ) : (
            <div className="space-y-2">
              <div className="p-3.5 rounded-lg border border-dashed border-border bg-muted/10 text-center">
                <p className="text-[11px] text-muted-foreground">No reporting manager assigned yet.</p>
              </div>
              {!isInactive && (
                <ManagerSearchPopover
                  label="Assign Reporting Manager"
                  filterRole={solidLineRole}
                  excludeIds={[employeeId, ...dottedManagers.map(d => d.id)]}
                  onSelect={handleSolidChange}
                  trigger={
                    <Button size="sm" className="h-7 text-xs w-full bg-brand-600 hover:bg-brand-700 text-white gap-1.5">
                      <Plus className="w-3.5 h-3.5" /> Assign Manager
                    </Button>
                  }
                />
              )}
            </div>
          )}
        </div>

        {/* ── RIGHT: Dotted Line ── */}
        <div className="space-y-3">
          <div>
            <p className="text-xs font-semibold text-foreground">Dotted Line Reporting</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Secondary reporting for cross-functional coordination. Used for KAM and special assignments.
            </p>
          </div>

          {dottedManagers.length === 0 ? (
            <div className="p-3.5 rounded-lg border border-dashed border-border bg-muted/10 text-center">
              <p className="text-[11px] text-muted-foreground">No dotted line reporting assigned.</p>
            </div>
          ) : (
            <div className="space-y-2">
              {dottedManagers.map(dm => (
                <ManagerCard
                  key={dm.id}
                  employee={dm}
                  showRemove={!isInactive}
                  onRemove={() => removeDotted(dm.id)}
                />
              ))}
            </div>
          )}

          {!isInactive && (
            <ManagerSearchPopover
              label="Add Dotted Line Manager"
              filterRole={null} // No role filter for dotted line
              excludeIds={excludeFromSearch}
              onSelect={addDotted}
              trigger={
                <Button variant="outline" size="sm" className="h-7 text-xs gap-1.5 w-full">
                  <Plus className="w-3.5 h-3.5" /> Add Dotted Line
                </Button>
              }
            />
          )}
        </div>
      </div>

      {/* ── Escalation Path ── */}
      <div className="border border-border rounded-xl overflow-hidden">
        <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
          <ChevronRight className="w-4 h-4 text-muted-foreground" />
          <div>
            <p className="text-xs font-semibold text-foreground">Escalation Path</p>
            <p className="text-[11px] text-muted-foreground mt-0.5">Auto-generated from reporting assignments. Read-only.</p>
          </div>
        </div>
        <div className="px-4 py-4">
          <EscalationPathDisplay chain={chain} />
        </div>
      </div>
    </div>
  );
}
