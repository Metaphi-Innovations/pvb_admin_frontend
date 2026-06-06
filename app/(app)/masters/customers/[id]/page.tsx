"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Edit2,
  User,
  Ban,
  CheckCircle2,
  ShieldAlert,
  Eye,
} from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  type Customer,
  type CustomerStatus,
  loadCustomers,
  saveCustomers,
  todayStr,
  CUSTOMER_TYPE_LABELS,
  PAYMENT_TERMS_OPTIONS,
  formatMobile,
  formatCreditLimit,
  getActiveGSTMasters,
  getActiveTDSMasters,
} from "../customer-data";
import { CustomerStatusControl } from "../components/CustomerStatusControl";
import { readCustomerPermissions } from "../customer-permissions";

const STATUS_CFG: Record<CustomerStatus, { bg: string; text: string; dot: string; label: string }> = {
  active: { bg: "bg-emerald-50", text: "text-emerald-700", dot: "bg-emerald-500", label: "Active" },
  inactive: { bg: "bg-slate-100", text: "text-slate-600", dot: "bg-slate-400", label: "Inactive" },
  draft: { bg: "bg-blue-50", text: "text-blue-700", dot: "bg-blue-500", label: "Draft" },
  blocked: { bg: "bg-red-50", text: "text-red-700", dot: "bg-red-400", label: "Blocked" },
};

function InfoRow({ label, value, mono }: { label: string; value?: React.ReactNode; mono?: boolean }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className={cn("text-right text-xs font-medium text-foreground", mono && "font-mono")}>
        {value !== undefined && value !== "" ? value : "-"}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: CustomerStatus }) {
  const st = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", st.bg, st.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", st.dot)} />
      {st.label}
    </span>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  );
}

