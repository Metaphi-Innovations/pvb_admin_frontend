"use client";

import { useMemo } from "react";
import { Input } from "@/components/ui/input";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Upload, Eye, Download, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { loadEmployees } from "@/app/(app)/user-management/employee/employee-data";
import { getActiveCategories, loadExpenseCategories } from "../expense-category-data";
import {
  ACCOUNTS_CURRENT_USER,
} from "@/lib/accounts/config";
import {
  calcTax,
  newAttachmentId,
  sourceLabel,
  type ExpenseAttachment,
  type ExpenseFormValues,
  type ExpenseSource,
  type PaymentMode,
} from "../expense-data";
import { formatINR } from "../expense-utils";

const fieldClass = "h-9 text-sm font-medium";
const labelClass = "text-xs font-medium text-foreground";
const PAYMENT_MODES: PaymentMode[] = ["Cash", "UPI", "Bank Transfer", "Cheque", "Card", "Other"];

export function ExpenseForm({
  form,
  onChange,
  expenseNumber,
  readOnly = false,
}: {
  form: ExpenseFormValues;
  onChange: (f: ExpenseFormValues) => void;
  expenseNumber: string;
  readOnly?: boolean;
}) {
  const employees = useMemo(
    () => loadEmployees().filter((e) => e.status === "active" || e.status === "draft"),
    [],
  );
  const categories = useMemo(() => getActiveCategories(loadExpenseCategories()), []);

  const selectedEmployee = employees.find((e) => e.id === form.employeeId);
  const { gstAmount, totalAmount } = calcTax(form.amount, form.withTax, form.gstPercent);

  const set = <K extends keyof ExpenseFormValues>(key: K, value: ExpenseFormValues[K]) => {
    onChange({ ...form, [key]: value });
  };

  const onEmployeeChange = (id: string) => {
    const emp = employees.find((e) => e.id === Number(id));
    onChange({
      ...form,
      employeeId: emp ? emp.id : null,
    });
  };

  const onFilePick = (e: React.ChangeEvent<HTMLInputElement>, documentName: string) => {
    const file = e.target.files?.[0];
    if (!file || readOnly) return;
    const reader = new FileReader();
    reader.onload = () => {
      const att: ExpenseAttachment = {
        id: newAttachmentId(),
        documentName: documentName.trim() || file.name,
        fileName: file.name,
        fileSize: `${Math.max(1, Math.round(file.size / 1024))} KB`,
        mimeType: file.type || "application/octet-stream",
        dataUrl: typeof reader.result === "string" ? reader.result : undefined,
        uploadedAt: new Date().toISOString().slice(0, 10),
        uploadedBy: ACCOUNTS_CURRENT_USER,
      };
      onChange({ ...form, attachments: [...form.attachments, att] });
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const removeAttachment = (id: string) => {
    onChange({ ...form, attachments: form.attachments.filter((a) => a.id !== id) });
  };

  const viewAttachment = (att: ExpenseAttachment) => {
    if (att.dataUrl) window.open(att.dataUrl, "_blank");
    else alert(`Preview not available for ${att.fileName}`);
  };

  const downloadAttachment = (att: ExpenseAttachment) => {
    if (!att.dataUrl) {
      alert(`Download not available for ${att.fileName}`);
      return;
    }
    const a = document.createElement("a");
    a.href = att.dataUrl;
    a.download = att.fileName;
    a.click();
  };

  const showSourceRef = form.source === "mobile_app" || form.source === "tada_claim";

  return (
    <div className="space-y-4">
      <div className="bg-white rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold mb-3">Basic Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          <div>
            <Label className={labelClass}>Expense No.</Label>
            <Input readOnly value={expenseNumber} className={cn(fieldClass, "bg-muted/25 font-mono mt-1")} />
          </div>
          <div>
            <Label className={labelClass}>Expense Date *</Label>
            <Input
              type="date"
              disabled={readOnly}
              value={form.expenseDate}
              onChange={(e) => set("expenseDate", e.target.value)}
              className={cn(fieldClass, "mt-1")}
            />
          </div>
          <div>
            <Label className={labelClass}>Expense Category *</Label>
            <Select
              disabled={readOnly}
              value={form.categoryId ? String(form.categoryId) : ""}
              onValueChange={(v) => set("categoryId", Number(v))}
            >
              <SelectTrigger className={cn(fieldClass, "mt-1")}>
                <SelectValue placeholder="Select category" />
              </SelectTrigger>
              <SelectContent>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)} className="text-xs">
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClass}>Employee Name *</Label>
            <Select
              disabled={readOnly}
              value={form.employeeId ? String(form.employeeId) : ""}
              onValueChange={onEmployeeChange}
            >
              <SelectTrigger className={cn(fieldClass, "mt-1")}>
                <SelectValue placeholder="Select employee" />
              </SelectTrigger>
              <SelectContent>
                {employees.map((e) => (
                  <SelectItem key={e.id} value={String(e.id)} className="text-xs">
                    {e.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className={labelClass}>Employee Code</Label>
            <Input
              readOnly
              value={selectedEmployee?.employeeId ?? "—"}
              className={cn(fieldClass, "bg-muted/25 font-mono mt-1")}
            />
          </div>
          <div>
            <Label className={labelClass}>Department</Label>
            <Input
              readOnly
              value={selectedEmployee?.department ?? "—"}
              className={cn(fieldClass, "bg-muted/25 mt-1")}
            />
          </div>
          <div className="md:col-span-2 lg:col-span-3">
            <Label className={labelClass}>Description / Remarks *</Label>
            <Textarea
              disabled={readOnly}
              value={form.description}
              onChange={(e) => set("description", e.target.value)}
              className="text-xs min-h-[72px] resize-none mt-1"
            />
          </div>
          <div>
            <Label className={labelClass}>Expense Amount *</Label>
            <AccountsMoneyInput
              disabled={readOnly}
              value={form.amount || ""}
              onChange={(v) => set("amount", v)}
              className={cn(fieldClass, "mt-1")}
            />
          </div>
          <div>
            <Label className={labelClass}>Source</Label>
            <Select
              disabled={readOnly}
              value={form.source}
              onValueChange={(v) => set("source", v as ExpenseSource)}
            >
              <SelectTrigger className={cn(fieldClass, "mt-1")}>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="web_admin" className="text-xs">{sourceLabel("web_admin")}</SelectItem>
                <SelectItem value="mobile_app" className="text-xs">{sourceLabel("mobile_app")}</SelectItem>
                <SelectItem value="tada_claim" className="text-xs">{sourceLabel("tada_claim")}</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {showSourceRef && (
            <div>
              <Label className={labelClass}>Source Reference No. *</Label>
              <Input
                disabled={readOnly}
                value={form.sourceReferenceNo}
                onChange={(e) => set("sourceReferenceNo", e.target.value)}
                className={cn(fieldClass, "mt-1 font-mono")}
              />
            </div>
          )}
          <div>
            <Label className={labelClass}>Preferred Payment Mode</Label>
            <Select
              disabled={readOnly}
              value={form.paymentMode ?? ""}
              onValueChange={(v) => set("paymentMode", v as PaymentMode)}
            >
              <SelectTrigger className={cn(fieldClass, "mt-1")}>
                <SelectValue placeholder="Optional" />
              </SelectTrigger>
              <SelectContent>
                {PAYMENT_MODES.map((m) => (
                  <SelectItem key={m} value={m} className="text-xs">{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-lg border border-border/60 p-4">
        <h2 className="text-sm font-semibold mb-3">Tax</h2>
        <div className="flex flex-wrap items-center gap-4 mb-3">
          <span className="text-xs text-muted-foreground">Create Expense With Tax</span>
          <div className="flex gap-2">
            {(["no", "yes"] as const).map((v) => (
              <button
                key={v}
                type="button"
                disabled={readOnly}
                onClick={() => onChange({ ...form, withTax: v === "yes" })}
                className={cn(
                  "h-8 px-3 rounded-md text-xs font-medium border transition-colors",
                  (v === "yes") === form.withTax
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-white border-border hover:bg-muted/30",
                )}
              >
                {v === "yes" ? "Yes" : "No"}
              </button>
            ))}
          </div>
        </div>
        {form.withTax ? (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <Label className={labelClass}>GST %</Label>
              <Input
                type="number"
                min={0}
                max={100}
                disabled={readOnly}
                value={form.gstPercent}
                onChange={(e) => set("gstPercent", parseFloat(e.target.value) || 0)}
                className={cn(fieldClass, "mt-1")}
              />
            </div>
            <div>
              <Label className={labelClass}>GST Amount</Label>
              <Input readOnly value={gstAmount} className={cn(fieldClass, "bg-muted/25 mt-1")} />
            </div>
            <div>
              <Label className={labelClass}>Total Amount</Label>
              <Input readOnly value={totalAmount} className={cn(fieldClass, "bg-muted/25 font-semibold mt-1")} />
            </div>
          </div>
        ) : (
          <p className="text-xs text-muted-foreground">
            Total Amount: <span className="font-semibold text-foreground">{formatINR(totalAmount)}</span>
          </p>
        )}
      </div>

      <div className="bg-white rounded-lg border border-border/60 p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-sm font-semibold">Attachments</h2>
          <span className="text-xs text-muted-foreground">{form.attachments.length} file(s)</span>
        </div>
        {!readOnly && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2 mb-3 p-3 bg-muted/15 rounded-lg border border-dashed border-border/60">
            <Input
              id="new-doc-name"
              placeholder="Document name"
              className={fieldClass}
              onKeyDown={(e) => e.stopPropagation()}
            />
            <label className="flex items-center justify-center gap-2 h-8 px-3 rounded-md border border-border bg-white text-xs cursor-pointer hover:bg-muted/30 col-span-2 md:col-span-2">
              <Upload className="w-4 h-4" />
              Upload file
              <input
                type="file"
                className="hidden"
                onChange={(e) => {
                  const nameInput = document.getElementById("new-doc-name") as HTMLInputElement | null;
                  onFilePick(e, nameInput?.value ?? "");
                  if (nameInput) nameInput.value = "";
                }}
              />
            </label>
          </div>
        )}
        {form.attachments.length === 0 ? (
          <p className="text-xs text-muted-foreground py-4 text-center">No attachments added.</p>
        ) : (
          <div className="space-y-2">
            {form.attachments.map((att) => (
              <div
                key={att.id}
                className="flex flex-wrap items-center gap-2 py-2 px-3 rounded-md border border-border/50 bg-muted/10 text-xs"
              >
                <span className="font-medium min-w-[120px]">{att.documentName}</span>
                <span className="text-muted-foreground truncate flex-1">{att.fileName} · {att.fileSize}</span>
                <div className="flex gap-1 ml-auto">
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => viewAttachment(att)}>
                    <Eye className="w-4 h-4" />
                  </Button>
                  <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0" onClick={() => downloadAttachment(att)}>
                    <Download className="w-4 h-4" />
                  </Button>
                  {!readOnly && (
                    <Button type="button" variant="ghost" size="sm" className="h-7 w-7 p-0 text-red-600" onClick={() => removeAttachment(att.id)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
