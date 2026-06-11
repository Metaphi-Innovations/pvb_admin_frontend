"use client";

import React, { useEffect, useMemo, useState, useRef } from "react";
import { AlertCircle, ChevronDown, Check, Eye, Download, Upload, Trash2, Plus, FileText, X, CheckCircle2, XCircle, Pencil, ChevronsUpDown, Search } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { CompactToggle } from "@/app/(app)/masters/vendors/components/CompactToggle";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "./SearchableSelect";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";
import { Button } from "@/components/ui/button";
import {
  type Customer,
  type CustomerStatus,
  type CustomerProductMapping,
  COUNTRY_CODES,
  CUSTOMER_TYPE_OPTIONS,
  PAYMENT_TERMS_OPTIONS,
  getActiveGSTMasters,
  getActiveTDSMasters,
  getActiveGeoStates,
  getDistrictsForState,
  getTerritoriesUnderDistrict,
  getPincodesForTerritory,
  getActiveSalesEmployees,
  todayStr,
  validateGSTIN,
  validateMobile,
  validateEmail,
  validatePincode,
  validateIFSC,
} from "../customer-data";
import { loadGeoNodes } from "../../geography/geo-data";
import { loadCustomerTypes } from "../../customer-types/customer-type-data";
import { loadProducts } from "../../products/product-data";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

export interface BranchAddress {
  address: string;
  city: string;
  state: string;
  pincode: string;
}

export interface BranchDocument {
  documentName: string;
  required: boolean;
  fileName?: string;
  fileUrl?: string;
  file?: File;
}

export interface CustomerBranch {
  branchName: string;
  isMain?: boolean;
  billingAddress: BranchAddress;
  shippingAddress: BranchAddress;
  documents: BranchDocument[];
}

export function getDocumentsForCustomerType(customerType: string): BranchDocument[] {
  const typeLower = (customerType || "").toLowerCase();
  
  if (typeLower === "individual" || typeLower === "farmer") {
    return [
      { documentName: "PAN Card", required: true },
      { documentName: "Aadhaar Card", required: true },
      { documentName: "Address Proof", required: true },
    ];
  }
  
  if (typeLower === "dealer") {
    return [
      { documentName: "GST Certificate", required: true },
      { documentName: "PAN Card", required: true },
      { documentName: "Trade License", required: true },
      { documentName: "Address Proof", required: true },
    ];
  }
  
  // For Company, Distributor, Retailer, CBBO, FPO, C&F etc.
  return [
    { documentName: "GST Certificate", required: true },
    { documentName: "PAN Card", required: true },
    { documentName: "Incorporation Certificate", required: true },
    { documentName: "Address Proof", required: true },
  ];
}

export interface CustomerFormValues {
  customerName: string;
  countryCode: string;
  mobile: string;
  email: string;
  customerType: string;
  status: CustomerStatus;
  blockReason: string;
  gstApplicable: boolean;
  gstin: string;
  gstMasterId: string;
  tdsApplicable: boolean;
  tdsMasterId: string;
  tan: string;
  cibRegn: string;
  fcoRegn: string;
  fssai: string;
  address: string;
  stateId: string;
  districtId: string;
  territoryId: string;
  pincode: string;
  salesManId: string;
  creditLimit: string;
  interestRate: string;
  paymentTerms: string;
  bankName: string;
  bankBranchAddress: string;
  bankAccountNo: string;
  ifscCode: string;
  
  // New aligned bank fields
  accountHolderName: string;
  branch: string;
  accountNumber: string;
  confirmAccountNumber: string;
  swiftCode: string;
  requiredDocuments: {
    documentTypeId: string;
    documentName: string;
    required: true;
    fileName?: string;
    fileUrl?: string;
    file?: File;
  }[];
  additionalDocuments: {
    id: string;
    title: string;
    fileName?: string;
    fileUrl?: string;
    file?: File;
  }[];
  
  // NEW FIELDS
  customerProducts: CustomerProductMapping[];
  branches: CustomerBranch[];
}

export const DEFAULT_CUSTOMER_FORM: CustomerFormValues = {
  customerName: "",
  countryCode: "+91",
  mobile: "",
  email: "",
  customerType: "",
  status: "draft",
  blockReason: "",
  gstApplicable: false,
  gstin: "",
  gstMasterId: "",
  tdsApplicable: false,
  tdsMasterId: "",
  tan: "",
  cibRegn: "",
  fcoRegn: "",
  fssai: "",
  address: "",
  stateId: "",
  districtId: "",
  territoryId: "",
  pincode: "",
  salesManId: "",
  creditLimit: "",
  interestRate: "",
  paymentTerms: "net-30",
  bankName: "",
  bankBranchAddress: "",
  bankAccountNo: "",
  ifscCode: "",
  accountHolderName: "",
  branch: "",
  accountNumber: "",
  confirmAccountNumber: "",
  swiftCode: "",
  requiredDocuments: [],
  additionalDocuments: [],
  
  // NEW FIELDS
  customerProducts: [],
  branches: [
    {
      branchName: "Main Branch",
      isMain: true,
      billingAddress: { address: "", city: "", state: "", pincode: "" },
      shippingAddress: { address: "", city: "", state: "", pincode: "" },
      documents: [],
    }
  ]
};

export function customerToFormValues(c: Customer): CustomerFormValues {
  return {
    customerName: c.customerName,
    countryCode: c.countryCode || "+91",
    mobile: c.mobile,
    email: c.email,
    customerType: c.customerType,
    status: c.status,
    blockReason: c.blockReason ?? "",
    gstApplicable: c.gstApplicable,
    gstin: c.gstin,
    gstMasterId: c.gstMasterId != null ? String(c.gstMasterId) : "",
    tdsApplicable: c.tdsApplicable,
    tdsMasterId: c.tdsMasterId != null ? String(c.tdsMasterId) : "",
    tan: c.tan,
    cibRegn: c.cibRegn,
    fcoRegn: c.fcoRegn,
    fssai: c.fssai,
    address: c.address || "",
    stateId: c.stateId != null ? String(c.stateId) : "",
    districtId: c.districtId != null ? String(c.districtId) : "",
    territoryId: c.territoryId != null ? String(c.territoryId) : "",
    pincode: c.pincode || "",
    salesManId: c.salesManId != null ? String(c.salesManId) : "",
    creditLimit: c.creditLimit ? String(c.creditLimit) : "",
    interestRate: c.interestRate ? String(c.interestRate) : "",
    paymentTerms: c.paymentTerms,
    bankName: c.bankName,
    bankBranchAddress: c.bankBranchAddress,
    bankAccountNo: c.bankAccountNo,
    ifscCode: c.ifscCode,
    accountHolderName: c.accountHolderName || "",
    branch: c.branch || c.bankBranchAddress || "",
    accountNumber: c.bankAccountNo || "",
    confirmAccountNumber: c.bankAccountNo || "",
    swiftCode: c.swiftCode || "",
    requiredDocuments: c.documents?.requiredDocuments || [],
    additionalDocuments: c.documents?.additionalDocuments || [],
    
    // Fallback mapping for existing customer structure
    customerProducts: (c as any).customerProducts || (c as any).products || [],
    branches: ((c as any).branches || [
      {
        branchName: "Main Branch",
        isMain: true,
        billingAddress: {
          address: c.address || "",
          city: c.districtName || "",
          state: c.stateName || "",
          pincode: c.pincode || ""
        },
        shippingAddress: {
          address: c.address || "",
          city: c.districtName || "",
          state: c.stateName || "",
          pincode: c.pincode || ""
        },
        documents: getDocumentsForCustomerType(c.customerType).map(doc => {
          const existingDoc = c.documents?.requiredDocuments?.find(
            rd => rd.documentName.toLowerCase() === doc.documentName.toLowerCase()
          );
          return {
            ...doc,
            fileName: existingDoc?.fileName,
            fileUrl: existingDoc?.fileUrl
          };
        })
      }
    ]).map((b: any, idx: number, arr: any[]) => {
      const hasMain = arr.some(x => x.isMain);
      const isThisMain = hasMain ? !!b.isMain : (b.branchName === "Main Branch" || idx === 0);
      return {
        ...b,
        isMain: isThisMain
      };
    })
  };
}

