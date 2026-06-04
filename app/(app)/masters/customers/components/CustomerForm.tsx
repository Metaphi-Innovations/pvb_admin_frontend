"use client";

import React, { useEffect, useMemo, useState } from "react";
import { AlertCircle, ChevronDown, Check } from "lucide-react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import { SearchableSelect } from "./SearchableSelect";
import {
  type Customer,
  type CustomerStatus,
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
    address: c.address,
    stateId: c.stateId != null ? String(c.stateId) : "",
    districtId: c.districtId != null ? String(c.districtId) : "",
    territoryId: c.territoryId != null ? String(c.territoryId) : "",
    pincode: c.pincode,
    salesManId: c.salesManId != null ? String(c.salesManId) : "",
    creditLimit: c.creditLimit ? String(c.creditLimit) : "",
    interestRate: c.interestRate ? String(c.interestRate) : "",
    paymentTerms: c.paymentTerms,
    bankName: c.bankName,
    bankBranchAddress: c.bankBranchAddress,
    bankAccountNo: c.bankAccountNo,
    ifscCode: c.ifscCode,
  };
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

interface CustomerFormProps {
  form: CustomerFormValues;
  onChange: (form: CustomerFormValues) => void;
  errors: Record<string, string>;
  onClearError: (key: string) => void;
  readOnly?: boolean;
}