export default function CustomerDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customer, setCustomer] = useState<Customer | null>(null);
  const [records, setRecords] = useState<Customer[]>([]);
  const [perms, setPerms] = useState(readCustomerPermissions);
  const [previewDoc, setPreviewDoc] = useState<{ title: string; fileUrl: string; fileName: string } | null>(null);

  useEffect(() => {
    setPerms(readCustomerPermissions());
    const list = loadCustomers();
    setRecords(list);
    setCustomer(list.find((c) => c.id === Number(id)) ?? null);
  }, [id]);

  const updateStatus = (customerId: number, status: CustomerStatus, blockReason = "") => {
    const today = todayStr();
    const updated = records.map((r) => {
      if (r.id !== customerId) return r;
      return {
        ...r,
        status,
        blockReason: status === "blocked" ? blockReason : "",
        updatedBy: "Admin",
        updatedDate: today,
        lastStatusChange: today,
        statusHistory: [
          ...r.statusHistory,
          { date: today, from: r.status, to: status, by: "Admin", reason: blockReason || `Status -> ${status}` },
        ],
      };
    });
    setRecords(updated);
    saveCustomers(updated);
    setCustomer(updated.find((c) => c.id === customerId) ?? null);
  };

  if (!perms.canView) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center gap-3 py-16 text-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl border border-amber-200 bg-amber-50">
            <ShieldAlert className="h-6 w-6 text-amber-600" />
          </div>
          <h1 className="text-lg font-bold text-foreground">Access restricted</h1>
          <p className="max-w-md text-sm text-muted-foreground">You do not have permission to view this customer.</p>
          <Link href="/masters/customers" className="mt-2 text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  if (!customer) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Customer not found.</p>
          <Link href="/masters/customers" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const gst = getActiveGSTMasters().find((g) => g.id === customer.gstMasterId);
  const tds = getActiveTDSMasters().find((t) => t.id === customer.tdsMasterId);
  const payLabel = PAYMENT_TERMS_OPTIONS.find((p) => p.value === customer.paymentTerms)?.label ?? customer.paymentTerms;
  return (
    <AppLayout>
      <div className="max-w-[800px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-2"
            onClick={() => router.push("/masters/customers")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-1">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">{customer.customerName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {customer.customerCode} • {formatMobile(customer.countryCode, customer.mobile)} • {customer.email || "No email"}
                </p>
              </div>
              <StatusPill status={customer.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <CustomerStatusControl customer={customer} onStatusChange={updateStatus} canEdit={perms.canEdit} />
            {perms.canEdit && (
              <Link href={`/masters/customers/${customer.id}/edit`}>
                <Button size="sm" className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700">
                  <Edit2 className="w-3.5 h-3.5" /> Edit
                </Button>
              </Link>
            )}
          </div>
        </div>

        {customer.status === "blocked" && customer.blockReason && (
          <div className="flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3">
            <Ban className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-500" />
            <div>
              <p className="text-xs font-semibold text-red-700">Blocked - not allowed in transactions</p>
              <p className="mt-0.5 text-xs text-red-600">{customer.blockReason}</p>
            </div>
          </div>
        )}

        {customer.status === "inactive" && (
          <div className="flex items-start gap-2 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
            <CheckCircle2 className="mt-0.5 h-4 w-4 flex-shrink-0 text-amber-600" />
            <p className="text-xs text-amber-700">Inactive customer - hidden from new transaction customer dropdowns.</p>
          </div>
        )}

        <div className="grid grid-cols-3 gap-3">
            <DetailCard title="Basic Details">
              <InfoRow label="Customer Name" value={customer.customerName} />
              <InfoRow label="Mobile" value={formatMobile(customer.countryCode, customer.mobile)} mono />
              <InfoRow label="Email" value={customer.email} />
              <InfoRow label="Customer Type" value={CUSTOMER_TYPE_LABELS[customer.customerType.toLowerCase()] ?? customer.customerType} />
              <InfoRow label="Status" value={<StatusPill status={customer.status} />} />
            </DetailCard>

            <DetailCard title="Tax & Registration">
              <InfoRow label="GST Applicable" value={customer.gstApplicable ? "Yes" : "No"} />
              {customer.gstApplicable && (
                <>
                  <InfoRow label="GSTIN" value={customer.gstin} mono />
                  <InfoRow label="GST Code" value={gst ? `${gst.gstId} (${gst.gstPercentage}%)` : "-"} mono />
                </>
              )}
              <InfoRow label="TDS Applicable" value={customer.tdsApplicable ? "Yes" : "No"} />
              {customer.tdsApplicable && (
                <InfoRow label="TDS Section" value={tds ? `${tds.tdsCode} - ${tds.tdsRate}%` : "-"} mono />
              )}
              <InfoRow label="TAN #" value={customer.tan} mono />
              <InfoRow label="CIB Regn #" value={customer.cibRegn} />
              <InfoRow label="FCO Regn #" value={customer.fcoRegn} />
              <InfoRow label="FSSAI #" value={customer.fssai} />
            </DetailCard>

            <DetailCard title="Address & Territory">
              <InfoRow label="Address" value={customer.address} />
              <InfoRow label="State" value={customer.stateName} />
              <InfoRow label="District" value={customer.districtName} />
              <InfoRow label="Territory" value={customer.territoryName} />
              <InfoRow label="Pin Code" value={customer.pincode} mono />
              <InfoRow label="Sales Man" value={customer.salesManName} />
            </DetailCard>

            <DetailCard title="Commercial Details">
              <InfoRow label="Credit Limit" value={formatCreditLimit(customer.creditLimit)} />
              <InfoRow label="Interest Rate" value={customer.interestRate ? `${customer.interestRate}%` : "-"} />
              <InfoRow label="Payment Terms" value={payLabel} />
            </DetailCard>

            <DetailCard title="Bank Details">
              <InfoRow label="Bank Name" value={customer.bankName} />
              <InfoRow label="Bank A/c #" value={customer.bankAccountNo} mono />
              <InfoRow label="IFSC Code" value={customer.ifscCode} mono />
              <InfoRow label="Branch Address" value={customer.bankBranchAddress} />
            </DetailCard>

            <DetailCard title="Record Info">
              <InfoRow label="Created By" value={customer.createdBy} />
              <InfoRow label="Created Date" value={customer.createdDate} />
              <InfoRow label="Updated By" value={customer.updatedBy} />
              <InfoRow label="Updated Date" value={customer.updatedDate} />
              <InfoRow label="Status Changes" value={customer.statusHistory.length} />
            </DetailCard>
        </div>

        {/* Document Section */}
        {((customer.documents?.requiredDocuments && customer.documents.requiredDocuments.some(d => d.fileName)) ||
          (customer.documents?.additionalDocuments && customer.documents.additionalDocuments.length > 0)) && (
          <div className="rounded-xl border border-border bg-white p-4">
            <p className="mb-3 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">Uploaded Documents</p>
            
            <div className="space-y-4">
              {/* Required Documents */}
              {customer.documents?.requiredDocuments && customer.documents.requiredDocuments.some(d => d.fileName) && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Required Documents</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                          <th className="py-2 px-3 w-12 text-center">Sr.</th>
                          <th className="py-2 px-3">Document Name</th>
                          <th className="py-2 px-3">File Name</th>
                          <th className="py-2 px-3 w-28 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.documents.requiredDocuments
                          .filter(d => d.fileName)
                          .map((doc, idx) => (
                            <tr key={doc.documentTypeId} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
                              <td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
                              <td className="py-2 px-3 font-medium text-foreground">{doc.documentName}</td>
                              <td className="py-2 px-3 text-muted-foreground">{doc.fileName}</td>
                              <td className="py-2 px-3 text-right">
                                <Button
                                  type="button"
                                  variant="outline"
                                  size="sm"
                                  className="h-7 text-[11px] px-2.5 gap-1"
                                  onClick={() => setPreviewDoc({ title: doc.documentName, fileUrl: doc.fileUrl!, fileName: doc.fileName! })}
                                >
                                  <Eye className="w-3.5 h-3.5" /> View
                                </Button>
                              </td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* Additional Documents */}
              {customer.documents?.additionalDocuments && customer.documents.additionalDocuments.length > 0 && (
                <div>
                  <p className="text-xs font-semibold text-foreground mb-2">Additional Documents</p>
                  <div className="overflow-x-auto rounded-lg border border-border">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-border bg-muted/20 text-muted-foreground font-semibold">
                          <th className="py-2 px-3 w-12 text-center">Sr.</th>
                          <th className="py-2 px-3">Document Title</th>
                          <th className="py-2 px-3">File Name</th>
                          <th className="py-2 px-3 w-28 text-right">Action</th>
                        </tr>
                      </thead>
                      <tbody>
                        {customer.documents.additionalDocuments.map((doc, idx) => (
                          <tr key={doc.id} className="border-b border-border/60 last:border-0 hover:bg-muted/10">
                            <td className="py-2 px-3 text-center text-muted-foreground">{idx + 1}</td>
                            <td className="py-2 px-3 font-medium text-foreground">{doc.title}</td>
                            <td className="py-2 px-3 text-muted-foreground">{doc.fileName}</td>
                            <td className="py-2 px-3 text-right">
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                className="h-7 text-[11px] px-2.5 gap-1"
                                onClick={() => setPreviewDoc({ title: doc.title, fileUrl: doc.fileUrl!, fileName: doc.fileName! })}
                              >
                                <Eye className="w-3.5 h-3.5" /> View
                              </Button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>

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
                <div className="text-center space-y-4">
                  <div className="inline-flex p-3 rounded-full bg-brand-50 border border-brand-100 text-brand-600">
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
    </AppLayout>
  );
}
