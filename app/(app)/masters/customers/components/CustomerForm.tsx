"use client";

import React, { useEffect, useMemo, useState } from "react";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";
import { AlertCircle, Building2, CreditCard, MapPin, Receipt, User, Users } from "lucide-react";
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
    <p className="text-xs text-red-500 flex items-center gap-1 mt-1">
      <AlertCircle className="w-3.5 h-3.5 flex-shrink-0" />
      {msg}
    </p>
  );
}

function SectionBlock({
  icon: Icon,
  title,
  subtitle,
  children,
}: {
  icon: React.ElementType;
  title: string;
  subtitle: string;
  children: React.ReactNode;
}) {
  return (
    <div className="bg-white rounded-xl border border-border shadow-sm p-5 space-y-4">
      <div className="flex items-center gap-2.5 pb-3 border-b border-border">
        <div className="w-7 h-7 rounded-lg bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
          <Icon className="w-3.5 h-3.5 text-brand-600" />
        </div>
        <div>
          <p className="text-xs font-semibold text-foreground">{title}</p>
          <p className="text-[11px] text-muted-foreground">{subtitle}</p>
        </div>
      </div>
      {children}
    </div>
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
      sublabel: [e.employeeId, e.mobile, e.role, e.territory].filter(Boolean).join(" · "),
    }));
  }, []);

  useEffect(() => {
    if (form.districtId && !districts.some((d) => String(d.id) === form.districtId)) {
      onChange({ ...form, districtId: "", territoryId: "", pincode: "" });
    }
  }, [form.stateId]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (form.territoryId && !territories.some((t) => String(t.id) === form.territoryId)) {
      onChange({ ...form, territoryId: "", pincode: "" });
    }
  }, [form.districtId]); // eslint-disable-line react-hooks/exhaustive-deps

  const inputCls = (key: string) =>
    cn("h-9 text-sm rounded-lg", errors[key] && "border-red-400 focus-visible:ring-red-300");

  return (
    <div className="space-y-4 max-w-[1400px]">
      <SectionBlock icon={User} title="Customer Basic Details" subtitle="Identity, contact, and classification">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">
              Customer Name <span className="text-red-500">*</span>
            </Label>
            <Input
              value={form.customerName}
              onChange={(e) => set("customerName", e.target.value)}
              placeholder="e.g. Agro Solutions Pvt Ltd"
              className={inputCls("customerName")}
              disabled={readOnly}
            />
            <FieldError msg={errors.customerName} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Customer Type <span className="text-red-500">*</span></Label>
            <SearchableSelect
              value={form.customerType}
              onChange={(v) => set("customerType", v)}
              options={CUSTOMER_TYPE_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Select type…"
              disabled={readOnly}
              error={!!errors.customerType}
            />
            <FieldError msg={errors.customerType} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Status</Label>
            <SearchableSelect
              value={form.status}
              onChange={(v) => set("status", v as CustomerStatus)}
              options={STATUS_OPTIONS}
              placeholder="Select status…"
              disabled={readOnly}
            />
          </div>

          {form.status === "blocked" && (
            <div className="lg:col-span-4 space-y-1.5">
              <Label className="text-xs font-medium">
                Block Reason <span className="text-red-500">*</span>
              </Label>
              <Textarea
                value={form.blockReason}
                onChange={(e) => set("blockReason", e.target.value)}
                rows={2}
                placeholder="Reason for blocking this customer…"
                className={cn("text-sm rounded-lg resize-none", errors.blockReason && "border-red-400")}
                disabled={readOnly}
              />
              <FieldError msg={errors.blockReason} />
            </div>
          )}

          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">
              Mobile Number <span className="text-red-500">*</span>
            </Label>
            <div className="flex gap-2">
              <select
                value={form.countryCode}
                onChange={(e) => set("countryCode", e.target.value)}
                disabled={readOnly}
                className={cn(
                  "h-9 w-[110px] text-sm rounded-lg border border-border bg-background px-2 focus:outline-none focus:ring-2 focus:ring-ring flex-shrink-0",
                )}
              >
                {COUNTRY_CODES.map((c) => (
                  <option key={c.code} value={c.code}>
                    {c.code}
                  </option>
                ))}
              </select>
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

          <div className="lg:col-span-2 space-y-1.5">
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
        </div>
      </SectionBlock>

      <SectionBlock icon={Receipt} title="Tax & Registration Details" subtitle="GST, TDS, and regulatory identifiers">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">GST Applicable</Label>
            <SearchableSelect
              value={form.gstApplicable ? "yes" : "no"}
              onChange={(v) => {
                const yes = v === "yes";
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

          {form.gstApplicable && (
            <>
              <div className="space-y-1.5">
                <Label className="text-xs font-medium">
                  GSTIN <span className="text-red-500">*</span>
                </Label>
                <Input
                  value={form.gstin}
                  onChange={(e) => set("gstin", e.target.value.toUpperCase())}
                  placeholder="27AABCU9603R1ZX"
                  className={cn("font-mono", inputCls("gstin"))}
                  disabled={readOnly}
                />
                <FieldError msg={errors.gstin} />
              </div>
              <div className="lg:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium">GST % / GST Code</Label>
                <SearchableSelect
                  value={form.gstMasterId}
                  onChange={(v) => set("gstMasterId", v)}
                  options={gstMasters.map((g) => ({
                    value: String(g.id),
                    label: `${g.gstCode} — ${g.gstPercentage}%`,
                    sublabel: `CGST ${g.cgst}% · SGST ${g.sgst}% · IGST ${g.igst}%`,
                  }))}
                  placeholder="Select from GST Master…"
                  searchPlaceholder="Search GST code…"
                  disabled={readOnly}
                  error={!!errors.gstMasterId}
                />
                <FieldError msg={errors.gstMasterId} />
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">TDS Applicable</Label>
            <SearchableSelect
              value={form.tdsApplicable ? "yes" : "no"}
              onChange={(v) => {
                const yes = v === "yes";
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

          {form.tdsApplicable && (
            <div className="lg:col-span-2 space-y-1.5">
              <Label className="text-xs font-medium">TDS % / TDS Section</Label>
              <SearchableSelect
                value={form.tdsMasterId}
                onChange={(v) => set("tdsMasterId", v)}
                options={tdsMasters.map((t) => ({
                  value: String(t.id),
                  label: `${t.tdsCode} — ${t.tdsRate}%`,
                  sublabel: t.remarks,
                }))}
                placeholder="Select from TDS Master…"
                disabled={readOnly}
                error={!!errors.tdsMasterId}
              />
              <FieldError msg={errors.tdsMasterId} />
            </div>
          )}

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">TAN #</Label>
            <Input value={form.tan} onChange={(e) => set("tan", e.target.value)} className={inputCls("tan")} disabled={readOnly} />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">CIB Regn #</Label>
            <Input value={form.cibRegn} onChange={(e) => set("cibRegn", e.target.value)} disabled={readOnly} className="h-9 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">FCO Regn #</Label>
            <Input value={form.fcoRegn} onChange={(e) => set("fcoRegn", e.target.value)} disabled={readOnly} className="h-9 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">FSSAI #</Label>
            <Input value={form.fssai} onChange={(e) => set("fssai", e.target.value)} disabled={readOnly} className="h-9 text-sm rounded-lg" />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock icon={MapPin} title="Address & Geography Details" subtitle="Cascading geography from Geography Master">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="lg:col-span-4 space-y-1.5">
            <Label className="text-xs font-medium">
              Address <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={form.address}
              onChange={(e) => set("address", e.target.value)}
              rows={2}
              placeholder="Street, area, landmark…"
              className={cn("text-sm rounded-lg resize-none", errors.address && "border-red-400")}
              disabled={readOnly}
            />
            <FieldError msg={errors.address} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              State <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              value={form.stateId}
              onChange={(v) =>
                onChange({ ...form, stateId: v, districtId: "", territoryId: "", pincode: "" })
              }
              options={states.map((s) => ({ value: String(s.id), label: s.name }))}
              placeholder="Select state…"
              disabled={readOnly}
              error={!!errors.stateId}
            />
            <FieldError msg={errors.stateId} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">
              District <span className="text-red-500">*</span>
            </Label>
            <SearchableSelect
              value={form.districtId}
              onChange={(v) => onChange({ ...form, districtId: v, territoryId: "", pincode: "" })}
              options={districts.map((d) => ({ value: String(d.id), label: d.name }))}
              placeholder={form.stateId ? "Select district…" : "Select state first"}
              disabled={readOnly || !form.stateId}
              error={!!errors.districtId}
            />
            <FieldError msg={errors.districtId} />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Territory</Label>
            <SearchableSelect
              value={form.territoryId}
              onChange={(v) => onChange({ ...form, territoryId: v, pincode: "" })}
              options={territories.map((t) => ({ value: String(t.id), label: t.name }))}
              placeholder={form.districtId ? "Select territory…" : "Select district first"}
              disabled={readOnly || !form.districtId}
            />
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Pin Code</Label>
            {pincodeOptions.length > 0 ? (
              <SearchableSelect
                value={form.pincode}
                onChange={(v) => set("pincode", v)}
                options={pincodeOptions.map((p) => ({ value: p, label: p }))}
                placeholder="Select pin code…"
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
        </div>
      </SectionBlock>

      <SectionBlock icon={Users} title="Sales Mapping" subtitle="Assign active sales person from User Master">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Sales Man</Label>
            <SearchableSelect
              value={form.salesManId}
              onChange={(v) => set("salesManId", v)}
              options={salesOptions}
              placeholder="Search by name, ID, mobile, role…"
              searchPlaceholder="Search sales person…"
              disabled={readOnly}
            />
            <p className="text-[11px] text-muted-foreground">Only active users are listed</p>
          </div>
        </div>
      </SectionBlock>

      <SectionBlock icon={CreditCard} title="Credit & Commercial Details" subtitle="Limits, interest, and payment terms">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Credit Limit (₹)</Label>
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
          <div className="space-y-1.5">
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
          <div className="lg:col-span-2 space-y-1.5">
            <Label className="text-xs font-medium">Payment Terms</Label>
            <SearchableSelect
              value={form.paymentTerms}
              onChange={(v) => set("paymentTerms", v)}
              options={PAYMENT_TERMS_OPTIONS.map((o) => ({ value: o.value, label: o.label }))}
              placeholder="Select payment terms…"
              disabled={readOnly}
            />
          </div>
        </div>
      </SectionBlock>

      <SectionBlock icon={Building2} title="Bank Details" subtitle="Account information for settlements">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bank Name</Label>
            <Input value={form.bankName} onChange={(e) => set("bankName", e.target.value)} disabled={readOnly} className="h-9 text-sm rounded-lg" />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">Bank A/c #</Label>
            <Input
              value={form.bankAccountNo}
              onChange={(e) => set("bankAccountNo", e.target.value)}
              className={cn("font-mono", inputCls("bankAccountNo"))}
              disabled={readOnly}
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">IFSC Code</Label>
            <Input
              value={form.ifscCode}
              onChange={(e) => set("ifscCode", e.target.value.toUpperCase())}
              className={cn("font-mono", inputCls("ifscCode"))}
              disabled={readOnly}
            />
            <FieldError msg={errors.ifscCode} />
          </div>
          <div className="lg:col-span-4 space-y-1.5">
            <Label className="text-xs font-medium">Bank Branch Address</Label>
            <Textarea
              value={form.bankBranchAddress}
              onChange={(e) => set("bankBranchAddress", e.target.value)}
              rows={2}
              className="text-sm rounded-lg resize-none"
              disabled={readOnly}
            />
          </div>
        </div>
      </SectionBlock>
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
    if (isNaN(ir) || ir < 0 || ir > 100) e.interestRate = "Interest rate must be 0–100";
  }
  if (form.ifscCode.trim() && !validateIFSC(form.ifscCode)) e.ifscCode = "Invalid IFSC format";
  if (form.status === "blocked" && !form.blockReason.trim())
    e.blockReason = "Block reason is required when status is Blocked";
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