export function CustomerForm({ form, onChange, errors, onClearError, readOnly }: CustomerFormProps) {
  const [geoNodes] = useState(() => (typeof window !== "undefined" ? loadGeoNodes() : []));

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

  const inputCls = (key: string) => cn("h-8 text-xs", errors[key] && "border-red-400 focus-visible:ring-red-300");
  const textareaCls = (key?: string) => cn("text-xs resize-none", key && errors[key] && "border-red-400");

  return (
    <div className="w-full">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="h-8 p-0.5 bg-muted/30 mb-4 inline-flex gap-0.5">
          <TabsTrigger value="basic" className="px-4 text-xs h-7">Basic Details</TabsTrigger>
          <TabsTrigger value="tax" className="px-4 text-xs h-7">Tax & Registration</TabsTrigger>
          <TabsTrigger value="commercial" className="px-4 text-xs h-7">Bank & Commercial</TabsTrigger>
        </TabsList>

        {/* ── TAB 1: BASIC DETAILS ── */}
        <TabsContent value="basic" className="mt-0 space-y-5">
          <div>
            <SectionHead label="Basic Information" />
            <div className="grid grid-cols-6 gap-6">
              {/* Customer Name */}
              <div className="col-span-2 space-y-1">
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
              <div className="col-span-1 space-y-1">
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
              <div className="col-span-2 space-y-1">
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
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Customer Type <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={form.customerType}
                  onChange={(value) => set("customerType", value)}
                  options={CUSTOMER_TYPE_OPTIONS.map((option) => ({ value: option.value, label: option.label }))}
                  placeholder="Select type..."
                  disabled={readOnly}
                  error={!!errors.customerType}
                />
                <FieldError msg={errors.customerType} />
              </div>
               

              {/* Status */}
              {/* <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Status</Label>
                <SearchableSelect
                  value={form.status}
                  onChange={(value) => set("status", value as CustomerStatus)}
                  options={STATUS_OPTIONS}
                  placeholder="Select status..."
                  disabled={readOnly}
                />
              </div> */}

              {/* Block Reason */}
              {form.status === "blocked" && (
                <div className="col-span-4 space-y-1">
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

          {/* Address Details */}
          <div className="pt-4 border-t border-border/60">
            <SectionHead label="Address Details" />
            <div className="grid grid-cols-4 gap-3">
              {/* Address */}
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium">Address <span className="text-red-500">*</span></Label>
                <Textarea
                  value={form.address}
                  onChange={(e) => set("address", e.target.value)}
                  rows={2}
                  placeholder="Street, area, landmark..."
                  className={textareaCls("address")}
                  disabled={readOnly}
                />
                <FieldError msg={errors.address} />
              </div>

              {/* State */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">State <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={form.stateId}
                  onChange={(value) => onChange({ ...form, stateId: value, districtId: "", territoryId: "", pincode: "" })}
                  options={states.map((state) => ({ value: String(state.id), label: state.name }))}
                  placeholder="Select state..."
                  disabled={readOnly}
                  error={!!errors.stateId}
                />
                <FieldError msg={errors.stateId} />
              </div>

              {/* District */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">District <span className="text-red-500">*</span></Label>
                <SearchableSelect
                  value={form.districtId}
                  onChange={(value) => onChange({ ...form, districtId: value, territoryId: "", pincode: "" })}
                  options={districts.map((district) => ({ value: String(district.id), label: district.name }))}
                  placeholder={form.stateId ? "Select district..." : "Select state first"}
                  disabled={readOnly || !form.stateId}
                  error={!!errors.districtId}
                />
                <FieldError msg={errors.districtId} />
              </div>

              {/* Territory */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Territory</Label>
                <SearchableSelect
                  value={form.territoryId}
                  onChange={(value) => onChange({ ...form, territoryId: value, pincode: "" })}
                  options={territories.map((territory) => ({ value: String(territory.id), label: territory.name }))}
                  placeholder={form.districtId ? "Select territory..." : "Select district first"}
                  disabled={readOnly || !form.districtId}
                />
              </div>

              {/* Pin Code */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">Pin Code</Label>
                {pincodeOptions.length > 0 ? (
                  <SearchableSelect
                    value={form.pincode}
                    onChange={(value) => set("pincode", value)}
                    options={pincodeOptions.map((pincode) => ({ value: pincode, label: pincode }))}
                    placeholder="Select pin code..."
                    disabled={readOnly || !form.territoryId}
                    error={!!errors.pincode}
                  />
                ) : (
                  <Input
                    value={form.pincode}
                    onChange={(e) => set("pincode", e.target.value.replace(/\D/g, "").slice(0, 6))}
                    placeholder="6-digit PIN"
                    className={inputCls("pincode")}
                    inputMode="numeric"
                    disabled={readOnly}
                  />
                )}
                <FieldError msg={errors.pincode} />
              </div>

              {/* Sales Man */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Sales Man</Label>
                <SearchableSelect
                  value={form.salesManId}
                  onChange={(value) => set("salesManId", value)}
                  options={salesOptions}
                  placeholder="Search by name, ID, mobile, role..."
                  searchPlaceholder="Search sales person..."
                  disabled={readOnly}
                />
                <p className="text-[11px] text-muted-foreground mt-0.5">Only active users are listed</p>
              </div>
            </div>
          </div>
        </TabsContent>

        {/* ── TAB 2: TAX & REGISTRATION ── */}
        <TabsContent value="tax" className="mt-0 space-y-5">
          <div>
            <SectionHead label="Tax & Registration" />
            <div className="grid grid-cols-4 gap-3">
              {/* GST Applicable */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">GST Applicable</Label>
                <SearchableSelect
                  value={form.gstApplicable ? "yes" : "no"}
                  onChange={(value) => {
                    const yes = value === "yes";
                    onChange({
                      ...form,
                      gstApplicable: yes,
                      gstin: yes ? form.gstin : "",
                      gstMasterId: yes ? form.gstMasterId : "",
                    });
                  }}
                  options={YES_NO_OPTIONS}
                  disabled={readOnly}
                />
              </div>

              {/* GSTIN */}
              {form.gstApplicable && (
                <>
                  <div className="col-span-1 space-y-1">
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

                  {/* GST Master */}
                  <div className="col-span-2 space-y-1">
                    <Label className="text-xs font-medium">GST % / GST Code</Label>
                    <SearchableSelect
                      value={form.gstMasterId}
                      onChange={(value) => set("gstMasterId", value)}
                      options={gstMasters.map((gst) => ({
                        value: String(gst.id),
                        label: `${gst.gstId} - ${gst.gstPercentage}%`,
                        sublabel: gst.gstType,
                      }))}
                      placeholder="Select from GST Master..."
                      searchPlaceholder="Search GST code..."
                      disabled={readOnly}
                      error={!!errors.gstMasterId}
                    />
                    <FieldError msg={errors.gstMasterId} />
                  </div>
                </>
              )}

              {/* TDS Applicable */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">TDS Applicable</Label>
                <SearchableSelect
                  value={form.tdsApplicable ? "yes" : "no"}
                  onChange={(value) => {
                    const yes = value === "yes";
                    onChange({
                      ...form,
                      tdsApplicable: yes,
                      tdsMasterId: yes ? form.tdsMasterId : "",
                    });
                  }}
                  options={YES_NO_OPTIONS}
                  disabled={readOnly}
                />
              </div>

              {/* TDS Master */}
              {form.tdsApplicable && (
                <div className="col-span-2 space-y-1">
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

              {/* Other Registration Numbers */}
              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">CIB Regn #</Label>
                <Input
                  value={form.cibRegn}
                  onChange={(e) => set("cibRegn", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                />
              </div>

              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">FCO Regn #</Label>
                <Input
                  value={form.fcoRegn}
                  onChange={(e) => set("fcoRegn", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                />
              </div>

              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">TAN #</Label>
                <Input
                  value={form.tan}
                  onChange={(e) => set("tan", e.target.value)}
                  className={inputCls("tan")}
                  disabled={readOnly}
                />
              </div>

              <div className="col-span-1 space-y-1">
                <Label className="text-xs font-medium">FSSAI #</Label>
                <Input
                  value={form.fssai}
                  onChange={(e) => set("fssai", e.target.value)}
                  disabled={readOnly}
                  className="h-8 text-xs"
                />
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

              {/* Bank Details */}
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium">Bank details</Label>
                <Textarea
                  value={form.bankName}
                  onChange={(e) => set("bankName", e.target.value)}
                  rows={2}
                  className={textareaCls()}
                  disabled={readOnly}
                />
              </div>

              {/* Bank Branch Address */}
              <div className="col-span-4 space-y-1">
                <Label className="text-xs font-medium">Bank-Branch-Address</Label>
                <Textarea
                  value={form.bankBranchAddress}
                  onChange={(e) => set("bankBranchAddress", e.target.value)}
                  rows={2}
                  className={textareaCls()}
                  disabled={readOnly}
                />
              </div>

              {/* Bank Account No */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">Bank A/c #</Label>
                <Input
                  value={form.bankAccountNo}
                  onChange={(e) => set("bankAccountNo", e.target.value)}
                  className={cn("font-mono", inputCls("bankAccountNo"))}
                  disabled={readOnly}
                />
              </div>

              {/* IFSC Code */}
              <div className="col-span-2 space-y-1">
                <Label className="text-xs font-medium">IFSC Code</Label>
                <Input
                  value={form.ifscCode}
                  onChange={(e) => set("ifscCode", e.target.value.toUpperCase())}
                  className={cn("font-mono", inputCls("ifscCode"))}
                  disabled={readOnly}
                />
                <FieldError msg={errors.ifscCode} />
              </div>
            </div>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

export function validateCustomerForm(form: CustomerFormValues): Record<string, string> {
  const e: Record<string, string> = {};
  if (!form.customerName.trim()) e.customerName = "Customer name is required";
  if (!form.customerType) e.customerType = "Customer type is required";
  if (!form.mobile.trim()) e.mobile = "Mobile number is required";
  else if (!validateMobile(form.mobile)) e.mobile = "Enter a valid 10-digit mobile number";
  if (form.email.trim() && !validateEmail(form.email)) e.email = "Enter a valid email address";
  if (form.gstApplicable) {
    if (!form.gstin.trim()) e.gstin = "GSTIN is required when GST is applicable";
    else if (!validateGSTIN(form.gstin)) e.gstin = "Invalid GSTIN format";
    if (!form.gstMasterId) e.gstMasterId = "Select GST code from master";
  }
  if (form.tdsApplicable && !form.tdsMasterId) e.tdsMasterId = "Select TDS section from master";
  if (!form.address.trim()) e.address = "Address is required";
  if (!form.stateId) e.stateId = "State is required";
  if (!form.districtId) e.districtId = "District is required";
  if (form.pincode.trim() && !validatePincode(form.pincode)) e.pincode = "Enter a valid 6-digit pincode";
  if (form.creditLimit.trim() && isNaN(parseFloat(form.creditLimit))) e.creditLimit = "Invalid amount";
  if (form.interestRate.trim()) {
    const ir = parseFloat(form.interestRate);
    if (isNaN(ir) || ir < 0 || ir > 100) e.interestRate = "Interest rate must be 0-100";
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
  const state = nodes.find((n) => n.id === Number(form.stateId));
  const district = nodes.find((n) => n.id === Number(form.districtId));
  const territory = nodes.find((n) => n.id === Number(form.territoryId));
  const sales = staff.find((e) => e.id === Number(form.salesManId));

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
    address: form.address.trim(),
    stateId: form.stateId ? Number(form.stateId) : null,
    stateName: state?.name ?? "",
    districtId: form.districtId ? Number(form.districtId) : null,
    districtName: district?.name ?? "",
    territoryId: form.territoryId ? Number(form.territoryId) : null,
    territoryName: territory?.name ?? "",
    pincode: form.pincode.trim(),
    salesManId: form.salesManId ? Number(form.salesManId) : null,
    salesManName: sales?.fullName ?? (sales ? `${sales.firstName} ${sales.lastName}`.trim() : ""),
    creditLimit: parseFloat(form.creditLimit) || 0,
    interestRate: parseFloat(form.interestRate) || 0,
    paymentTerms: form.paymentTerms,
    bankName: form.bankName.trim(),
    bankBranchAddress: form.bankBranchAddress.trim(),
    bankAccountNo: form.bankAccountNo.trim(),
    ifscCode: form.ifscCode.trim().toUpperCase(),
    createdBy: base.createdBy ?? "Admin",
    createdDate: base.createdDate ?? todayStr(),
    updatedBy: "Admin",
    updatedDate: todayStr(),
    lastStatusChange: base.lastStatusChange ?? todayStr(),
    statusHistory: base.statusHistory ?? [],
  };
}
