"use client";

import React, { useRef, useState, useMemo, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Upload, RefreshCw, ChevronsUpDown, Check } from "lucide-react";
import { CompactToggle } from "./CompactToggle";
import { loadProducts } from "../../products/product-data";
import {
  Field,
  FieldGrid,
  SectionDivider,
  VendorTabBar,
  fieldClass,
  selectClass,
} from "./VendorFormLayout";
import {
  type VendorFormValues,
  type VendorContact,
  type VendorDocument,
  type VendorProductMapping,
  COUNTRY_CODES,
  COUNTRIES,
  TDS_PERCENT_OPTIONS,
  fetchGstDetails,
  emptyContact,
  todayStr,
} from "../vendor-data";
import { loadDocumentTypes } from "../../document-types/document-type-data";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

const TABS = [
  { id: "basic", label: "Basic Details" },
  { id: "contact", label: "Contact Information" },
  { id: "banking", label: "Banking Information" },
  { id: "product", label: "Product" },
  { id: "documents", label: "Documents & Remarks" },
] as const;

type TabId = (typeof TABS)[number]["id"];

function MobileRow({
  countryCode,
  mobile,
  onCountryCode,
  onMobile,
  disabled,
}: {
  countryCode: string;
  mobile: string;
  onCountryCode: (v: string) => void;
  onMobile: (v: string) => void;
  disabled?: boolean;
}) {
  return (
    <PhoneInput
      countryCode={countryCode || "+91"}
      onCountryCodeChange={onCountryCode}
      value={mobile}
      onChange={onMobile}
      disabled={disabled}
      placeholder="Mobile number"
    />
  );
}

function Toast({ msg, type, onDismiss }: { msg: string; type: "success" | "error"; onDismiss: () => void }) {
  return (
    <div
      className={`fixed top-5 right-5 z-[100] px-4 py-2.5 rounded-lg shadow-lg text-sm text-white ${
        type === "success" ? "bg-emerald-600" : "bg-red-600"
      }`}
    >
      {msg}
      <button type="button" className="ml-3 opacity-80" onClick={onDismiss}>
        ×
      </button>
    </div>
  );
}

interface ProductCatalogItem {
  productId: string;
  productName: string;
  sku: string;
  mrp: number;
}

function ProductSelect({
  products,
  value,
  onSelect,
  disabled,
}: {
  products: ProductCatalogItem[];
  value: string;
  onSelect: (product: ProductCatalogItem) => void;
  disabled?: boolean;
}) {
  const options = products.map((p) => ({
    value: p.productId,
    label: `${p.sku} — ${p.productName}`,
    trailing: <span className="text-[10px] text-muted-foreground">MRP: ₹{p.mrp}</span>,
  }));

  return (
    <AutocompleteSelect
      options={options}
      value={value}
      onChange={(val) => {
        const prod = products.find((p) => p.productId === val);
        if (prod) {
          onSelect(prod);
        }
      }}
      placeholder="Select product by name, SKU, or code"
      searchPlaceholder="Search product…"
      disabled={disabled}
      className="h-8 text-xs font-normal"
    />
  );
}

