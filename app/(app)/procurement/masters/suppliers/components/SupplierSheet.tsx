"use client";

import React, { useEffect, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Sheet, SheetBody, SheetContent, SheetDescription, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { SUPPLIER_TYPE_OPTIONS, type Supplier } from "../supplier-data";

export interface SupplierFormState {
  supplierName: string;
  supplierType: string;
  gstNumber: string;
  panNumber: string;
  contactPerson: string;
  phone: string;
  mobile: string;
  email: string;
  address: string;
  city: string;
  state: string;
  country: string;
  pincode: string;
  status: "active" | "inactive";
}

const EMPTY: SupplierFormState = {
  supplierName: "",
  supplierType: "",
  gstNumber: "",
  panNumber: "",
  contactPerson: "",
  phone: "",
  mobile: "",
  email: "",
  address: "",
  city: "",
  state: "",
  country: "India",
  pincode: "",
  status: "active",
};

interface Props {
  open: boolean;
  onClose: () => void;
  onSave: (data: SupplierFormState) => void;
  supplier?: Supplier | null;
}

export default function SupplierSheet({ open, onClose, onSave, supplier }: Props) {
  const isEdit = !!supplier;
  const [form, setForm] = useState<SupplierFormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});

  useEffect(() => {
    if (supplier) {
      setForm({
        supplierName: supplier.supplierName,
        supplierType: supplier.supplierType,
        gstNumber: supplier.gstNumber,
        panNumber: supplier.panNumber,
        contactPerson: supplier.contactPerson,
        phone: supplier.phone,
        mobile: supplier.mobile,
        email: supplier.email,
        address: supplier.address,
        city: supplier.city,
        state: supplier.state,
        country: supplier.country,
        pincode: supplier.pincode,
        status: supplier.status,
      });
    } else setForm(EMPTY);
    setErrors({});
  }, [supplier, open]);

  const set = (k: keyof SupplierFormState, v: string) => {
    setForm((p) => ({ ...p, [k]: v }));
    if (errors[k]) setErrors((e) => ({ ...e, [k]: "" }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.supplierName.trim()) e.supplierName = "Required";
    if (!form.supplierType) e.supplierType = "Required";
    if (!form.contactPerson.trim()) e.contactPerson = "Required";
    setErrors(e);
    return Object.keys(e).length === 0;
  };

  return (
    <Sheet open={open} onOpenChange={onClose}>
      <SheetContent className="max-w-[480px]">
        <SheetHeader>
          <SheetTitle>{isEdit ? "Edit Supplier" : "Add Supplier"}</SheetTitle>
          <SheetDescription>{isEdit ? supplier?.supplierCode : "Create a new supplier record"}</SheetDescription>
        </SheetHeader>
        <SheetBody className="space-y-4 max-h-[calc(100vh-180px)] overflow-y-auto">
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier Name *</Label>
            <Input value={form.supplierName} onChange={(e) => set("supplierName", e.target.value)} className="h-8 text-xs" />
            {errors.supplierName && <p className="text-[11px] text-red-600">{errors.supplierName}</p>}
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Supplier Type *</Label>
            <select value={form.supplierType} onChange={(e) => set("supplierType", e.target.value)} className="w-full h-8 text-xs border border-border rounded-lg px-2">
              <option value="">Select type</option>
              {SUPPLIER_TYPE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>{o.label}</option>
              ))}
            </select>
            {errors.supplierType && <p className="text-[11px] text-red-600">{errors.supplierType}</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">GST Number</Label>
              <Input value={form.gstNumber} onChange={(e) => set("gstNumber", e.target.value)} className="h-8 text-xs font-mono" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">PAN Number</Label>
              <Input value={form.panNumber} onChange={(e) => set("panNumber", e.target.value)} className="h-8 text-xs font-mono" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Contact Person *</Label>
            <Input value={form.contactPerson} onChange={(e) => set("contactPerson", e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Phone</Label>
              <Input value={form.phone} onChange={(e) => set("phone", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Mobile</Label>
              <Input value={form.mobile} onChange={(e) => set("mobile", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Email</Label>
            <Input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="h-8 text-xs" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Address</Label>
            <Textarea value={form.address} onChange={(e) => set("address", e.target.value)} className="text-xs min-h-[60px]" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">City</Label>
              <Input value={form.city} onChange={(e) => set("city", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">State</Label>
              <Input value={form.state} onChange={(e) => set("state", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Country</Label>
              <Input value={form.country} onChange={(e) => set("country", e.target.value)} className="h-8 text-xs" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Pincode</Label>
              <Input value={form.pincode} onChange={(e) => set("pincode", e.target.value)} className="h-8 text-xs" />
            </div>
          </div>
          <div className="flex items-center justify-between py-2 border-t border-border">
            <Label className="text-xs">Active</Label>
            <Switch checked={form.status === "active"} onCheckedChange={(c) => set("status", c ? "active" : "inactive")} />
          </div>
        </SheetBody>
        <SheetFooter>
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>Cancel</Button>
          <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => validate() && onSave(form)}>
            {isEdit ? "Update" : "Save"}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
