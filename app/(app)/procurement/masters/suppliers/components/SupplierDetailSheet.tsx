"use client";

import React from "react";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { StatusPill } from "../../../components/ProcurementUI";
import { SUPPLIER_TYPE_LABELS, type Supplier } from "../supplier-data";

const STATUS_CFG = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
};

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-wide text-muted-foreground font-semibold">{label}</p>
      <p className="text-xs text-foreground mt-0.5">{value || "—"}</p>
    </div>
  );
}

export default function SupplierDetailSheet({
  open,
  onClose,
  supplier,
}: {
  open: boolean;
  onClose: () => void;
  supplier: Supplier | null;
}) {
  if (!supplier) return null;
  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="max-w-[440px]">
        <SheetHeader>
          <SheetTitle>{supplier.supplierName}</SheetTitle>
          <SheetDescription className="font-mono">{supplier.supplierCode}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4">
          <StatusPill status={supplier.status} config={STATUS_CFG} />
          <div className="grid grid-cols-2 gap-4">
            <Field label="Type" value={SUPPLIER_TYPE_LABELS[supplier.supplierType] ?? supplier.supplierType} />
            <Field label="Contact" value={supplier.contactPerson} />
            <Field label="Phone" value={supplier.phone} />
            <Field label="Mobile" value={supplier.mobile} />
            <Field label="Email" value={supplier.email} />
            <Field label="GST" value={supplier.gstNumber} />
            <Field label="PAN" value={supplier.panNumber} />
          </div>
          <Field label="Address" value={`${supplier.address}, ${supplier.city}, ${supplier.state} ${supplier.pincode}`} />
          <div className="border-t border-border pt-3 grid grid-cols-2 gap-3 text-[11px] text-muted-foreground">
            <span>Created: {supplier.createdBy} · {supplier.createdDate}</span>
            <span>Updated: {supplier.updatedBy} · {supplier.updatedDate}</span>
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
