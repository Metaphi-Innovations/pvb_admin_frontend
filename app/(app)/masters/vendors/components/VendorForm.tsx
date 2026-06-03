"use client";

import React, { useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Plus, Trash2, Download, Eye, Upload, RefreshCw } from "lucide-react";
import { CompactToggle } from "./CompactToggle";
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
  COUNTRY_CODES,
  COUNTRIES,
  TDS_PERCENT_OPTIONS,
  fetchGstDetails,
  emptyContact,
  todayStr,
} from "../vendor-data";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { cn } from "@/lib/utils";

const TABS = [
  { id: "basic", label: "Basic Details" },
  { id: "contact", label: "Contact Information" },
  { id: "banking", label: "Banking Information" },
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

export function VendorForm({
  form,
  onChange,
  readOnly,
}: {
  form: VendorFormValues;
  onChange: (f: VendorFormValues) => void;
  readOnly?: boolean;
  vendorCode?: string;
}) {
  const [tab, setTab] = useState<TabId>("basic");
  const [fetchingGst, setFetchingGst] = useState(false);
  const fileRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const set = <K extends keyof VendorFormValues>(k: K, v: VendorFormValues[K]) =>
    onChange({ ...form, [k]: v });

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

  const addContact = () => set("contacts", [...form.contacts, emptyContact()]);
  const removeContact = (uid: string) => {
    if (form.contacts.length <= 1) return;
    set("contacts", form.contacts.filter((c) => c.uid !== uid));
  };

  const addDocumentRow = () => {
    set("documents", [
      ...form.documents,
      { uid: `d-${Date.now()}`, documentName: "", fileName: "", uploadedAt: "", size: "" },
    ]);
  };

  const uploadDoc = (uid: string, file: File) => {
    set(
      "documents",
      form.documents.map((d) =>
        d.uid === uid
          ? {
              ...d,
              fileName: file.name,
              uploadedAt: todayStr(),
              size: `${Math.max(1, Math.round(file.size / 1024))} KB`,
            }
          : d,
      ),
    );
  };

  return (
    <div className="shadow-sm">
      <VendorTabBar tabs={TABS} active={tab} onChange={(id) => setTab(id as TabId)} />

      <div className="bg-white rounded-b-lg border border-border/60 border-t-0 px-4 py-4 md:px-5 md:py-4">
        {tab === "basic" && (
          <div className="space-y-4 max-w-4xl">
            <section>
              <SectionDivider title="Vendor Information" />
              <div className="space-y-3">
                <Field label="Vendor Name" required>
                  <Input
                    disabled={readOnly}
                    value={form.vendorName}
                    onChange={(e) => set("vendorName", e.target.value)}
                    className={fieldClass}
                    placeholder="Trade / display name"
                  />
                </Field>
                <FieldGrid>
                  <Field label="Mobile Number" required>
                    <MobileRow
                      countryCode={form.mobileCountryCode}
                      mobile={form.mobile}
                      onCountryCode={(v) => set("mobileCountryCode", v)}
                      onMobile={(v) => set("mobile", v)}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Email ID">
                    <Input
                      type="email"
                      disabled={readOnly}
                      value={form.email}
                      onChange={(e) => set("email", e.target.value)}
                      className={fieldClass}
                      placeholder="vendor@company.com"
                    />
                  </Field>
                </FieldGrid>
              </div>
            </section>

            <section>
              <SectionDivider title="Company Details" />
              <div className="space-y-3">
                <Field label="Company Name">
                  <Input
                    disabled={readOnly}
                    value={form.companyName}
                    onChange={(e) => set("companyName", e.target.value)}
                    className={fieldClass}
                    placeholder="Registered company name"
                  />
                </Field>
                <div className="flex items-center gap-2 py-0.5">
                  <span className="text-xs font-medium text-foreground">GST Applicable</span>
                  <CompactToggle
                    checked={form.gstApplicable}
                    onCheckedChange={(c) => set("gstApplicable", c)}
                    disabled={readOnly}
                    activeLabel="Yes"
                    inactiveLabel="No"
                  />
                </div>
                {form.gstApplicable && (
                  <FieldGrid>
                    <Field label="GSTIN">
                      <Input
                        disabled={readOnly}
                        value={form.gstNumber}
                        onChange={(e) => set("gstNumber", e.target.value.toUpperCase())}
                        className={cn(fieldClass, "font-mono uppercase")}
                        maxLength={15}
                        placeholder="15-character GSTIN"
                      />
                    </Field>
                    <Field label=" ">
                      {!readOnly && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="h-9 w-full text-xs border-border/70"
                          onClick={handleFetchGst}
                          disabled={form.gstNumber.length !== 15 || fetchingGst}
                        >
                          <RefreshCw className={cn("w-3.5 h-3.5 mr-1.5", fetchingGst && "animate-spin")} />
                          Fetch Details
                        </Button>
                      )}
                    </Field>
                    {form.legalCompanyName && (
                      <Field label="Legal Company Name" className="md:col-span-2">
                        <Input readOnly value={form.legalCompanyName} className={cn(fieldClass, "bg-muted/20")} />
                      </Field>
                    )}
                  </FieldGrid>
                )}
              </div>
            </section>

            <section>
              <SectionDivider title="Billing Address" />
              <FieldGrid>
                <Field label="Address Line 1" className="md:col-span-2">
                  <Input disabled={readOnly} value={form.billingAddress.line1} onChange={(e) => setAddr("line1", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Address Line 2" className="md:col-span-2">
                  <Input disabled={readOnly} value={form.billingAddress.line2} onChange={(e) => setAddr("line2", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Pincode">
                  <Input disabled={readOnly} value={form.billingAddress.pincode} onChange={(e) => setAddr("pincode", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="State">
                  <Input disabled={readOnly} value={form.billingAddress.state} onChange={(e) => setAddr("state", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="City">
                  <Input disabled={readOnly} value={form.billingAddress.city} onChange={(e) => setAddr("city", e.target.value)} className={fieldClass} />
                </Field>
                <Field label="Country">
                  <select disabled={readOnly} value={form.billingAddress.country} onChange={(e) => setAddr("country", e.target.value)} className={selectClass}>
                    {COUNTRIES.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                </Field>
              </FieldGrid>
            </section>

            <section>
              <SectionDivider title="TDS" />
              <div className="flex items-center gap-2 mb-3">
                <CompactToggle
                  checked={form.tdsApplicable}
                  onCheckedChange={(c) => set("tdsApplicable", c)}
                  disabled={readOnly}
                  activeLabel="Yes"
                  inactiveLabel="No"
                />
                <span className="text-[11px] text-muted-foreground">{form.tdsApplicable ? "Applicable" : "Not applicable"}</span>
              </div>
              {form.tdsApplicable && (
                <FieldGrid cols={3}>
                  <Field label="TDS Percentage">
                    <select disabled={readOnly} value={form.tdsPercentage} onChange={(e) => set("tdsPercentage", e.target.value)} className={selectClass}>
                      {TDS_PERCENT_OPTIONS.map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  </Field>
                  {form.tdsPercentage === "custom" && (
                    <Field label="Custom %">
                      <Input type="number" disabled={readOnly} value={form.tdsCustomPercent} onChange={(e) => set("tdsCustomPercent", e.target.value)} className={fieldClass} placeholder="e.g. 7.5" />
                    </Field>
                  )}
                </FieldGrid>
              )}
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
              <FieldGrid>
                <Field label="PAN Number">
                  <Input disabled={readOnly} value={form.panNumber} onChange={(e) => set("panNumber", e.target.value.toUpperCase())} className={cn(fieldClass, "font-mono uppercase")} maxLength={10} />
                </Field>
                <Field label="Tags">
                  <Input disabled={readOnly} value={form.tags} onChange={(e) => set("tags", e.target.value)} className={fieldClass} placeholder="Comma-separated" />
                </Field>
                <Field label="Vendor Credit Period">
                  <div className="flex gap-2">
                    <Input type="number" min={0} disabled={readOnly} value={form.creditPeriodValue} onChange={(e) => set("creditPeriodValue", e.target.value)} className={cn(fieldClass, "w-20")} />
                    <select disabled={readOnly} value={form.creditPeriodUnit} onChange={(e) => set("creditPeriodUnit", e.target.value as VendorFormValues["creditPeriodUnit"])} className={cn(selectClass, "flex-1")}>
                      <option value="days">Days</option>
                      <option value="months">Months</option>
                    </select>
                  </div>
                </Field>
              </FieldGrid>
            </section>
          </div>
        )}

        {tab === "contact" && (
          <div className="space-y-3 max-w-4xl">
            <SectionDivider title="Contact Persons" subtitle="Primary and additional contacts" />
            {form.contacts.map((c, idx) => (
              <div key={c.uid} className={cn("rounded-lg border border-border/50 p-3.5", idx === 0 && "border-brand-200/80 bg-brand-50/20")}>
                {idx === 0 && (
                  <p className="text-[10px] font-semibold uppercase tracking-wider text-brand-600 mb-2.5">Primary Contact</p>
                )}
                <FieldGrid>
                  <Field label="Contact Person Name">
                    <Input disabled={readOnly} value={c.name} onChange={(e) => updateContact(c.uid, { name: e.target.value })} className={fieldClass} />
                  </Field>
                  <Field label="Designation">
                    <Input disabled={readOnly} value={c.designation} onChange={(e) => updateContact(c.uid, { designation: e.target.value })} className={fieldClass} />
                  </Field>
                  <Field label="Mobile Number">
                    <MobileRow
                      countryCode={c.countryCode}
                      mobile={c.mobile}
                      onCountryCode={(v) => updateContact(c.uid, { countryCode: v })}
                      onMobile={(v) => updateContact(c.uid, { mobile: v })}
                      disabled={readOnly}
                    />
                  </Field>
                  <Field label="Email ID">
                    <Input type="email" disabled={readOnly} value={c.email} onChange={(e) => updateContact(c.uid, { email: e.target.value })} className={fieldClass} />
                  </Field>
                </FieldGrid>
                {!readOnly && form.contacts.length > 1 && (
                  <Button type="button" variant="ghost" size="sm" className="h-7 text-[11px] text-red-600 mt-2 px-2" onClick={() => removeContact(c.uid)}>
                    <Trash2 className="w-3 h-3 mr-1" /> Remove
                  </Button>
                )}
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
          <div className="max-w-4xl">
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

        {tab === "documents" && (
          <div className="space-y-4 max-w-5xl">
            <section>
              <SectionDivider title="Documents" />
              <div className="overflow-x-auto rounded-lg border border-border/50">
                <table className="w-full text-xs min-w-[640px]">
                  <thead>
                    <tr className="bg-muted/25 border-b border-border/50 text-muted-foreground text-left">
                      <th className="px-3 py-2 font-medium">Document Name</th>
                      <th className="px-3 py-2 font-medium">Upload File</th>
                      <th className="px-3 py-2 w-14 text-center">View</th>
                      <th className="px-3 py-2 w-14 text-center">Download</th>
                      <th className="px-3 py-2 w-10" />
                    </tr>
                  </thead>
                  <tbody>
                    {form.documents.map((doc) => (
                      <DocRow
                        key={doc.uid}
                        doc={doc}
                        readOnly={readOnly}
                        fileRef={(el) => { fileRefs.current[doc.uid] = el; }}
                        onNameChange={(name) => set("documents", form.documents.map((d) => (d.uid === doc.uid ? { ...d, documentName: name } : d)))}
                        onUpload={(file) => uploadDoc(doc.uid, file)}
                        onDelete={() => set("documents", form.documents.filter((d) => d.uid !== doc.uid))}
                        onPickFile={() => fileRefs.current[doc.uid]?.click()}
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
}: {
  doc: VendorDocument;
  readOnly?: boolean;
  fileRef: (el: HTMLInputElement | null) => void;
  onNameChange: (name: string) => void;
  onUpload: (file: File) => void;
  onDelete: () => void;
  onPickFile: () => void;
}) {
  return (
    <tr className="border-b border-border/40 last:border-0 hover:bg-muted/10">
      <td className="px-3 py-2">
        <Input disabled={readOnly} value={doc.documentName} onChange={(e) => onNameChange(e.target.value)} className="h-8 text-xs border-border/60" placeholder="Document name" />
      </td>
      <td className="px-3 py-2">
        <input type="file" className="hidden" ref={fileRef} onChange={(e) => { const f = e.target.files?.[0]; if (f) onUpload(f); e.target.value = ""; }} />
        {readOnly ? (
          <span className="text-muted-foreground">{doc.fileName || "—"}</span>
        ) : (
          <Button type="button" variant="outline" size="sm" className="h-8 text-[11px] max-w-[180px] truncate" onClick={onPickFile}>
            <Upload className="w-3 h-3 mr-1 shrink-0" />
            {doc.fileName || "Choose File"}
          </Button>
        )}
      </td>
      <td className="px-3 py-2 text-center">
        <button type="button" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30" disabled={!doc.fileName} title="View">
          <Eye className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </td>
      <td className="px-3 py-2 text-center">
        <button type="button" className="p-1.5 rounded-md hover:bg-muted disabled:opacity-30" disabled={!doc.fileName} title="Download">
          <Download className="w-3.5 h-3.5 text-muted-foreground" />
        </button>
      </td>
      <td className="px-3 py-2">
        {!readOnly && (
          <button type="button" className="p-1.5 rounded-md hover:bg-red-50 text-red-600 disabled:opacity-30" disabled={!doc.fileName} onClick={onDelete}>
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        )}
      </td>
    </tr>
  );
}
