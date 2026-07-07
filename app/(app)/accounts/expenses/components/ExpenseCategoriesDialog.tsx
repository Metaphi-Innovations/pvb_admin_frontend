"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Plus, Pencil, Eye } from "lucide-react";
import { ACCOUNTS_CURRENT_USER } from "@/lib/accounts/config";
import {
  loadExpenseCategories,
  nextCategoryId,
  saveExpenseCategories,
  type ExpenseCategory,
} from "../expense-category-data";
import { StatusBadge } from "@/components/ui/StatusBadge";

export function ExpenseCategoriesDialog({
  open,
  onClose,
  onUpdated,
}: {
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
}) {
  const [categories, setCategories] = useState<ExpenseCategory[]>([]);
  const [mode, setMode] = useState<"list" | "form" | "view">("list");
  const [editing, setEditing] = useState<ExpenseCategory | null>(null);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [status, setStatus] = useState<"active" | "inactive">("active");

  const refresh = () => setCategories(loadExpenseCategories());

  useEffect(() => {
    if (open) {
      refresh();
      setMode("list");
      setEditing(null);
    }
  }, [open]);

  const openAdd = () => {
    setEditing(null);
    setName("");
    setDescription("");
    setStatus("active");
    setMode("form");
  };

  const openEdit = (c: ExpenseCategory) => {
    setEditing(c);
    setName(c.name);
    setDescription(c.description);
    setStatus(c.status);
    setMode("form");
  };

  const openView = (c: ExpenseCategory) => {
    setEditing(c);
    setMode("view");
  };

  const persist = () => {
    if (!name.trim()) return;
    const list = loadExpenseCategories();
    if (editing) {
      const updated = list.map((c) =>
        c.id === editing.id
          ? { ...c, name: name.trim(), description: description.trim(), status, updatedBy: ACCOUNTS_CURRENT_USER }
          : c,
      );
      saveExpenseCategories(updated);
    } else {
      saveExpenseCategories([
        ...list,
        {
          id: nextCategoryId(list),
          name: name.trim(),
          description: description.trim(),
          status,
          createdBy: ACCOUNTS_CURRENT_USER,
          updatedBy: ACCOUNTS_CURRENT_USER,
        },
      ]);
    }
    refresh();
    onUpdated?.();
    setMode("list");
  };

  const toggleStatus = (c: ExpenseCategory) => {
    const list = loadExpenseCategories().map((x) =>
      x.id === c.id
        ? {
            ...x,
            status: x.status === "active" ? ("inactive" as const) : ("active" as const),
            updatedBy: ACCOUNTS_CURRENT_USER,
          }
        : x,
    );
    saveExpenseCategories(list);
    refresh();
    onUpdated?.();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl p-0 gap-0 overflow-hidden max-h-[85vh] flex flex-col">
        <DialogHeader className="px-5 pt-5 pb-3 border-b border-border/80 flex-shrink-0">
          <div className="flex items-center justify-between gap-2">
            <DialogTitle className="text-sm font-semibold">Expense Categories</DialogTitle>
            {mode === "list" && (
              <Button size="sm" className="h-9 text-sm font-medium gap-1" onClick={openAdd}>
                <Plus className="w-4 h-4" /> Add Category
              </Button>
            )}
            {mode !== "list" && (
              <Button variant="ghost" size="sm" className="h-9 text-sm font-medium" onClick={() => setMode("list")}>
                Back to list
              </Button>
            )}
          </div>
        </DialogHeader>

        {mode === "list" && (
          <div className="overflow-auto flex-1 p-4">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border text-xs uppercase text-muted-foreground">
                  <th className="text-left py-2 px-2">Category</th>
                  <th className="text-left py-2 px-2">Description</th>
                  <th className="text-left py-2 px-2">Status</th>
                  <th className="text-right py-2 px-2 w-28">Actions</th>
                </tr>
              </thead>
              <tbody>
                {categories.map((c) => (
                  <tr key={c.id} className="accounts-table-row group">
                    <td className="py-2 px-2 font-medium">{c.name}</td>
                    <td className="py-2 px-2 text-muted-foreground max-w-[200px] truncate">{c.description}</td>
                    <td className="py-2 px-2">
                      <StatusBadge status={c.status === "active" ? "active" : "inactive"} size="sm" />
                    </td>
                    <td className="py-2 px-2 text-right">
                      <div className="flex justify-end gap-1">
                        <button type="button" className="p-1.5 rounded hover:bg-muted" onClick={() => openView(c)}>
                          <Eye className="w-4 h-4" />
                        </button>
                        <button type="button" className="p-1.5 rounded hover:bg-muted" onClick={() => openEdit(c)}>
                          <Pencil className="w-4 h-4" />
                        </button>
                        <Button variant="outline" size="sm" className="h-7 text-sm px-2" onClick={() => toggleStatus(c)}>
                          {c.status === "active" ? "Deactivate" : "Activate"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {mode === "view" && editing && (
          <div className="p-5 space-y-3 text-xs flex-1">
            <div>
              <p className="text-xs uppercase text-muted-foreground">Category Name</p>
              <p className="font-medium mt-0.5">{editing.name}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Description</p>
              <p className="mt-0.5">{editing.description || "—"}</p>
            </div>
            <div>
              <p className="text-xs uppercase text-muted-foreground">Status</p>
              <div className="mt-1">
                <StatusBadge status={editing.status === "active" ? "active" : "inactive"} size="sm" />
              </div>
            </div>
          </div>
        )}

        {mode === "form" && (
          <div className="p-5 space-y-3 flex-1">
            <div className="space-y-1">
              <Label className="text-xs">Category Name *</Label>
              <Input className="h-9 text-sm font-medium" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Description</Label>
              <Textarea
                className="text-xs min-h-[72px] resize-none"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Status</Label>
              <Select value={status} onValueChange={(v) => setStatus(v as "active" | "inactive")}>
                <SelectTrigger className="h-9 text-sm font-medium w-[140px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active" className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => setMode("list")}>
                Cancel
              </Button>
              <Button size="sm" className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white" onClick={persist}>
                {editing ? "Save Changes" : "Add Category"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