function DocumentNameField({
  value,
  documentTypeId,
  onChange,
  readOnly,
  error,
}: {
  value: string;
  documentTypeId?: string;
  onChange: (next: { documentName: string; documentTypeId?: string }) => void;
  readOnly?: boolean;
  error?: string;
}) {
  const activeDocTypes = useMemo(() => loadDocumentTypes().filter((d) => d.status === "Active"), []);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const filtered = useMemo(() => {
    const q = value.trim().toLowerCase();
    if (!q) return activeDocTypes;
    return activeDocTypes.filter((d) =>
      d.title.toLowerCase().includes(q) ||
      d.description.toLowerCase().includes(q) ||
      d.id.toLowerCase().includes(q),
    );
  }, [activeDocTypes, value]);
  const selected = activeDocTypes.find((d) => d.id === documentTypeId);

  useEffect(() => {
    if (!open || readOnly) return;

    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as Node | null;
      if (target && rootRef.current?.contains(target)) return;
      setOpen(false);
    };

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };

    document.addEventListener("pointerdown", onPointerDown);
    document.addEventListener("keydown", onKeyDown);
    return () => {
      document.removeEventListener("pointerdown", onPointerDown);
      document.removeEventListener("keydown", onKeyDown);
    };
  }, [open, readOnly]);

  return (
    <div className="space-y-1 relative" ref={rootRef}>
      <div className="relative">
        <Input
          disabled={readOnly}
          value={value}
          onChange={(e) => {
            onChange({ documentName: e.target.value, documentTypeId: undefined });
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (!readOnly) {
              if (e.key === "Escape") setOpen(false);
              else setOpen(true);
            }
          }}
          className={cn("h-8 text-xs border-border/60 pr-9", error && "border-red-400 focus-visible:ring-red-300")}
          placeholder="Type or select document type"
        />
        <button
          type="button"
          tabIndex={-1}
          className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => { if (!readOnly) setOpen(true); }}
        >
          <ChevronsUpDown className="w-3.5 h-3.5" />
        </button>
      </div>
      {open && !readOnly && (
        <div className="absolute left-0 top-full z-50 mt-1 w-full rounded-lg border border-border/60 bg-white shadow-lg">
          <div className="max-h-56 overflow-y-auto py-1">
            {filtered.length === 0 ? (
              <p className="px-3 py-3 text-xs text-muted-foreground">No matching document types</p>
            ) : (
              filtered.map((docType) => (
                <button
                  key={docType.id}
                  type="button"
                  className={cn(
                    "w-full px-3 py-2 text-left hover:bg-muted/60 flex items-start gap-2",
                    selected?.id === docType.id && "bg-brand-50",
                  )}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => {
                    onChange({ documentName: docType.title, documentTypeId: docType.id });
                    setOpen(false);
                  }}
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <span className="text-xs font-medium text-foreground truncate">{docType.title}</span>
                      {selected?.id === docType.id && <Check className="w-3 h-3 text-brand-600 shrink-0" />}
                    </div>
                    {docType.description && (
                      <p className="text-[10px] text-muted-foreground truncate mt-0.5">{docType.description}</p>
                    )}
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
      {error && <p className="text-[11px] text-red-500">{error}</p>}
    </div>
  );
}

export function VendorForm({
  form,
  onChange,
  readOnly,
  vendorCode,
}: {
  form: VendorFormValues;
  onChange: (f: VendorFormValues) => void;
  readOnly?: boolean;
  vendorCode?: string;
}) {
  const [tab, setTab] = useState<TabId>("basic");
  const [fetchingGst, setFetchingGst] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});
  const [toast, setToast] = useState<{ msg: string; type: "success" | "error" } | null>(null);

  const showToast = (msg: string, type: "success" | "error" = "error") => {
    setToast({ msg, type });
  };

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  const set = <K extends keyof VendorFormValues>(k: K, v: VendorFormValues[K]) =>
    onChange({ ...form, [k]: v });

  const activeProducts = useMemo(() => {
    try {
      return loadProducts().filter((p) => p.status === "active");
    } catch {
      return [];
    }
  }, []);

  const getProductMetadataString = (prodId: string) => {
    const prod = activeProducts.find((item) => item.productId === prodId);
    if (!prod) return "";
    const parts: string[] = [];
    if (prod.category) parts.push(`Category: ${prod.category}`);
    if (prod.subCategory) parts.push(`Sub Category: ${prod.subCategory}`);
    if (prod.unit) parts.push(`Unit: ${prod.unit}`);
    if (prod.baseUnit) parts.push(`Base Unit: ${prod.baseUnit}`);
    if (prod.packagingUnit) parts.push(`Packaging Unit: ${prod.packagingUnit}`);
    if (prod.packSize) parts.push(`Pack Size: ${prod.packSize}`);
    if (prod.hsnCode) parts.push(`HSN: ${prod.hsnCode}`);
    if (prod.gstRate) parts.push(`GST: ${prod.gstRate}`);
    return parts.join(" | ");
  };

  const addProductRow = () => {
    const incompleteIndex = (form.vendorProducts || []).findIndex(
      (p) => !p.productId || !p.productName?.trim()
    );
    if (incompleteIndex !== -1) {
      showToast("Please select a product before adding a new row.");
      return;
    }
    const newId = `vp-${Math.random().toString(36).substring(2, 9)}`;
    const newRow: VendorProductMapping = {
      id: newId,
      productId: "",
      productName: "",
      mrp: 0,
      price: undefined,
      status: "Active",
    };
    set("vendorProducts", [...(form.vendorProducts || []), newRow]);
  };

  const updateProductRow = (id: string, patch: Partial<VendorProductMapping>) => {
    const updated = (form.vendorProducts || []).map((p) => {
      if (p.id !== id) return p;
      return { ...p, ...patch };
    });
    set("vendorProducts", updated);
  };

  const removeProductRow = (id: string) => {
    const updated = (form.vendorProducts || []).filter((p) => p.id !== id);
    set("vendorProducts", updated);
  };

  const setAddr = (k: keyof VendorFormValues["billingAddress"], v: string) =>
    set("billingAddress", { ...form.billingAddress, [k]: v });

  const handleFetchGst = () => {
    if (readOnly) return;
    setFetchingGst(true);
    const details = fetchGstDetails(form.gstNumber);
    setTimeout(() => {
      if (details) {
        onChange({
          ...form,
          legalCompanyName: details.legalCompanyName,
          companyName: form.companyName || details.legalCompanyName,
          billingAddress: { ...form.billingAddress, ...details.billingAddress },
        });
      }
      setFetchingGst(false);
    }, 400);
  };

  const updateContact = (uid: string, patch: Partial<VendorContact>) => {
    set("contacts", form.contacts.map((c) => (c.uid === uid ? { ...c, ...patch } : c)));
  };

  const addContact = () => {
    const lastContact = form.contacts[form.contacts.length - 1];
    if (lastContact && !lastContact.name.trim()) {
      showToast("Please fill the details of the current contact before adding another one.");
      return;
    }
    set("contacts", [...form.contacts, emptyContact()]);
  };
  const removeContact = (uid: string) => {
    if (form.contacts.length <= 1) return;
    set("contacts", form.contacts.filter((c) => c.uid !== uid));
  };

  const addDocumentRow = () => {
    set("documents", [
      ...form.documents,
      { uid: `d-${Date.now()}`, documentName: "", documentTypeId: undefined, file: undefined, fileUrl: undefined, uploaded: false, fileName: "", uploadedAt: "", size: "" },
    ]);
  };

  const uploadDoc = (uid: string, file: File) => {
    set("documents", form.documents.map((d) => {
      if (d.uid !== uid) return d;
      if (d.fileUrl && d.fileUrl.startsWith("blob:")) {
        URL.revokeObjectURL(d.fileUrl);
      }
      return {
        ...d,
        file,
        fileUrl: URL.createObjectURL(file),
        uploaded: true,
        fileName: file.name,
        uploadedAt: todayStr(),
        size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
      };
    }));
  };

  const updateDocument = (uid: string, patch: Partial<VendorDocument>) => {
    set("documents", form.documents.map((d) => (d.uid === uid ? { ...d, ...patch } : d)));
  };

  const removeDocumentRow = (uid: string) => {
    const row = form.documents.find((d) => d.uid === uid);
    if (row?.fileUrl && row.fileUrl.startsWith("blob:")) {
      URL.revokeObjectURL(row.fileUrl);
    }
    set("documents", form.documents.filter((d) => d.uid !== uid));
  };

  const openFile = (url?: string) => {
    if (!url) return;
    const trimmedUrl = url.trim();
    if (!trimmedUrl) return;
    const isAbsolute = /^https?:\/\//i.test(trimmedUrl) || /^blob:/i.test(trimmedUrl) || /^data:/i.test(trimmedUrl);
    const safeUrl = isAbsolute ? trimmedUrl : `https://${trimmedUrl}`;
    window.open(safeUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <div className="shadow-sm">
      <VendorTabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />

      <div className="px-4 py-4 bg-white border border-t-0 rounded-b-lg border-border/60 md:px-5 md:py-4">
        {tab === "basic" && (
          <div className="w-full space-y-4">
            <section>
              <SectionDivider title="Vendor Information" />
              <div className="grid grid-cols-12 gap-3">
                {/* Vendor Code */}
                <Field label="Vendor Code" className="col-span-12 md:col-span-2">
                  <Input
                    disabled
                    value={vendorCode || form.vendorCode || ""}
                    className={cn(fieldClass, "bg-muted/20")}
                  />
                </Field>

                {/* Vendor Name */}
                <Field label="Vendor Name" required className="col-span-12 md:col-span-5">
                  <Input
                    disabled={readOnly}
                    value={form.vendorName}
                    onChange={(e) => set("vendorName", e.target.value)}
                    className={fieldClass}
                    placeholder="Trade / display name"
                  />
                </Field>

                {/* Company Name */}
                <Field label="Company Name" className="col-span-12 md:col-span-5">
                  <Input
                    disabled={readOnly}
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    className={fieldClass}
                    placeholder="Registered company name"
                  />
                </Field>

                {/* Mobile Number */}
                <Field label="Mobile Number" required className="col-span-12 md:col-span-3">
                  <MobileRow
                    countryCode={form.mobileCountryCode}
                    mobile={form.mobile}
                    onCountryCode={(v) => set("mobileCountryCode", v)}
                    onMobile={(v) => set("mobile", v)}
                    disabled={readOnly}
                  />
                </Field>

                {/* Email ID */}
                <Field label="Email ID" className="col-span-12 md:col-span-3">
                  <Input
                    type="email"
                    disabled={readOnly}
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    className={fieldClass}
                    placeholder="vendor@company.com"
                  />
                </Field>

                {/* GST Group */}
                <div className="col-span-12 md:col-span-6 flex gap-3 items-end">
                  <Field label="GST Applicable" className="w-24 shrink-0">
                    <div className="flex items-center h-9">
                      <CompactToggle
                        checked={form.gstApplicable}
                        onCheckedChange={(c) => set("gstApplicable", c)}
                        disabled={readOnly}
                        activeLabel="Yes"
                        inactiveLabel="No"
                      />
                    </div>
                  </Field>

                  {form.gstApplicable && (
                    <Field label="GSTIN" className="flex-1">
                      <Input
                        disabled={readOnly}
                        value={form.gstNumber}
                        onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                        className={cn(fieldClass, "font-mono uppercase")}
                        maxLength={15}
                        placeholder="15-character GSTIN"
                      />
                    </Field>
                  )}
                </div>

                {form.gstApplicable && form.legalCompanyName && (
                  <Field label="Legal Company Name" className="col-span-12 md:col-span-4">
                    <Input readOnly value={form.legalCompanyName} className={cn(fieldClass, "bg-muted/20")} />
                  </Field>
                )}
              </div>
            </section>

            <section>
              <SectionDivider title="Billing Address" />
              <div className="grid grid-cols-12 gap-3">
                <Field label="Address Line 1" className="col-span-12 md:col-span-6">
                  <Input disabled={readOnly} value={form.billingAddress.line1} onChange={(e) => setAddr("line1", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Address Line 2" className="col-span-12 md:col-span-6">
                  <Input disabled={readOnly} value={form.billingAddress.line2} onChange={(e) => setAddr("line2", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="State" className="col-span-12 md:col-span-3">
                  <Input disabled={readOnly} value={form.billingAddress.state} onChange={(e) => setAddr("state", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="City" className="col-span-12 md:col-span-3">
                  <Input disabled={readOnly} value={form.billingAddress.city} onChange={(e) => setAddr("city", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Country" className="col-span-12 md:col-span-4">
                  <Select
                    disabled={readOnly}
                    value={form.billingAddress.country}
                    onValueChange={(val) => setAddr("country", val)}
                  >
                    <SelectTrigger className="h-9 text-xs">
                      <SelectValue placeholder="Select country..." />
                    </SelectTrigger>
                    <SelectContent>
                      {COUNTRIES.map((c) => (
                        <SelectItem key={c} value={c}>
                          {c}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </Field>
                <Field label="Pincode" className="col-span-12 md:col-span-2">
                  <Input disabled={readOnly} value={form.billingAddress.pincode} onChange={(e) => setAddr("pincode", e.target.value)} className={fieldClass} />
                </Field>
              </div>
            </section>

            <section>
              <SectionDivider title="TDS" />
              <div className="grid grid-cols-12 gap-3 items-end">
                <Field label="TDS Applicable" className="col-span-12 md:col-span-3">
                  <div className="flex items-center h-9 gap-2">
                    <CompactToggle
                      checked={form.tdsApplicable}
                      onCheckedChange={(c) => set("tdsApplicable", c)}
                      disabled={readOnly}
                      activeLabel="Yes"
                      inactiveLabel="No"
                    />
                    <span className="text-[11px] text-muted-foreground">{form.tdsApplicable ? "Applicable" : "Not applicable"}</span>
                  </div>
                </Field>
                {form.tdsApplicable && (
                  <>
                    <Field label="TDS Percentage" className="col-span-12 md:col-span-3">
                      <Select
                        disabled={readOnly}
                        value={form.tdsPercentage}
                        onValueChange={(val) => set("tdsPercentage", val)}
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue placeholder="Select TDS %..." />
                        </SelectTrigger>
                        <SelectContent>
                          {TDS_PERCENT_OPTIONS.map((o) => (
                            <SelectItem key={o.value} value={o.value}>
                              {o.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </Field>
                    {form.tdsPercentage === "custom" && (
                      <Field label="Custom %" className="col-span-12 md:col-span-3">
                        <Input type="number" disabled={readOnly} value={form.tdsCustomPercent} onChange={(e) => set("tdsCustomPercent", e.target.value)} className={fieldClass} placeholder="e.g. 7.5" />
                      </Field>
                    )}
                  </>
                )}
              </div>
            </section>

            <section>
              <SectionDivider title="TCS" />
              <div className="flex items-center gap-2">
                <CompactToggle
                  checked={form.tcsApplicable}
                  onCheckedChange={(c) => set("tcsApplicable", c)}
                  disabled={readOnly}
                  activeLabel="Yes"
                  inactiveLabel="No"
                />
                <span className="text-[11px] text-muted-foreground">{form.tcsApplicable ? "Applicable" : "Not applicable"}</span>
              </div>
            </section>

            <section>
              <SectionDivider title="Additional Information" />
              <div className="grid grid-cols-12 gap-3">
                <Field label="PAN Number" className="col-span-12 md:col-span-3">
                  <Input disabled={readOnly} value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} className={cn(fieldClass, "font-mono uppercase")} maxLength={10} />
                </Field>
                <Field label="Tags" className="col-span-12 md:col-span-4">
                  <Input disabled={readOnly} value={form.tags} onChange={(e) => set("tags", e.target.value)} className={fieldClass} placeholder="Comma-separated" />
                </Field>
                <Field label="Vendor Credit Period" className="col-span-12 md:col-span-5">
                  <div className="flex gap-2">
                    <Input type="number" min={0} disabled={readOnly} value={form.creditPeriodValue} onChange={(e) => set("creditPeriodValue", e.target.value)} className={cn(fieldClass, "w-20")} />
                    <Select
                      disabled={readOnly}
                      value={form.creditPeriodUnit}
                      onValueChange={(val) => set("creditPeriodUnit", val as VendorFormValues["creditPeriodUnit"])}
                    >
                      <SelectTrigger className="h-9 text-xs flex-1">
                        <SelectValue placeholder="Select unit..." />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="days">Days</SelectItem>
                        <SelectItem value="months">Months</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </Field>
              </div>
            </section>
          </div>
        )}

        {tab === "contact" && (
          <div className="w-full space-y-3">
            <SectionDivider title="Contact Persons" subtitle="Primary and additional contacts" />
            {form.contacts.map((c, idx) => (
              <div key={c.uid} className={cn("rounded-lg border border-border/50 p-3.5", idx === 0 && "border-brand-200/80 bg-brand-50/20")}>
                {idx === 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-2.5">Primary Contact</p>
                )}
                <div className="grid grid-cols-1 md:grid-cols-12 gap-3 items-end">
                  <Field label="Contact Person Name" className="col-span-1 md:col-span-3">
                    <Input disabled={readOnly} value={c.name} onChange={(e) => updateContact(c.uid, { name: e.target.value })} className={fieldClass} />
                  </Field>
                  <Field label="Designation" className="col-span-1 md:col-span-2">
                    <Input disabled={readOnly} value={c.designation} onChange={(e) => updateContact(c.uid, { designation: e.target.value })} className={fieldClass} />
                  </Field>
                  <Field label="Mobile Number" className="col-span-1 md:col-span-3">
                    <MobileRow
                      countryCode={c.countryCode}
                      mobile={c.mobile}
                      onCountryCode={(v) => updateContact(c.uid, { countryCode: v })}
                      onMobile={(v) => updateContact(c.uid, { mobile: v })}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Email ID" className="col-span-1 md:col-span-3">
                    <Input type="email" disabled={readOnly} value={c.email} onChange={(e) => updateContact(c.uid, { email: e.target.value })} className={fieldClass} />
                  </Field>
                  {!readOnly && form.contacts.length > 1 && (
                    <div className="col-span-1 md:col-span-1 flex items-end justify-start md:justify-center pb-1">
                      <Button type="button" variant="ghost" size="sm" className="h-8 text-red-600 px-2 animate-none" onClick={() => removeContact(c.uid)}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {!readOnly && (
              <Button type="button" variant="outline" size="sm" className="h-8 text-xs border-dashed" onClick={addContact}>
                <Plus className="w-3.5 h-3.5 mr-1" /> Add Contact Person
              </Button>
            )}
          </div>
        )}

        {tab === "banking" && (
          <div className="w-full">
            <SectionDivider title="Bank Account" />
            <FieldGrid>
              <Field label="Account Holder Name">
                <Input disabled={readOnly} value={form.accountHolderName} onChange={(e) => set("accountHolderName", e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Bank Name">
                <Input disabled={readOnly} value={form.bankName} onChange={(e) => set("bankName", e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Branch Name">
                <Input disabled={readOnly} value={form.branch} onChange={(e) => set("branch", e.target.value)} className={fieldClass} />
              </Field>
              <Field label="Account Number">
                <Input disabled={readOnly} value={form.accountNumber} onChange={(e) => set("accountNumber", e.target.value)} className={cn(fieldClass, "font-mono")} />
              </Field>
              <Field label="Confirm Account Number">
                <Input disabled={readOnly} value={form.confirmAccountNumber} onChange={(e) => set("confirmAccountNumber", e.target.value)} className={cn(fieldClass, "font-mono")} />
              </Field>
              <Field label="IFSC Code">
                <Input disabled={readOnly} value={form.ifscCode} onChange={(e) => set("ifscCode", e.target.value.toUpperCase())} className={cn(fieldClass, "font-mono uppercase")} />
              </Field>
              <Field label="SWIFT Code">
                <Input disabled={readOnly} value={form.swiftCode} onChange={(e) => set("swiftCode", e.target.value)} className={fieldClass} placeholder="Optional" />
              </Field>
            </FieldGrid>
          </div>
        )}

        {tab === "product" && (
          <div className="w-full space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-border/60">
              <SectionDivider title="Product Mappings" subtitle="Select products and enter vendor-specific purchase prices." />
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1 text-xs border-dashed animate-none"
                  onClick={addProductRow}
                >
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Product
                </Button>
              )}
            </div>

            {!form.vendorProducts || form.vendorProducts.length === 0 ? (
              <div className="py-8 text-center border border-dashed rounded-lg border-border">
                <p className="text-xs text-muted-foreground">No products mapped yet. Click Add Product to map vendor-specific prices.</p>
              </div>
            ) : (
              <div className="overflow-hidden bg-white border rounded-lg shadow-sm border-border">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs min-w-[640px]">
                    <thead>
                      <tr className="text-left border-b bg-muted/25 border-border/50 text-muted-foreground">
                        <th className="px-3 py-2 font-medium">Product</th>
                        <th className="px-3 py-2 font-medium w-36" title="Fetched from Product Master">MRP</th>
                        <th className="px-3 py-2 font-medium w-36">Price</th>
                        {!readOnly && <th className="w-12 px-3 py-2" />}
                      </tr>
                    </thead>
                    <tbody>
                      {form.vendorProducts.map((p, idx) => {
                        const isPriceInvalid = p.price === undefined || p.price === null || isNaN(p.price) || p.price <= 0;

                        return (
                          <tr key={p.id} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                            {/* Product Select */}
                            <td className="px-3 py-2 min-w-[240px]">
                              {readOnly ? (
                                <div className="flex flex-col gap-1">
                                  <span className="font-medium text-foreground">
                                    {p.productName ? `${p.sku || "—"} — ${p.productName}` : "—"}
                                  </span>
                                  {p.productId && (
                                    <div className="text-[10px] text-muted-foreground select-none">
                                      {getProductMetadataString(p.productId)}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <div className="space-y-1">
                                  <ProductSelect
                                    products={activeProducts}
                                    value={p.productId}
                                    onSelect={(prod) => {
                                      // Avoid duplicate product mapping
                                      const isDuplicate = form.vendorProducts.some(
                                        (item) => item.productId === prod.productId && item.id !== p.id
                                      );
                                      if (isDuplicate) {
                                        showToast(`${prod.productName} is already mapped.`);
                                        return;
                                      }
                                      updateProductRow(p.id, {
                                        productId: prod.productId,
                                        productName: prod.productName,
                                        sku: prod.sku,
                                        mrp: prod.mrp,
                                      });
                                    }}
                                  />
                                  <div className="text-[10px] text-muted-foreground select-none">
                                    {p.productId
                                      ? getProductMetadataString(p.productId)
                                      : "Product details like category, unit, pack size, HSN, and GST will appear after selection."}
                                  </div>
                                </div>
                              )}
                            </td>

                            {/* MRP */}
                            <td className="px-3 py-2 w-36">
                              <span className="font-mono text-muted-foreground" title="Fetched from Product Master">
                                {p.mrp !== undefined && p.mrp !== null
                                  ? `₹${p.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                  : "—"}
                              </span>
                            </td>

                            {/* Price */}
                            <td className="px-3 py-2 w-36">
                              {readOnly ? (
                                <span className="font-mono font-semibold text-foreground">
                                  {p.price !== undefined && p.price !== null
                                    ? `₹${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : "—"}
                                </span>
                              ) : (
                                <Input
                                  type="number"
                                  min={0}
                                  step="0.01"
                                  placeholder="Enter vendor price"
                                  value={p.price === undefined ? "" : p.price}
                                  onChange={(e) => {
                                    const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                    updateProductRow(p.id, { price: isNaN(val as any) ? undefined : val });
                                  }}
                                  className={cn("h-8 text-xs font-mono", isPriceInvalid && "border-red-400 focus-visible:ring-red-300")}
                                />
                              )}
                            </td>

                            {/* Actions */}
                            {!readOnly && (
                              <td className="w-12 px-3 py-2 text-center">
                                <button
                                  type="button"
                                  className="p-1.5 rounded-md hover:bg-red-50 text-red-600"
                                  onClick={() => removeProductRow(p.id)}
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </td>
                            )}
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {tab === "documents" && (
          <div className="w-full space-y-4">
            <section>
              <SectionDivider title="Documents" />
              <div className="overflow-x-auto border rounded-lg border-border/50">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="text-left border-b bg-muted/25 border-border/50 text-muted-foreground">
                      <th className="px-3 py-2 font-medium">Document Name</th>
                      <th className="px-3 py-2 font-medium">Upload File</th>
                      <th className="w-36 px-3 py-2 text-right" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.documents.map((doc) => (
                      <DocRow
                        key={doc.uid}
                        doc={doc}
                        readOnly={readOnly}
                        fileRef={(el) => { fileRefs.current[doc.uid] = el; }}
                        onNameChange={(patch) => updateDocument(doc.uid, patch)}
                        onUpload={(file) => uploadDoc(doc.uid, file)}
                        onDelete={() => removeDocumentRow(doc.uid)}
                        onPickFile={() => {
                          fileRefs.current[doc.uid]?.click();
                        }}
                        onOpenFile={() => openFile(doc.fileUrl)}
                        canReupload={!!doc.fileName || !!doc.fileUrl || !!doc.uploaded}
                      />
                    ))}
                  </tbody>
                </table>
              </div>
              {!readOnly && (
                <Button type="button" variant="outline" size="sm" className="h-8 text-xs mt-2.5 border-dashed" onClick={addDocumentRow}>
                  <Plus className="w-3.5 h-3.5 mr-1" /> Add Document Row
                </Button>
              )}
            </section>

            <section>
              <SectionDivider title="Remarks" />
              <Textarea
                disabled={readOnly}
                value={form.remarks}
                onChange={(e) => set("remarks", e.target.value)}
                placeholder="Internal notes about this vendor…"
                className="min-h-[80px] text-sm resize-none rounded-lg border-border/70"
              />
            </section>
          </div>
        )}
      </div>
      {toast && <Toast msg={toast.msg} type={toast.type} onDismiss={() => setToast(null)} />}
    </div>
  );
}

function DocRow({
  doc,
  readOnly,
  fileRef,
  onNameChange,
  onUpload,
  onDelete,
  onPickFile,
  onOpenFile,
  canReupload,
}: {
  doc: VendorDocument;
  readOnly?: boolean;
  fileRef: (el: HTMLInputElement | null) => void;
  onNameChange: (patch: { documentName: string; documentTypeId?: string }) => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onPickFile: () => void;
  onOpenFile: () => void;
  canReupload: boolean;
}) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/10">
      <td className="px-3 py-2">
        <DocumentNameField
          value={doc.documentName}
          documentTypeId={doc.documentTypeId}
          readOnly={readOnly}
          onChange={onNameChange}
        />
      </td>
      <td className="px-3 py-2">
        <input type="file" className="hidden" ref={fileRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        {doc.fileName ? (
          <button type="button" className="text-brand-600 hover:underline text-left truncate max-w-[220px]" onClick={onOpenFile}>
            {doc.fileName}
          </button>
        ) : readOnly ? (
          <span className="text-muted-foreground">???</span>
        ) : (
          <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] max-w-[180px] truncate" onClick={onPickFile}>
            <Upload className="w-3 h-3 mr-1 shrink-0" />
            Choose File
          </Button>
        )}
      </td>
      <td className="px-3 py-2">
        {!readOnly && (
          <div className="flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" className="h-7 px-2.5 text-[11px]" onClick={onPickFile} disabled={!canReupload}>
              Reupload
            </Button>
            <button type="button" className="p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-30" disabled={!doc.fileName} onClick={onDelete}>
              <Trash2 className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </td>
    </tr>
  );
}
