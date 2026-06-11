"use client";

import React from "react";
import { cn } from "@/lib/utils";
import {
  Sheet, SheetContent, SheetHeader, SheetBody, SheetFooter,
  SheetTitle, SheetDescription,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import {
  Shield, Calendar, Clock, FileText, Activity, Edit2, Globe, CheckSquare,
} from "lucide-react";
import { type Role } from "../roles-data";

interface RoleDetailSheetProps {
  open: boolean;
  onClose: () => void;
  role?: Role | null;
  onEdit: (role: Role) => void;
}

function StatusPill({ status }: { status: string }) {
  const cfg: Record<string, { bg: string; text: string; dot: string }> = {
    active:   { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500" },
    inactive: { bg: "bg-slate-100",  text: "text-slate-600",   dot: "bg-slate-400"   },
    archived: { bg: "bg-red-50",     text: "text-red-700",     dot: "bg-red-400"     },
  };
  const c = cfg[status] ?? cfg.inactive;
  return (
    <span className={cn("inline-flex items-center gap-1.5 text-xs px-2.5 py-1 rounded-full font-medium", c.bg, c.text)}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", c.dot)} />
      {status.charAt(0).toUpperCase() + status.slice(1)}
    </span>
  );
}

function InfoRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground flex-shrink-0 w-28">{label}</span>
      <span className="text-xs font-medium text-foreground text-right">{value || "—"}</span>
    </div>
  );
}

function SectionHeading({ icon: Icon, label }: { icon: React.ElementType; label: string }) {
  return (
    <div className="flex items-center gap-2 mb-3">
      <Icon className="w-3.5 h-3.5 text-muted-foreground flex-shrink-0" />
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
    </div>
  );
}

export default function RoleDetailSheet({ open, onClose, role, onEdit }: RoleDetailSheetProps) {
  if (!role) return null;

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent>
        <SheetHeader>
          <div className="flex items-start gap-3 pr-8">
            <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
              <Shield className="w-5 h-5 text-brand-600" />
            </div>
            <div className="flex-1 min-w-0">
              <SheetTitle className="truncate">{role.roleName}</SheetTitle>
              <SheetDescription>{role.department}</SheetDescription>
            </div>
            <StatusPill status={role.status} />
          </div>
        </SheetHeader>

        <SheetBody className="space-y-6">

          {/* Role Information */}
          <div>
            <SectionHeading icon={FileText} label="Role Information" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Role Name"    value={role.roleName} />
              <InfoRow label="Department"   value={role.department} />
              <InfoRow label="Status"       value={role.status.charAt(0).toUpperCase() + role.status.slice(1)} />
              {role.description && <InfoRow label="Description" value={role.description} />}
            </div>
          </div>

          {/* Geography */}
          <div>
            <SectionHeading icon={Globe} label="Geography" />
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Geo Level"   value={role.geoLevel === "None" ? "None — office role" : role.geoLevel} />
            </div>
          </div>

          {/* Audit */}
          <div>
            <SectionHeading icon={Activity} label="Audit Trail" />
            <div className="space-y-2.5">
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-blue-50 border border-blue-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Calendar className="w-3.5 h-3.5 text-blue-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Created</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    By <span className="font-medium text-foreground">{role.createdBy}</span> on{" "}
                    <span className="font-medium text-foreground">{role.createdDate}</span>
                  </p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <div className="w-7 h-7 rounded-lg bg-amber-50 border border-amber-100 flex items-center justify-center flex-shrink-0 mt-0.5">
                  <Clock className="w-3.5 h-3.5 text-amber-500" />
                </div>
                <div className="flex-1">
                  <p className="text-xs font-medium text-foreground">Last Updated</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">
                    By <span className="font-medium text-foreground">{role.updatedBy}</span> on{" "}
                    <span className="font-medium text-foreground">{role.updatedDate}</span>
                  </p>
                </div>
              </div>
            </div>
          </div>

        </SheetBody>

        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Close</Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
            onClick={() => { onClose(); onEdit(role); }}>
            <Edit2 className="w-3.5 h-3.5" /> Edit
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
