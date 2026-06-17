import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Check } from "lucide-react";

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
  onSave: () => void;
  dept?: Department | null;
  employees: string[];
  departments: Department[];
}

export default function DepartmentForm({ open, onClose, onSave, dept, employees, departments }: Props) {
  const [formData, setFormData] = useState({
    code: "",
    name: "",
    parent: "",
    head: "",
    description: "",
    status: "active",
    remarks: "",
  });

  useEffect(() => {
    if (dept) {
      setFormData({
        code: dept.code,
        name: dept.name,
        parent: dept.parent?.toString() || "",
        head: dept.head || "",
        description: "",
        status: dept.status,
        remarks: "",
      });
    } else {
      setFormData({
        code: `DEPT-${String(Math.floor(Math.random() * 999)).padStart(3, "0")}`,
        name: "",
        parent: "",
        head: "",
        description: "",
        status: "active",
        remarks: "",
      });
    }
  }, [dept, open]);

  const handleChange = (field: string, value: string) => {
    setFormData(p => ({ ...p, [field]: value }));
  };

  const handleSave = () => {
    // Validation would go here
    onSave();
  };

  const parentDepts = departments.filter(d => !d.parent);

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-base font-semibold">
            {dept ? "Edit Department" : "Create New Department"}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-5 py-4">
          {/* Name & Code Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Department Name *
              </label>
              <Input
                value={formData.name}
                onChange={(e) => handleChange("name", e.target.value)}
                placeholder="e.g., Sales, HR, Accounts"
                className="h-8 text-xs"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Department Code *
              </label>
              <Input
                value={formData.code}
                onChange={(e) => handleChange("code", e.target.value)}
                placeholder="DEPT-001"
                className="h-8 text-xs"
              />
            </div>
          </div>

          {/* Parent & Head Row */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Parent Department
              </label>
              <select
                value={formData.parent}
                onChange={(e) => handleChange("parent", e.target.value)}
                className="w-full px-2.5 h-8 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
              >
                <option value="">No Parent</option>
                {parentDepts.map(d => (
                  <option key={d.id} value={d.id}>{d.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Department Head
              </label>
              <select
                value={formData.head}
                onChange={(e) => handleChange("head", e.target.value)}
                className="w-full px-2.5 h-8 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
              >
                <option value="">Select Employee</option>
                {employees.map(emp => (
                  <option key={emp} value={emp}>{emp}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Description
            </label>
            <Textarea
              value={formData.description}
              onChange={(e) => handleChange("description", e.target.value)}
              placeholder="Brief description of the department..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          {/* Status & Remarks */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-foreground mb-1.5">
                Status
              </label>
              <select
                value={formData.status}
                onChange={(e) => handleChange("status", e.target.value)}
                className="w-full px-2.5 h-8 text-xs border border-border rounded-lg focus:outline-none focus:ring-1 focus:ring-brand-400 bg-white"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="archived">Archived</option>
              </select>
            </div>
            <div />
          </div>

          {/* Remarks */}
          <div>
            <label className="block text-xs font-medium text-foreground mb-1.5">
              Remarks
            </label>
            <Textarea
              value={formData.remarks}
              onChange={(e) => handleChange("remarks", e.target.value)}
              placeholder="Any additional notes..."
              className="text-xs resize-none"
              rows={2}
            />
          </div>

          {/* System Fields (Read-only) */}
          {dept && (
            <div className="bg-muted/30 rounded-lg p-3 text-[11px] space-y-1">
              <div className="flex justify-between"><span className="text-muted-foreground">Created By:</span><span className="font-medium text-foreground">{dept.createdBy}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Created Date:</span><span className="font-medium text-foreground">{dept.createdDate}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated By:</span><span className="font-medium text-foreground">{dept.updatedBy}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Updated Date:</span><span className="font-medium text-foreground">{dept.updatedDate}</span></div>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2 pt-4 border-t border-border">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button size="sm" className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white" onClick={handleSave}>
            <Check className="w-3 h-3" /> {dept ? "Update" : "Create"} Department
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