interface ToastState {
  msg: string;
  type: "success" | "error";
}

function LocalToast({ toast, onDismiss }: { toast: ToastState; onDismiss: () => void }) {
  return (
    <div
      className={cn(
        "fixed top-5 right-5 z-[100] flex items-center gap-2.5 px-4 py-3 rounded-xl shadow-xl text-white text-sm font-medium",
        "animate-in slide-in-from-top-2 fade-in-0 duration-300",
        toast.type === "success" ? "bg-emerald-600" : "bg-red-600",
      )}
    >
      {toast.type === "success" ? (
        <CheckCircle2 className="flex-shrink-0 w-4 h-4" />
      ) : (
        <XCircle className="flex-shrink-0 w-4 h-4" />
      )}
      {toast.msg}
      <button onClick={onDismiss} className="ml-1 opacity-70 hover:opacity-100">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

function FieldError({ msg }: { msg?: string }) {
  if (!msg) return null;
  return (
    <p className="flex items-center gap-1 mt-1 text-[11px] text-red-500">
      <AlertCircle className="flex-shrink-0 w-3 h-3" />
      {msg}
    </p>
  );
}

const YES_NO_OPTIONS = [
  { value: "yes", label: "Yes" },
  { value: "no", label: "No" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "draft", label: "Draft" },
  { value: "blocked", label: "Blocked" },
];

function SectionHead({ label, sub }: { label: string; sub?: string }) {
  return (
    <div className="mb-2.5 mt-0.5">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{label}</p>
      {sub && <p className="text-[11px] text-muted-foreground mt-0.5">{sub}</p>}
    </div>
  );
}

function CountryCodePicker({
  value,
  onChange,
  disabled,
  hasError,
}: {
  value: string;
  onChange: (v: string) => void;
  disabled?: boolean;
  hasError?: boolean;
}) {
  const [open, setOpen] = useState(false);
  return (
    <Popover open={open && !disabled} onOpenChange={setOpen}>
      <PopoverTrigger asChild disabled={disabled}>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "h-8 px-2 text-xs border border-border rounded-lg bg-background flex items-center gap-1 hover:bg-muted/30 transition-colors flex-shrink-0",
            hasError && "border-red-400",
            disabled && "opacity-50 cursor-not-allowed bg-muted/30"
          )}
        >
          <span className="font-medium text-foreground">{value}</span>
          <ChevronDown className="w-3 h-3 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className="p-1 w-52">
        {COUNTRY_CODES.map((cc) => (
          <button
            key={cc.code}
            type="button"
            onClick={() => {
              onChange(cc.code);
              setOpen(false);
            }}
            className={cn(
              "w-full text-left px-2.5 py-1.5 text-xs rounded hover:bg-muted/60 transition-colors flex items-center justify-between",
              value === cc.code && "bg-brand-50 text-brand-700"
            )}
          >
            {cc.label}
            {value === cc.code && <Check className="w-3 h-3 text-brand-600" />}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

interface ProductCatalogItem {
  productId: string;
  productName: string;
  sku: string;
  category?: string;
  unit?: string;
  packSize?: string;
  hsnCode?: string;
  gstRate?: string;
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
    label: `${p.sku} - ${p.productName}`,
    sublabel: [
      p.category ? `Category: ${p.category}` : "",
      p.unit ? `Unit: ${p.unit}` : "",
      p.packSize ? `Pack Size: ${p.packSize}` : "",
      p.hsnCode ? `HSN: ${p.hsnCode}` : "",
      p.gstRate ? `GST: ${p.gstRate}` : "",
    ].filter(Boolean).join(" | "),
    trailing: <span className="text-[10px] text-muted-foreground">MRP: ?{p.mrp}</span>,
  }));

  return (
    <AutocompleteSelect
      options={options}
      value={value}
      onChange={(val) => {
        const prod = products.find((p) => p.productId === val);
        if (prod) onSelect(prod);
      }}
      placeholder="Select product by name, SKU, or code"
      searchPlaceholder="Search product..."
      disabled={disabled}
      className="h-8 text-xs font-normal"
      renderTriggerLabel={(selectedOpt) => {
        const option = Array.isArray(selectedOpt) ? selectedOpt[0] : selectedOpt;
        if (!option) return "Select product by name, SKU, or code";
        const prod = products.find((p) => p.productId === option.value);
        const meta = prod
          ? [
              prod.category ? `Category: ${prod.category}` : "",
              prod.unit ? `Unit: ${prod.unit}` : "",
              prod.packSize ? `Pack Size: ${prod.packSize}` : "",
              prod.hsnCode ? `HSN: ${prod.hsnCode}` : "",
              prod.gstRate ? `GST: ${prod.gstRate}` : "",
            ].filter(Boolean).join(" | ")
          : "";
        return (
          <span className="flex items-center min-w-0 gap-2">
            <span className="truncate text-foreground">{option.label}</span>
            {meta && <span className="truncate text-[10px] text-muted-foreground">{meta}</span>}
          </span>
        );
      }}
    />
  );
}
interface CustomerFormProps {
  form: CustomerFormValues;
  onChange: (form: CustomerFormValues) => void;
  errors: Record<string, string>;
  onSetErrors?: React.Dispatch<React.SetStateAction<Record<string, string>>>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
  isAdd?: boolean;
}

export function CustomerForm({ form, onChange, errors, onSetErrors, onClearError, readOnly, isAdd }: CustomerFormProps) {
  const [geoNodes] = useState(() => (typeof window !== "undefined" ? loadGeoNodes() : []));

  const [expandedBranches, setExpandedBranches] = useState<Record<number, boolean>>({ 0: true });
  const [expandedChecklists, setExpandedChecklists] = useState<Record<number, boolean>>({});

  const [toastState, setToastState] = useState<ToastState | null>(null);
  const showToast = (msg: string, type: "success" | "error") => {
    setToastState({ msg, type });
    setTimeout(() => setToastState(null), 3200);
  };

  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName: string } | null>(null);

  // States for adding additional documents
  const [activeBranchUpload, setActiveBranchUpload] = useState<{ branchIndex: number; docIndex: number } | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const triggerBranchUpload = (branchIndex: number, docIndex: number) => {
    setActiveBranchUpload({ branchIndex, docIndex });
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
      fileInputRef.current.click();
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileUrl = URL.createObjectURL(file);
    const fileName = file.name;

    if (activeBranchUpload) {
      const { branchIndex, docIndex } = activeBranchUpload;
      const updatedBranches = [...form.branches];
      updatedBranches[branchIndex] = {
        ...updatedBranches[branchIndex],
        documents: updatedBranches[branchIndex].documents.map((doc, idx) => {
          if (idx === docIndex) {
            return {
              ...doc,
              fileName,
              fileUrl,
              file,
            };
          }
          return doc;
        }),
      };
      onChange({ ...form, branches: updatedBranches });
      showToast("Document uploaded successfully.", "success");
      setActiveBranchUpload(null);
    }
  };

  const customerTypes = useMemo(() => loadCustomerTypes(), []);
  const customerTypeOptions = useMemo(() => {
    return customerTypes.map((ct) => ({
      value: ct.customerType.toLowerCase(),
      label: ct.customerType,
    }));
  }, [customerTypes]);

  const set = <K extends keyof CustomerFormValues>(key: K, value: CustomerFormValues[K]) => {
    onChange({ ...form, [key]: value });
    onClearError(key);
  };

  const gstMasters = useMemo(() => getActiveGSTMasters(), []);
  const tdsMasters = useMemo(() => getActiveTDSMasters(), []);
  const states = useMemo(() => getActiveGeoStates(geoNodes), [geoNodes]);

  const districts = useMemo(() => {
    if (!form.stateId) return [];
    return getDistrictsForState(Number(form.stateId), geoNodes);
  }, [form.stateId, geoNodes]);

  const territories = useMemo(() => {
    if (!form.districtId) return [];
    return getTerritoriesUnderDistrict(Number(form.districtId), geoNodes);
  }, [form.districtId, geoNodes]);

  const pincodeOptions = useMemo(() => {
    if (!form.territoryId) return [];
    return getPincodesForTerritory(Number(form.territoryId), geoNodes);
  }, [form.territoryId, geoNodes]);

  const salesOptions = useMemo(() => {
    return getActiveSalesEmployees().map((e) => ({
      value: String(e.id),
      label: e.fullName || `${e.firstName} ${e.lastName}`.trim(),
      sublabel: [e.employeeId, e.mobile, e.role, e.territory].filter(Boolean).join(" - "),
    }));
  }, []);

  const activeProducts = useMemo(() => loadProducts().filter(p => p.status === "active"), []);
  const productOptions = useMemo(() => {
    return activeProducts.map(p => ({
      value: p.productId,
      label: `${p.productId} - ${p.productName}`
    }));
  }, [activeProducts]);

  useEffect(() => {
    if (form.districtId && !districts.some((d) => String(d.id) === form.districtId)) {
      onChange({ ...form, districtId: "", territoryId: "", pincode: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.stateId]);

  useEffect(() => {
    if (form.territoryId && !territories.some((t) => String(t.id) === form.territoryId)) {
      onChange({ ...form, territoryId: "", pincode: "" });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.districtId]);

  const setProductFieldError = (index: number, msg: string) => {
    onSetErrors?.((prev) => ({
      ...prev,
      [`product_${index}_id`]: msg,
    }));
  };

  const clearProductFieldError = (index: number) => {
    onSetErrors?.((prev) => {
      const next = { ...prev };
      delete next[`product_${index}_id`];
      return next;
    });
  };

  const addProductRow = () => {
    const incompleteIndex = (form.customerProducts || []).findIndex(
      (product) => !product.productId || !product.productName?.trim()
    );

    if (incompleteIndex !== -1) {
      setProductFieldError(incompleteIndex, "Product is required.");
      showToast("Please select a product before adding.", "error");
      return;
    }

    const newId = `cp-${Math.random().toString(36).substring(2, 9)}`;
    const newRow = {
      id: newId,
      productId: "",
      productName: "",
      mrp: 0,
      price: undefined,
      status: "Active" as const,
    };
    onChange({
      ...form,
      customerProducts: [...(form.customerProducts || []), newRow],
    });
  };

  const updateProductRow = (id: string, patch: Partial<CustomerProductMapping>) => {
    const updated = (form.customerProducts || []).map(p => {
      if (p.id !== id) return p;
      return { ...p, ...patch };
    });
    const rowIndex = updated.findIndex((product) => product.id === id);
    if (rowIndex !== -1 && updated[rowIndex].productId && updated[rowIndex].productName?.trim()) {
      clearProductFieldError(rowIndex);
    }
    onChange({ ...form, customerProducts: updated });
  };

  const removeProductRow = (id: string) => {
    const updated = (form.customerProducts || []).filter(p => p.id !== id);
    onChange({ ...form, customerProducts: updated });
  };

  const setBranchAsMain = (bIdx: number) => {
    const updated = form.branches.map((b, idx) => ({
      ...b,
      isMain: idx === bIdx
    }));
    onChange({ ...form, branches: updated });
  };

  const inputCls = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");
  const textareaCls = (key?: string) => cn("text-xs resize-none", key && errors[key] && "border-red-400");
  const vendorFieldClass = (key: string) => cn(
    "h-9 text-sm border-border/70 rounded-lg bg-white shadow-none focus-visible:ring-1 focus-visible:ring-brand-500/30 placeholder:text-muted-foreground/50",
    errors[key] && "border-red-400 focus-visible:ring-red-300"
  );

  return (
    <div className="w-full">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="w-full mb-4">
          <TabsTrigger value="basic" className="text-xs">Basic Details</TabsTrigger>
          <TabsTrigger value="branch" className="text-xs">Branch</TabsTrigger>
          <TabsTrigger value="commercial" className="text-xs">Bank & Commercial</TabsTrigger>
          <TabsTrigger value="product" className="text-xs">Product</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: BASIC DETAILS ── */}
        <TabsContent value="basic" className="mt-0 space-y-5">
          <div className="space-y-6">
            <div>
              <SectionHead label="Basic Information" />
              <div className="grid items-start grid-cols-12 gap-3">
                {/* Customer Name */}
                <div className="col-span-12 space-y-1 md:col-span-3">
                  <Label className="text-xs font-medium">Customer Name <span className="text-red-500">*</span></Label>
                  <Input
                    value={form.customerName}
                    onChange={(e) => set("customerName", e.target.value)}
                    placeholder="e.g. Agro Solutions Pvt Ltd"
                    className={inputCls("customerName")}
                    disabled={readOnly}
                  />
                  <FieldError msg={errors.customerName} />
                </div>

                {/* Mobile Number */}
                <div className="col-span-12 space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium">Mobile Number <span className="text-red-500">*</span></Label>
                  <div className="flex gap-1.5">
                    <CountryCodePicker
                      value={form.countryCode}
                      onChange={(value) => set("countryCode", value)}
                      disabled={readOnly}
                      hasError={!!errors.mobile}
                    />
                    <Input
                      value={form.mobile}
                      onChange={(e) => set("mobile", e.target.value.replace(/\D/g, "").slice(0, 10))}
                      placeholder="10-digit mobile"
                      className={cn("flex-1", inputCls("mobile"))}
                      inputMode="numeric"
                      disabled={readOnly}
                    />
                  </div>
                  <FieldError msg={errors.mobile} />
                </div>

                {/* Email Address */}
                <div className="col-span-12 space-y-1 md:col-span-3">
                  <Label className="text-xs font-medium">Email Address</Label>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => set("email", e.target.value)}
                    placeholder="email@company.com"
                    className={inputCls("email")}
                    disabled={readOnly}
                  />
                  <FieldError msg={errors.email} />
                </div>

                {/* Customer Type */}
                <div className="col-span-12 space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium">Customer Type <span className="text-red-500">*</span></Label>
                  <SearchableSelect
                    value={form.customerType}
                    onChange={(value) => {
                      const ct = customerTypes.find(
                        (c) => c.customerType.toLowerCase() === value.toLowerCase()
                      );
                      const docs = ct
                        ? ct.documentTypes.map((d) => ({
                            documentTypeId: d.id,
                            documentName: d.documentName,
                            required: true as const,
                          }))
                        : [];
                      
                      const branchDocs = getDocumentsForCustomerType(value);
                      const updatedBranches = form.branches.map(b => ({
                        ...b,
                        documents: branchDocs.map(d => {
                          const existing = b.documents.find(
                            bd => bd.documentName.toLowerCase() === d.documentName.toLowerCase()
                          );
                          return {
                            ...d,
                            fileName: existing?.fileName,
                            fileUrl: existing?.fileUrl,
                            file: existing?.file
                          };
                        })
                      }));

                      onChange({
                        ...form,
                        customerType: value,
                        requiredDocuments: docs,
                        branches: updatedBranches
                      });
                      onClearError("customerType");
                    }}
                    options={customerTypeOptions}
                    placeholder="Select type..."
                    disabled={readOnly}
                    error={!!errors.customerType}
                  />
                  <FieldError msg={errors.customerType} />
                </div>

                {/* Sales Man */}
                <div className="col-span-12 space-y-1 md:col-span-2">
                  <Label className="text-xs font-medium">Sales Man</Label>
                  <SearchableSelect
                    value={form.salesManId}
                    onChange={(value) => set("salesManId", value)}
                    options={salesOptions}
                    placeholder="Search by name, ID, mobile, role..."
                    searchPlaceholder="Search sales person..."
                    disabled={readOnly}
                  />
                  <p className="mt-0.5 min-h-[16px] text-[11px] text-muted-foreground">Only active users are listed</p>
                </div>

                {/* Block Reason */}
                {form.status === "blocked" && (
                  <div className="col-span-12 space-y-1">
                    <Label className="text-xs font-medium">Block Reason <span className="text-red-500">*</span></Label>
                    <Textarea
                      value={form.blockReason}
                      onChange={(e) => set("blockReason", e.target.value)}
                      rows={2}
                      placeholder="Reason for blocking this customer..."
                      className={textareaCls("blockReason")}
                      disabled={readOnly}
                    />
                    <FieldError msg={errors.blockReason} />
                  </div>
                )}
              </div>
            </div>

            <div className="pt-5 border-t border-border/60">
              <SectionHead label="Tax & Registration" />
              
              

              {/* Row 2+: Registration Fields & Conditional Fields */}
              <div className="grid grid-cols-1 gap-3 md:grid-cols-4">
                {/* CIB Regn # */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">CIB Regn #</Label>
                  <Input
                    value={form.cibRegn}
                    onChange={(e) => set("cibRegn", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                </div>

                {/* FCO Regn # */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">FCO Regn #</Label>
                  <Input
                    value={form.fcoRegn}
                    onChange={(e) => set("fcoRegn", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                </div>

                {/* TAN # */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">TAN #</Label>
                  <Input
                    value={form.tan}
                    onChange={(e) => set("tan", e.target.value)}
                    className={inputCls("tan")}
                    disabled={readOnly}
                  />
                </div>

                {/* FSSAI # */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">FSSAI #</Label>
                  <Input
                    value={form.fssai}
                    onChange={(e) => set("fssai", e.target.value)}
                    disabled={readOnly}
                    className="h-8 text-xs"
                  />
                </div>
                {/* Row 1: Toggle Fields */}
              <div className="grid grid-cols-1 gap-3 mb-4 md:grid-cols-2">
                {/* GST Applicable */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">GST Applicable</Label>
                  <CompactToggle
                    checked={form.gstApplicable}
                    onCheckedChange={(yes) =>
                      onChange({
                        ...form,
                        gstApplicable: yes,
                        gstin: yes ? form.gstin : "",
                        gstMasterId: yes ? form.gstMasterId : "",
                      })
                    }
                    disabled={readOnly}
                    activeLabel="Yes"
                    inactiveLabel="No"
                  />
                </div>

                {/* TDS Applicable */}
                <div className="space-y-1">
                  <Label className="text-xs font-medium">TDS Applicable</Label>
                  <CompactToggle
                    checked={form.tdsApplicable}
                    onCheckedChange={(yes) =>
                      onChange({
                        ...form,
                        tdsApplicable: yes,
                        tdsMasterId: yes ? form.tdsMasterId : "",
                      })
                    }
                    disabled={readOnly}
                    activeLabel="Yes"
                    inactiveLabel="No"
                  />
                </div>
              </div>

                {/* Conditional: GSTIN (when GST Applicable is ON) */}
                {form.gstApplicable && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">GSTIN <span className="text-red-500">*</span></Label>
                    <Input
                      value={form.gstin}
                      onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                      placeholder="27AABCU9603R1ZX"
                      className={cn("font-mono", inputCls("gstin"))}
                      disabled={readOnly}
                    />
                    <FieldError msg={errors.gstin} />
                  </div>
                )}

                {/* Conditional: GST Master (when GST Applicable is ON and not Add mode) */}
                {form.gstApplicable && !isAdd && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">GST % / GST Code</Label>
                    <SearchableSelect
                      value={form.gstMasterId}
                      onChange={(value) => set("gstMasterId", value)}
                      options={gstMasters.map((gst) => ({
                        value: String(gst.id),
                        label: `${gst.gstId} - ${gst.gstPercentage}%`,
                        sublabel: gst.remarks,
                      }))}
                      placeholder="Select from GST Master..."
                      searchPlaceholder="Search GST code..."
                      disabled={readOnly || !form.gstApplicable}
                      error={!!errors.gstMasterId}
                    />
                    <FieldError msg={errors.gstMasterId} />
                  </div>
                )}

                {/* Conditional: TDS Master (when TDS Applicable is ON) */}
                {form.tdsApplicable && (
                  <div className="space-y-1">
                    <Label className="text-xs font-medium">TDS % / TDS Section</Label>
                    <SearchableSelect
                      value={form.tdsMasterId}
                      onChange={(value) => set("tdsMasterId", value)}
                      options={tdsMasters.map((tds) => ({
                        value: String(tds.id),
                        label: `${tds.tdsCode} - ${tds.tdsRate}%`,
                        sublabel: tds.remarks,
                      }))}
                      placeholder="Select from TDS Master..."
                      disabled={readOnly}
                      error={!!errors.tdsMasterId}
                    />
                    <FieldError msg={errors.tdsMasterId} />
                  </div>
                )}
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 3: BANK & COMMERCIAL ── */}
        <TabsContent value="commercial" className="mt-0 space-y-5">
          <div>
            <SectionHead label="Bank & Commercial" />
            <div className="grid grid-cols-4 gap-3">
              {/* Credit Limit */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Credit Limit</Label>
                <Input
                  type="number"
                  min={0}
                  step="0.01"
                  value={form.creditLimit}
                  onChange={(e) => set("creditLimit", e.target.value)}
                  placeholder="0.00"
                  className={inputCls("creditLimit")}
                  disabled={readOnly}
                />
                <FieldError msg={errors.creditLimit} />
              </div>

              {/* Interest Rate */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Interest Rate (%)</Label>
                <Input
                  type="number"
                  min={0}
                  max={100}
                  step="0.01"
                  value={form.interestRate}
                  onChange={(e) => set("interestRate", e.target.value)}
                  placeholder="0.00"
                  className={inputCls("interestRate")}
                  disabled={readOnly}
                />
                <FieldError msg={errors.interestRate} />
              </div>

              {/* Payment Terms */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Payment Terms</Label>
                <SearchableSelect
                  value={form.paymentTerms}
                  onChange={(value) => set("paymentTerms", value)}
                  options={PAYMENT_TERMS_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  placeholder="Select payment terms..."
                  disabled={readOnly}
                />
              </div>
            </div>

            {/* Bank Details Grid */}
            <div className="grid grid-cols-1 pt-4 mt-4 border-t md:grid-cols-2 gap-x-3 gap-y-3 border-border/60">
              {/* Account Holder Name */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Account Holder Name</Label>
                <Input
                  disabled={readOnly}
                  value={form.accountHolderName}
                  onChange={(e) => set("accountHolderName", e.target.value)}
                  className={vendorFieldClass("accountHolderName")}
                />
                <FieldError msg={errors.accountHolderName} />
              </div>

              {/* Bank Name */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Bank Name</Label>
                <Input
                  disabled={readOnly}
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  className={vendorFieldClass("bankName")}
                />
                <FieldError msg={errors.bankName} />
              </div>

              {/* Branch Name */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Branch Name</Label>
                <Input
                  disabled={readOnly}
                  value={form.branch}
                  onChange={(e) => set("branch", e.target.value)}
                  className={vendorFieldClass("branch")}
                />
                <FieldError msg={errors.branch} />
              </div>

              {/* Account Number */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Account Number</Label>
                <Input
                  disabled={readOnly}
                  value={form.accountNumber}
                  onChange={(e) => set("accountNumber", e.target.value)}
                  className={cn(vendorFieldClass("accountNumber"), "font-mono")}
                />
                <FieldError msg={errors.accountNumber} />
              </div>

              {/* Confirm Account Number */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">Confirm Account Number</Label>
                <Input
                  disabled={readOnly}
                  value={form.confirmAccountNumber}
                  onChange={(e) => set("confirmAccountNumber", e.target.value)}
                  className={cn(vendorFieldClass("confirmAccountNumber"), "font-mono")}
                />
                <FieldError msg={errors.confirmAccountNumber} />
              </div>

              {/* IFSC Code */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">IFSC Code</Label>
                <Input
                  disabled={readOnly}
                  value={form.ifscCode}
                  onChange={(e) => set("ifscCode", e.target.value.toUpperCase())}
                  className={cn(vendorFieldClass("ifscCode"), "font-mono uppercase")}
                />
                <FieldError msg={errors.ifscCode} />
              </div>

              {/* SWIFT Code */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-foreground">SWIFT Code</Label>
                <Input
                  disabled={readOnly}
                  value={form.swiftCode}
                  onChange={(e) => set("swiftCode", e.target.value)}
                  className={vendorFieldClass("swiftCode")}
                  placeholder="Optional"
                />
                <FieldError msg={errors.swiftCode} />
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 4: PRODUCT MAPPING ── */}
        <TabsContent value="product" className="mt-0 space-y-5">
          <div>
            <div className="flex items-center justify-between pb-3 mb-4 border-b border-border/60">
            <div>
              {/* <SectionHead label="Product Mappings" sub="Map products and custom prices for this customer" /> */}
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  className="gap-1 text-xs h-7"
                  onClick={addProductRow}
                >
                  <Plus className="w-3 h-3" /> Add Product
                </Button>
              )}
            </div>

            {!form.customerProducts || form.customerProducts.length === 0 ? (
              <div className="py-6 text-center border border-dashed rounded-lg border-border">
                <p className="text-xs text-muted-foreground">No products — click Add Product</p>
              </div>
            ) : (
              <div className="overflow-hidden bg-white border shadow-sm border-border rounded-xl">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead>
                      <tr className="border-b bg-muted/40 border-border">
                        {[
                          { h: "Product", className: "" },
                          { h: "MRP", className: "w-36" },
                          { h: "Price", className: "w-36" },
                          ...(!readOnly ? [{ h: "", className: "w-12" }] : []),
                        ].map(({ h, className }) => (
                          <th
                            key={h || "actions"}
                            className={cn(
                              "px-2 py-2 text-left text-xs font-semibold text-foreground whitespace-nowrap",
                              className
                            )}
                          >
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {form.customerProducts.map((p, idx) => {
                        const hasProductError = !!errors[`product_${idx}_id`];
                        const hasPriceError = !!errors[`product_${idx}_price`];

                        return (
                          <tr key={p.id} className="border-b border-border/60 hover:bg-muted/10">
                            {/* Product */}
                            <td className="px-2 py-1.5 min-w-[240px]">
                              {readOnly ? (
                                <span className="text-xs font-medium text-foreground">
                                  {p.productName ? `${p.sku || "—"} — ${p.productName}` : "—"}
                                </span>
                              ) : (
                                <>
                                  <ProductSelect
                                    products={activeProducts}
                                    value={p.productId}
                                    onSelect={(prod) => {
                                      // Avoid duplicate product mapping
                                      const isDuplicate = form.customerProducts.some(
                                        (item) => item.productId === prod.productId && item.id !== p.id
                                      );
                                      if (isDuplicate) {
                                        showToast(`${prod.productName} is already mapped.`, "error");
                                        return;
                                      }
                                      updateProductRow(p.id, {
                                        productId: prod.productId,
                                        productName: prod.productName,
                                        sku: prod.sku,
                                        mrp: prod.mrp,
                                      });
                                      clearProductFieldError(idx);
                                    }}
                                  />
                                  {hasProductError && (
                                    <p className="text-[10px] text-red-500 mt-0.5">{errors[`product_${idx}_id`]}</p>
                                  )}
                                </>
                              )}
                            </td>

                            {/* MRP */}
                            <td className="px-2 py-1.5 w-36">
                              {readOnly ? (
                                <span className="text-xs text-muted-foreground whitespace-nowrap">
                                  {p.mrp !== undefined && p.mrp !== null
                                    ? `₹${p.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : "—"}
                                </span>
                              ) : (
                                <Input
                                  type="text"
                                  value={
                                    p.mrp !== undefined && p.mrp !== null
                                      ? `₹${p.mrp.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                      : "—"
                                  }
                                  readOnly
                                  className="text-xs cursor-not-allowed pointer-events-none select-none h-7 bg-muted/40 text-muted-foreground border-border"
                                />
                              )}
                            </td>

                            {/* Price */}
                            <td className="px-2 py-1.5 w-36">
                              {readOnly ? (
                                <span className="text-xs font-semibold text-foreground whitespace-nowrap">
                                  {p.price !== undefined && p.price !== null
                                    ? `₹${p.price.toLocaleString(undefined, { minimumFractionDigits: 2 })}`
                                    : "—"}
                                </span>
                              ) : (
                                <div className="space-y-1">
                                  <Input
                                    type="number"
                                    min={0}
                                    step="0.01"
                                    placeholder="0.00"
                                    value={p.price === undefined ? "" : p.price}
                                    onChange={(e) => {
                                      const val = e.target.value === "" ? undefined : parseFloat(e.target.value);
                                      updateProductRow(p.id, { price: isNaN(val as any) ? undefined : val });
                                    }}
                                    className={cn("h-7 text-xs", hasPriceError && "border-red-400 focus-visible:ring-red-300")}
                                  />
                                  {hasPriceError && (
                                    <p className="text-[10px] text-red-500 mt-0.5">{errors[`product_${idx}_price`]}</p>
                                  )}
                                </div>
                              )}
                            </td>

                            {/* Actions */}
                            {!readOnly && (
                              <td className="px-2 py-1.5 w-12">
                                <div className="flex items-center gap-0.5 justify-end">
                                  <button
                                    type="button"
                                    onClick={() => removeProductRow(p.id)}
                                    className="p-1.5 hover:bg-red-50 rounded-md transition-colors"
                                    title="Remove row"
                                  >
                                    <Trash2 className="w-3.5 h-3.5 text-red-500" />
                                  </button>
                                </div>
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
        </TabsContent>

        {/* ── TAB 5: BRANCH MAPPING & DOCUMENTS ── */}
        <TabsContent value="branch" className="mt-0 space-y-3">
          <div>
            <div className="flex items-center justify-between mb-3">
              <div>
                {/* <SectionHead label="Branch Details" sub="Manage customer branches and document checklists" /> */}
              </div>
              {!readOnly && (
                <Button
                  type="button"
                  size="sm"
                  className="h-8 text-xs gap-1.5 px-3 bg-brand-600 text-white hover:bg-brand-700"
                  onClick={() => {
                    const newIdx = form.branches.length;
                    onChange({
                      ...form,
                      branches: [
                        ...form.branches,
                        {
                          branchName: `Branch #${newIdx + 1}`,
                          billingAddress: { address: "", city: "", state: "", pincode: "" },
                          shippingAddress: { address: "", city: "", state: "", pincode: "" },
                          documents: getDocumentsForCustomerType(form.customerType)
                        }
                      ]
                    });
                    setExpandedBranches(prev => ({ ...prev, [newIdx]: true }));
                  }}
                >
                  <Plus className="w-3.5 h-3.5" /> Add Branch
                </Button>
              )}
            </div>

            {errors.branches && (
              <div className="flex items-center gap-1.5 text-xs text-red-500 bg-red-50 p-2.5 rounded-lg border border-red-100 mb-4">
                <AlertCircle className="flex-shrink-0 w-4 h-4" />
                <span>{errors.branches}</span>
              </div>
            )}

            <div className="space-y-4">
              {form.branches.map((branch, bIdx) => {
                const isMain = !!branch.isMain;
                const isExpanded = !!expandedBranches[bIdx];

                return (
                  <div key={bIdx} className="overflow-hidden bg-white border shadow-sm border-border rounded-xl">
                    {/* Header Small Card */}
                    <div
                      onClick={() => {
                        setExpandedBranches(prev => ({ ...prev, [bIdx]: !prev[bIdx] }));
                      }}
                      className={cn(
                        "flex items-center justify-between gap-3 px-5 py-3 cursor-pointer hover:bg-muted/10 transition-colors select-none",
                        isExpanded ? "border-b border-border bg-muted/5" : ""
                      )}
                    >
                      <div className="flex items-center flex-1 min-w-0 gap-3">
                        <span className="text-xs font-bold text-brand-600 bg-brand-50 px-2 py-0.5 rounded-lg shrink-0">
                          #{bIdx + 1}
                        </span>
                        
                        {readOnly ? (
                          <span className="text-xs font-semibold truncate text-foreground">
                            {branch.branchName}
                          </span>
                        ) : (
                          <div className="flex items-center flex-1 max-w-sm gap-2">
                            <Input
                              value={branch.branchName}
                              onChange={(e) => {
                                const updated = [...form.branches];
                                updated[bIdx] = { ...updated[bIdx], branchName: e.target.value };
                                onChange({ ...form, branches: updated });
                              }}
                              readOnly={readOnly}
                              placeholder="e.g. Warehouse, Office, Retail Outlet..."
                              className={cn("h-8 text-xs font-semibold w-full bg-background", readOnly && "cursor-default")}
                              onClick={(e) => {
                                setExpandedBranches(prev => ({ ...prev, [bIdx]: true }));
                                e.stopPropagation();
                              }}
                            />
                          </div>
                        )}
                        
                        {isMain && (
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-700 bg-emerald-50 border border-emerald-200/50 px-2 py-0.5 rounded-md shrink-0">
                            Main Branch
                          </span>
                        )}
                      </div>
                      
                      <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                        {!isMain && !readOnly && (
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            className="h-7 text-[10px] font-medium text-brand-600 hover:text-brand-700 hover:bg-brand-50 border-brand-100 px-2.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              setBranchAsMain(bIdx);
                            }}
                          >
                            Set as Main
                          </Button>
                        )}
                        {!isMain && !readOnly && (
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const updated = form.branches.filter((_, i) => i !== bIdx);
                              onChange({ ...form, branches: updated });
                            }}
                            className="p-1.5 hover:bg-red-50 rounded-md transition-colors text-red-500"
                            title="Remove Branch"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                        <div
                          className="p-1.5 hover:bg-muted rounded transition-colors"
                          onClick={(e) => {
                            e.stopPropagation();
                            setExpandedBranches(prev => ({ ...prev, [bIdx]: !prev[bIdx] }));
                          }}
                        >
                          <ChevronDown className={cn("w-4 h-4 text-muted-foreground transition-transform duration-200", isExpanded && "rotate-180")} />
                        </div>
                      </div>
                    </div>

                    {/* Collapsible Details */}
                    {isExpanded && (
                      <div className="p-5 space-y-5 duration-200 animate-in fade-in-50">
                        {/* Address Grid */}
                        <div className="grid grid-cols-2 gap-6">
                          {/* Billing Address block */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Billing Address</span>
                            </div>
                            
                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-foreground">Address <span className="text-red-500">*</span></Label>
                                <Textarea
                                  value={branch.billingAddress.address}
                                  onChange={(e) => {
                                    const updated = [...form.branches];
                                    updated[bIdx].billingAddress.address = e.target.value;
                                    onChange({ ...form, branches: updated });
                                  }}
                                  rows={2}
                                  placeholder="Street, area, landmark..."
                                  className={cn("text-xs resize-none bg-background", isMain && errors.mainBranchBillingAddress && "border-red-400")}
                                  disabled={readOnly}
                                />
                                {isMain && errors.mainBranchBillingAddress && (
                                  <FieldError msg={errors.mainBranchBillingAddress} />
                                )}
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">State <span className="text-red-500">*</span></Label>
                                  <Input
                                    value={branch.billingAddress.state}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].billingAddress.state = e.target.value;
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="State"
                                    className={cn("h-8 text-xs bg-background", isMain && errors.mainBranchBillingState && "border-red-400")}
                                    disabled={readOnly}
                                  />
                                  {isMain && errors.mainBranchBillingState && (
                                    <FieldError msg={errors.mainBranchBillingState} />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">City <span className="text-red-500">*</span></Label>
                                  <Input
                                    value={branch.billingAddress.city}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].billingAddress.city = e.target.value;
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="City"
                                    className={cn("h-8 text-xs bg-background", isMain && errors.mainBranchBillingCity && "border-red-400")}
                                    disabled={readOnly}
                                  />
                                  {isMain && errors.mainBranchBillingCity && (
                                    <FieldError msg={errors.mainBranchBillingCity} />
                                  )}
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">Pincode</Label>
                                  <Input
                                    value={branch.billingAddress.pincode}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].billingAddress.pincode = e.target.value.replace(/\D/g, "").slice(0, 6);
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="6-digit"
                                    className={cn("h-8 text-xs bg-background", isMain && errors.mainBranchBillingPincode && "border-red-400")}
                                    disabled={readOnly}
                                  />
                                  {isMain && errors.mainBranchBillingPincode && (
                                    <FieldError msg={errors.mainBranchBillingPincode} />
                                  )}
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Shipping Address block */}
                          <div className="space-y-4">
                            <div className="flex justify-between items-center border-b border-border/40 pb-1.5">
                              <span className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Shipping Address</span>
                              {!readOnly && (
                                <button
                                  type="button"
                                  onClick={() => {
                                    const updated = [...form.branches];
                                    updated[bIdx] = {
                                      ...updated[bIdx],
                                      shippingAddress: { ...updated[bIdx].billingAddress }
                                    };
                                    onChange({ ...form, branches: updated });
                                    showToast("Billing address copied to shipping address.", "success");
                                  }}
                                  className="text-[10px] font-medium text-brand-600 hover:text-brand-700 transition-colors"
                                >
                                  Copy Billing Address
                                </button>
                              )}
                            </div>

                            <div className="space-y-3">
                              <div className="space-y-1">
                                <Label className="text-xs font-medium text-foreground">Address</Label>
                                <Textarea
                                  value={branch.shippingAddress.address}
                                  onChange={(e) => {
                                    const updated = [...form.branches];
                                    updated[bIdx].shippingAddress.address = e.target.value;
                                    onChange({ ...form, branches: updated });
                                  }}
                                  rows={2}
                                  placeholder="Street, area, landmark..."
                                  className="text-xs resize-none bg-background"
                                  disabled={readOnly}
                                />
                              </div>

                              <div className="grid grid-cols-3 gap-2">
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">State</Label>
                                  <Input
                                    value={branch.shippingAddress.state}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].shippingAddress.state = e.target.value;
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="State"
                                    className="h-8 text-xs bg-background"
                                    disabled={readOnly}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">City</Label>
                                  <Input
                                    value={branch.shippingAddress.city}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].shippingAddress.city = e.target.value;
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="City"
                                    className="h-8 text-xs bg-background"
                                    disabled={readOnly}
                                  />
                                </div>
                                <div className="space-y-1">
                                  <Label className="text-xs font-medium text-foreground">Pincode</Label>
                                  <Input
                                    value={branch.shippingAddress.pincode}
                                    onChange={(e) => {
                                      const updated = [...form.branches];
                                      updated[bIdx].shippingAddress.pincode = e.target.value.replace(/\D/g, "").slice(0, 6);
                                      onChange({ ...form, branches: updated });
                                    }}
                                    placeholder="6-digit"
                                    className="h-8 text-xs bg-background"
                                    disabled={readOnly}
                                  />
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Branch Documents Section */}
                        <div className="pt-3 space-y-3 border-t border-border/40">
                          <div
                            onClick={() => {
                              setExpandedChecklists(prev => ({ ...prev, [bIdx]: !prev[bIdx] }));
                            }}
                            className="flex items-center justify-between p-2 transition-colors border rounded-lg cursor-pointer select-none hover:bg-muted/10 bg-muted/5 border-border/40"
                          >
                            <p className="text-[10px] font-bold uppercase tracking-wider text-muted-foreground">Document Upload Checklist</p>
                            <ChevronDown className={cn("w-3.5 h-3.5 text-muted-foreground transition-transform duration-200", expandedChecklists[bIdx] && "rotate-180")} />
                          </div>
                          
                          {expandedChecklists[bIdx] && (
                            <div className="space-y-4 duration-200 animate-in fade-in-50">
                              {!form.customerType ? (
                                <p className="text-xs italic text-muted-foreground">Please select a Customer Type in Basic Details to view documents.</p>
                              ) : (
                                <>
                                  <div className="overflow-x-auto border rounded-lg border-border/50">
                                    <table className="w-full text-xs min-w-[640px]">
                                      <thead>
                                        <tr className="text-left border-b bg-muted/25 border-border/50 text-muted-foreground">
                                          <th className="px-3 py-2 font-medium">Document Name</th>
                                          <th className="px-3 py-2 font-medium">Upload File</th>
                                          <th className="w-10 px-3 py-2" />
                                        </tr>
                                      </thead>
                                    <tbody>
                                      {branch.documents.map((doc, originalIdx) => {
                                        const isAttached = !!doc.fileName;
                                        return (
                                          <tr key={originalIdx} className="border-b border-border/40 last:border-0 hover:bg-muted/10">
                                            <td className="px-3 py-2">
                                              <Input
                                                disabled={readOnly || doc.required}
                                                value={doc.documentName}
                                                onChange={(e) => {
                                                  const updatedBranches = [...form.branches];
                                                  updatedBranches[bIdx].documents[originalIdx].documentName = e.target.value;
                                                  onChange({ ...form, branches: updatedBranches });
                                                }}
                                                className={cn(
                                                  "h-8 text-xs border-border/60 bg-white disabled:opacity-100 disabled:text-neutral-800 disabled:bg-muted/40 font-medium",
                                                  doc.required && "cursor-not-allowed"
                                                )}
                                                placeholder="Document name"
                                              />
                                              {errors[`branch_${bIdx}_doc_${originalIdx}_name`] && (
                                                <p className="text-[10px] text-red-500 mt-0.5">{errors[`branch_${bIdx}_doc_${originalIdx}_name`]}</p>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {isAttached ? (
                                                <button
                                                  type="button"
                                                  className="text-xs text-brand-600 hover:text-brand-700 hover:underline font-medium text-left truncate max-w-[280px] block"
                                                  title={`Click to view ${doc.fileName}`}
                                                  onClick={() => {
                                                    if (doc.fileUrl && doc.fileName) {
                                                      setPreviewDoc({
                                                        title: doc.documentName || "Document",
                                                        fileUrl: doc.fileUrl,
                                                        fileName: doc.fileName
                                                      });
                                                    }
                                                  }}
                                                >
                                                  {doc.fileName}
                                                </button>
                                              ) : readOnly ? (
                                                <span className="text-muted-foreground">—</span>
                                              ) : (
                                                <div className="space-y-1">
                                                  <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="h-8 text-[11px] max-w-[180px] truncate"
                                                    onClick={() => triggerBranchUpload(bIdx, originalIdx)}
                                                  >
                                                    <Upload className="w-3 h-3 mr-1 shrink-0" />
                                                    Choose File
                                                  </Button>
                                                  {errors[`branch_${bIdx}_doc_${originalIdx}_file`] && (
                                                    <p className="text-[10px] text-red-500 mt-0.5">{errors[`branch_${bIdx}_doc_${originalIdx}_file`]}</p>
                                                  )}
                                                </div>
                                              )}
                                            </td>
                                            <td className="px-3 py-2">
                                              {!readOnly && (
                                                <Button
                                                  type="button"
                                                  variant="ghost"
                                                  className="w-8 h-8 p-0 text-red-600 rounded-md hover:bg-red-50 disabled:opacity-30 disabled:hover:bg-transparent"
                                                  disabled={!isAttached && doc.required}
                                                  onClick={() => {
                                                    if (doc.required) {
                                                      const updatedBranches = [...form.branches];
                                                      updatedBranches[bIdx].documents[originalIdx] = {
                                                        ...doc,
                                                        fileName: undefined,
                                                        fileUrl: undefined,
                                                        file: undefined,
                                                      };
                                                      onChange({ ...form, branches: updatedBranches });
                                                      showToast("Document removed.", "success");
                                                    } else {
                                                      const updatedBranches = [...form.branches];
                                                      updatedBranches[bIdx].documents = updatedBranches[bIdx].documents.filter((_, idx) => idx !== originalIdx);
                                                      onChange({ ...form, branches: updatedBranches });
                                                      showToast("Document row removed.", "success");
                                                    }
                                                  }}
                                                >
                                                  <Trash2 className="w-3.5 h-3.5" />
                                                </Button>
                                              )}
                                            </td>
                                          </tr>
                                        );
                                      })}
                                    </tbody>
                                  </table>
                                </div>
                                
                                {errors[`branch_${bIdx}_documents`] && (
                                    <div className="flex items-center gap-1.5 mt-2 text-xs text-red-500 bg-red-50 p-2 rounded border border-red-100">
                                      <AlertCircle className="flex-shrink-0 w-4 h-4" />
                                      <span>{errors[`branch_${bIdx}_documents`]}</span>
                                    </div>
                                  )}

                                  {!readOnly && (
                                    <Button
                                      type="button"
                                      variant="outline"
                                      size="sm"
                                      className="h-8 mt-1 text-xs border-dashed"
                                      onClick={() => {
                                        const updatedBranches = [...form.branches];
                                        updatedBranches[bIdx].documents = [
                                          ...updatedBranches[bIdx].documents,
                                          { documentName: "", required: false }
                                        ];
                                        onChange({ ...form, branches: updatedBranches });
                                      }}
                                    >
                                      <Plus className="w-3.5 h-3.5 mr-1" /> Add Document Row
                                    </Button>
                                  )}
                                </>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </TabsContent>
      </Tabs>

      {/* Hidden File Input */}
      <input
        type="file"
        ref={fileInputRef}
        className="hidden"
        onChange={handleFileChange}
      />

      {/* Local Toast alerts */}
      {toastState && <LocalToast toast={toastState} onDismiss={() => setToastState(null)} />}

      {/* Image / PDF Preview Modal */}
      <Dialog open={!!previewDoc} onOpenChange={(open) => !open && setPreviewDoc(null)}>
        <DialogContent className="max-w-2xl bg-white">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold">{previewDoc?.title}</DialogTitle>
          </DialogHeader>
          <div className="flex flex-col items-center justify-center p-4 border border-dashed rounded-lg border-border bg-muted/10 min-h-[300px]">
            {previewDoc && (
              /\.(jpe?g|png|webp|gif)$/i.test(previewDoc.fileName) ? (
                <img
                  src={previewDoc.fileUrl}
                  alt={previewDoc.title}
                  className="max-h-[50vh] max-w-full object-contain rounded-md animate-in zoom-in-95 duration-200"
                />
              ) : (
                <div className="space-y-4 text-center">
                  <div className="inline-flex p-3 border rounded-full bg-brand-50 border-brand-100 text-brand-600">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </div>
                  <div>
                    <p className="text-xs font-semibold text-foreground">{previewDoc.fileName}</p>
                    <p className="text-[11px] text-muted-foreground mt-1">This file type cannot be previewed directly.</p>
                  </div>
                  <a
                    href={previewDoc.fileUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-brand-600 text-xs font-medium text-white hover:bg-brand-700 transition-colors"
                  >
                    Open in new tab
                  </a>
                </div>
              )
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}

export function validateCustomerForm(form: CustomerFormValues, isAdd?: boolean): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.customerName.trim()) e.customerName = "Customer name is required";
  if (!form.customerType) e.customerType = "Customer type is required";
  if (!form.mobile.trim()) e.mobile = "Mobile number is required";
  else if (!validateMobile(form.mobile)) e.mobile = "Enter a valid 10-digit mobile number";
  if (form.email.trim() && !validateEmail(form.email)) e.email = "Enter a valid email address";
  if (form.gstApplicable) {
    if (!form.gstin.trim()) e.gstin = "GSTIN is required when GST is applicable";
    else if (!validateGSTIN(form.gstin)) e.gstin = "Invalid GSTIN format";
    if (!isAdd && !form.gstMasterId) e.gstMasterId = "Select GST code from master";
  }
  if (form.tdsApplicable && !form.tdsMasterId) e.tdsMasterId = "Select TDS section from master";
  
  // Validate Main Branch
  const mainBranch = form.branches.find(b => b.isMain) || form.branches.find(b => b.branchName === "Main Branch");
  if (!mainBranch) {
    e.branches = "Main Branch is mandatory";
  } else {
    if (!mainBranch.billingAddress.address.trim()) {
      e.mainBranchBillingAddress = "Main Branch billing address is required";
    }
    if (!mainBranch.billingAddress.city.trim()) {
      e.mainBranchBillingCity = "Main Branch billing city is required";
    }
    if (!mainBranch.billingAddress.state.trim()) {
      e.mainBranchBillingState = "Main Branch billing state is required";
    }
    if (mainBranch.billingAddress.pincode.trim() && !validatePincode(mainBranch.billingAddress.pincode)) {
      e.mainBranchBillingPincode = "Enter a valid 6-digit pincode";
    }
  }

  // Validate product mappings
  const selectedProductIds = new Set<string>();
  form.customerProducts.forEach((p, idx) => {
    if (!p.productId || !p.productName.trim()) {
      e[`product_${idx}_id`] = "Product is required.";
    } else {
      if (selectedProductIds.has(p.productId)) {
        e[`product_${idx}_id`] = "Duplicate product mapping";
      }
      selectedProductIds.add(p.productId);
    }
    if (p.price === undefined || p.price === null || isNaN(p.price) || p.price <= 0) {
      e[`product_${idx}_price`] = "Price must be greater than 0";
    }
  });

  // Validate branch-wise document uploads
  form.branches.forEach((branch, bIdx) => {
    const missing = branch.documents.some((doc) => doc.required && !doc.fileName);
    if (missing) {
      e[`branch_${bIdx}_documents`] = `Please upload all required documents for ${branch.branchName}.`;
    }

    branch.documents.forEach((doc, docIdx) => {
      if (!doc.required) {
        const hasName = !!doc.documentName.trim();
        const hasFile = !!doc.fileName;
        if (hasName && !hasFile) {
          e[`branch_${bIdx}_doc_${docIdx}_file`] = "File is required";
        }
        if (hasFile && !hasName) {
          e[`branch_${bIdx}_doc_${docIdx}_name`] = "Document name is required";
        }
      }
    });
  });

  if (form.creditLimit.trim() && isNaN(parseFloat(form.creditLimit))) e.creditLimit = "Invalid amount";
  if (form.interestRate.trim()) {
    const ir = parseFloat(form.interestRate);
    if (isNaN(ir) || ir < 0 || ir > 100) e.interestRate = "Interest rate must be 0-100";
  }
  if (form.accountNumber && form.accountNumber !== form.confirmAccountNumber) {
    e.confirmAccountNumber = "Account number mismatch";
  }
  if (form.ifscCode.trim() && !validateIFSC(form.ifscCode)) e.ifscCode = "Invalid IFSC format";
  if (form.status === "blocked" && !form.blockReason.trim()) e.blockReason = "Block reason is required when status is Blocked";

  return e;
}

export function formValuesToCustomer(
  form: CustomerFormValues,
  base: Partial<Customer> & { id: number; customerCode: string },
  geoNodes?: ReturnType<typeof loadGeoNodes>,
  employees?: ReturnType<typeof getActiveSalesEmployees>,
): Customer {
  const nodes = geoNodes ?? loadGeoNodes();
  const staff = employees ?? getActiveSalesEmployees();
  const sales = staff.find((e) => e.id === Number(form.salesManId));

  const mainBranch = form.branches.find(b => b.isMain) || form.branches.find(b => b.branchName === "Main Branch") || form.branches[0];

  // Clean custom documents for storage
  const cleanBranches = form.branches.map((b) => ({
    ...b,
    documents: b.documents.filter((d) => d.required || d.documentName.trim() || d.fileName),
  }));

  const cleanMainBranch = cleanBranches.find(b => b.isMain) || cleanBranches.find(b => b.branchName === "Main Branch") || cleanBranches[0];

  return {
    id: base.id,
    customerCode: base.customerCode,
    customerName: form.customerName.trim(),
    customerType: form.customerType,
    status: form.status,
    blockReason: form.status === "blocked" ? form.blockReason.trim() : "",
    countryCode: form.countryCode,
    mobile: form.mobile.trim(),
    email: form.email.trim(),
    gstApplicable: form.gstApplicable,
    gstin: form.gstApplicable ? form.gstin.trim().toUpperCase() : "",
    gstMasterId: form.gstApplicable && form.gstMasterId ? Number(form.gstMasterId) : null,
    tdsApplicable: form.tdsApplicable,
    tdsMasterId: form.tdsApplicable && form.tdsMasterId ? Number(form.tdsMasterId) : null,
    tan: form.tan.trim(),
    cibRegn: form.cibRegn.trim(),
    fcoRegn: form.fcoRegn.trim(),
    fssai: form.fssai.trim(),
    
    // For backwards compatibility and listing/view pages:
    address: cleanMainBranch?.billingAddress?.address?.trim() || "",
    stateId: form.stateId ? Number(form.stateId) : null,
    stateName: cleanMainBranch?.billingAddress?.state?.trim() || "",
    districtId: form.districtId ? Number(form.districtId) : null,
    districtName: cleanMainBranch?.billingAddress?.city?.trim() || "",
    territoryId: form.territoryId ? Number(form.territoryId) : null,
    territoryName: "",
    pincode: cleanMainBranch?.billingAddress?.pincode?.trim() || "",
    
    salesManId: form.salesManId ? Number(form.salesManId) : null,
    salesManName: sales?.fullName ?? (sales ? `${sales.firstName} ${sales.lastName}`.trim() : ""),
    creditLimit: parseFloat(form.creditLimit) || 0,
    interestRate: parseFloat(form.interestRate) || 0,
    paymentTerms: form.paymentTerms,
    bankName: form.bankName.trim(),
    bankBranchAddress: form.branch.trim(),
    bankAccountNo: form.accountNumber.trim(),
    ifscCode: form.ifscCode.trim().toUpperCase(),
    
    // New aligned bank fields
    accountHolderName: form.accountHolderName.trim(),
    branch: form.branch.trim(),
    swiftCode: form.swiftCode.trim(),
    
    createdBy: base.createdBy ?? "Admin",
    createdDate: base.createdDate ?? todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
    lastStatusChange: base.lastStatusChange ?? todayStr(),
    statusHistory: base.statusHistory ?? [],
    
    documents: {
      requiredDocuments: (cleanMainBranch?.documents || []).map((d) => ({
        documentTypeId: d.documentName,
        documentName: d.documentName,
        required: d.required,
        fileName: d.fileName,
        fileUrl: d.fileUrl,
      })),
      additionalDocuments: [],
    },
    
    // NEW FIELDS
    products: form.customerProducts,
    customerProducts: form.customerProducts,
    branches: cleanBranches,
  } as any;
}
