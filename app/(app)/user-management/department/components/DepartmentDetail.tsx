import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Edit2, X, Check, Users } from "lucide-react";

interface Department {
  id: number;
  code: string;
  name: string;
  parent: number | null;
  head: string | null;
  users: number;
  status: string;
  createdBy: string;
  createdDate: string;
  updatedBy: string;
  updatedDate: string;
}

interface Props {
  open: boolean;
  onClose: () => void;
  dept?: Department | null;
  departments: Department[];
}

export default function DepartmentDetail({ open, onClose, dept, departments }: Props) {
  if (!dept) return null;

  const parentDept = dept.parent ? departments.find(d => d.id === dept.parent) : null;
  const statusConfig = {
    active: { bg: "bg-green-50", color: "text-green-700", border: "border-green-200", label: "Active" },
    inactive: { bg: "bg-slate-50", color: "text-slate-700", border: "border-slate-200", label: "Inactive" },
    archived: { bg: "bg-rose-50", color: "text-rose-700", border: "border-rose-200", label: "Archived" },
  };
  const status = statusConfig[dept.status as keyof typeof statusConfig] || statusConfig.active;

  const childDepts = departments.filter(d => d.parent === dept.id);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader className="flex items-start justify-between">
          <div>
            <DialogTitle className="text-base font-semibold">{dept.name}</DialogTitle>
            <p className="text-xs text-muted-foreground mt-0.5">{dept.code}</p>
          </div>
          <Badge variant="outline" className={`${status.bg} ${status.color} ${status.border}`}>
            {status.label}
          </Badge>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Overview Grid */}
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Department Code</p>
              <p className="text-sm font-semibold text-foreground">{dept.code}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Total Users</p>
              <p className="text-sm font-semibold text-foreground flex items-center gap-1">
                <Users className="w-4 h-4 text-brand-600" /> {dept.users}
              </p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Department Head</p>
              <p className="text-sm font-semibold text-foreground">{dept.head || "—"}</p>
            </div>
            <div className="bg-muted/30 rounded-lg p-3">
              <p className="text-[10px] text-muted-foreground uppercase tracking-widest font-semibold mb-1">Parent Department</p>
              <p className="text-sm font-semibold text-foreground">{parentDept?.name || "—"}</p>
            </div>
          </div>

          {/* Related Sections */}
          {childDepts.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-foreground mb-2">Sub Departments ({childDepts.length})</h4>
              <div className="space-y-1">
                {childDepts.map(cd => (
                  <div key={cd.id} className="flex items-center justify-between p-2 bg-muted/20 rounded-lg text-xs">
                    <span className="font-medium text-foreground">{cd.name}</span>
                    <Badge variant="outline" className="text-[10px]">{cd.code}</Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Audit Trail */}
          <div className="bg-slate-50 rounded-lg p-3 space-y-1 text-[11px]">
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Created By</span>
              <span className="font-semibold text-foreground">{dept.createdBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Created Date</span>
              <span className="font-semibold text-foreground">{dept.createdDate}</span>
            </div>
            <div className="flex justify-between border-t border-slate-200 pt-1.5 mt-1.5">
              <span className="text-slate-600 font-medium">Updated By</span>
              <span className="font-semibold text-foreground">{dept.updatedBy}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-slate-600 font-medium">Updated Date</span>
              <span className="font-semibold text-foreground">{dept.updatedDate}</span>
            </div>
          </div>

          {/* Placeholder sections (commented for expansion) */}
          <div className="text-xs space-y-2 text-muted-foreground bg-blue-50 border border-blue-100 rounded-lg p-3">
            <p className="font-medium text-blue-700">ℹ Expandable Sections</p>
            <p>• Users in this Department</p>
            <p>• Linked Designations</p>
            <p>• Linked Roles & Permissions</p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Edit2 className="w-3 h-3" /> Edit
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            {dept.status === "active" ? (
              <><X className="w-3 h-3" /> Deactivate</>
            ) : (
              <><Check className="w-3 h-3" /> Activate</>
            )}
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs gap-1.5 text-red-600 border-red-200 hover:bg-red-50">
            Delete
          </Button>
          <Button variant="outline" size="sm" className="h-8 text-xs ml-auto" onClick={onClose}>
            Close
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
