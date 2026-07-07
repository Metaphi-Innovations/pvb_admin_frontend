"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
} from "@/components/record-detail";
import {
  Building2,
  Clock,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Package,
  Phone,
  User,
} from "lucide-react";
import { useSupplier } from "@/hooks/masters/use-supplier";
import { getGstCategoryLabel, deriveGstRegistered } from "@/lib/masters/gst-compliance";
import { getActiveTDSMasters, formatTdsSummary } from "../../tds/tds-data";
import { ErpPartyAccountingCard } from "@/components/masters/ErpPartyAccountingCard";

function formatMobile(code: string, mobile: string) {
  if (!mobile) return "—";
  return `${code} ${mobile}`.trim();
}

export default function ViewVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;

  const { data: vendor, isLoading, isError } = useSupplier(id);

  const tds = useMemo(() => {
    if (!vendor?.tdsSectionId) return null;
    return getActiveTDSMasters().find((t) => t.id === Number(vendor.tdsSectionId) || t.sectionName === vendor.tdsSectionId) ?? null;
  }, [vendor?.tdsSectionId]);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-16 text-center text-xs text-muted-foreground">
          Loading supplier details…
        </div>
      </AppLayout>
    );
  }

  if (isError || !vendor) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-[#6B80A0]">Supplier not found.</p>
          <Link href="/masters/vendors" className="mt-2 inline-block text-xs text-[#1554B4]">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const gstRegistered = deriveGstRegistered(
    vendor.gstRegistered,
    vendor.gstinNumber,
    vendor.registrationType,
  );

  // Accounting Ledger Summary compliant with PartyAccountingSummary
  const accountingSummary = {
    ledgerId: null as number | null,
    ledgerName: vendor.supplierName + " - Creditors",
    ledgerCode: "20101-0" + vendor.supplierCode,
    outstanding: 0,
    coaHref: "/accounts/coa",
    ledgerHref: `/accounts/ledger?id=${vendor.supplierUuid}`,
    isSystemGenerated: true,
  };

  const mappedProducts = vendor.products ?? [];

  return (
    <RecordDetailPage
      listHref="/masters/vendors"
      listLabel="Suppliers"
      recordName={vendor.supplierName}
      statusLabel={vendor.status === "active" ? "Active" : "Inactive"}
      statusVariant={vendor.status}
      metaItems={[
        ...(vendor.contactPerson
          ? [{ label: vendor.contactPerson, icon: User }]
          : []),
        ...(vendor.mobileNumber
          ? [{
              label: formatMobile(vendor.mobileCountryCode, vendor.mobileNumber),
              icon: Phone,
              href: `tel:${vendor.mobileNumber}`,
            }]
          : []),
        ...(vendor.email
          ? [{ label: vendor.email, icon: Mail, href: `mailto:${vendor.email}` }]
          : []),
      ]}
      kpis={[
        {
          icon: Building2,
          iconBg: "#EEF3FB",
          iconColor: "#0C3F8A",
          value: vendor.supplierTypeId || "—",
          label: "Supplier Type",
        },
        {
          icon: FileText,
          iconBg: "#E6F7EF",
          iconColor: "#1E9E61",
          value: vendor.gstinNumber || "—",
          label: "GST Number",
        },
        {
          icon: Clock,
          iconBg: "#FFFBEB",
          iconColor: "#D97706",
          value: vendor.paymentTerms || "30 Days",
          label: "Payment Terms",
        },
        {
          icon: Package,
          iconBg: "#E8F4FD",
          iconColor: "#1554B4",
          value: String(mappedProducts.length),
          label: "Mapped Products",
        },
      ]}
      onEdit={() => router.push(`/masters/vendors/${id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Supplier",
            onClick: () => router.push(`/masters/vendors/${id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Supplier Code", value: vendor.supplierCode || "—", highlight: true },
          { label: "Supplier Type", value: vendor.supplierTypeId || "—" },
          { label: "GST", value: vendor.gstinNumber || "—" },
          { label: "PAN", value: vendor.panNumber || "—" },
          { label: "Payment Terms", value: vendor.paymentTerms || "30 Days" },
          { label: "Created", value: vendor.createdAt },
          { label: "Updated", value: vendor.updatedAt },
        ],
      }}
    >
      <div className="space-y-4">
        <ErpPartyAccountingCard
          title="Accounting Integration"
          summary={accountingSummary}
          partyLabel="Supplier"
        />
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          <RecordSectionCard title="Supplier Information" icon={Building2} accent="blue">
            <RecordKvRow label="Supplier Code" value={vendor.supplierCode || "—"} mono highlight />
            <RecordKvRow label="Supplier Name" value={vendor.supplierName} highlight />
            <RecordKvRow label="Supplier Type" value={vendor.supplierTypeId || "—"} />
            <RecordKvRow label="Payment Terms" value={vendor.paymentTerms || "30 Days"} />
            <RecordKvRow label="Contact Person" value={vendor.contactPerson || "—"} />
            <RecordKvRow
              label="Mobile Number"
              value={formatMobile(vendor.mobileCountryCode, vendor.mobileNumber)}
              mono
              link={!!vendor.mobileNumber}
              href={vendor.mobileNumber ? `tel:${vendor.mobileNumber}` : undefined}
            />
            <RecordKvRow
              label="Email Address"
              value={vendor.email || "—"}
              link={!!vendor.email}
              href={vendor.email ? `mailto:${vendor.email}` : undefined}
              isLast
            />
          </RecordSectionCard>

          <RecordSectionCard title="Registered Address" icon={MapPin} accent="green">
            <RecordKvRow label="Address" value={vendor.registeredGstAddress || "—"} isLast />
          </RecordSectionCard>

          <RecordSectionCard title="Tax & Registration" icon={FileText} accent="orange">
            <RecordKvRow label="GST Registered" value={gstRegistered ? "Yes" : "No"} />
            {gstRegistered && (
              <>
                <RecordKvRow
                  label="GST Registration Type"
                  value={getGstCategoryLabel(vendor.registrationType ?? "regular")}
                />
                <RecordKvRow label="GSTIN Number" value={vendor.gstinNumber} mono copy />
              </>
            )}
            <RecordKvRow label="PAN Number" value={vendor.panNumber || "—"} mono copy />
            <RecordKvRow label="TAN Number" value={vendor.tanNumber || "—"} mono copy />
            <RecordKvRow label="TDS Applicable" value={vendor.tdsApplicable ? "Yes" : "No"} />
            {vendor.tdsApplicable ? (
              <RecordKvRow
                label="TDS Section"
                value={tds ? `${formatTdsSummary(tds)} — ${tds.sectionName}` : vendor.tdsSectionId || "—"}
                mono
                isLast
              />
            ) : (
              <RecordKvRow label="TDS Section" value="—" isLast />
            )}
          </RecordSectionCard>

          <RecordSectionCard title="Bank Details" icon={Landmark} accent="purple">
            <RecordKvRow label="Account Holder" value={vendor.supplierName || "—"} highlight />
            {vendor.bankAccounts && vendor.bankAccounts.length > 0 ? (
              <>
                <RecordKvRow label="Bank Name" value={String(vendor.bankAccounts[0].bank_name || "—")} />
                <RecordKvRow label="Branch" value={String(vendor.bankAccounts[0].branch_name || "—")} />
                <RecordKvRow label="Account Number" value={String(vendor.bankAccounts[0].account_number || "—")} mono copy />
                <RecordKvRow label="IFSC Code" value={String(vendor.bankAccounts[0].ifsc_code || "—")} mono copy isLast />
              </>
            ) : (
              <RecordKvRow label="Bank Details" value="—" isLast />
            )}
          </RecordSectionCard>

          <RecordSectionCard title="Audit" icon={Clock} accent="orange">
            <RecordKvRow label="Created By" value={vendor.createdBy} />
            <RecordKvRow label="Created Date" value={vendor.createdAt} mono />
            <RecordKvRow label="Updated By" value={vendor.updatedBy} />
            <RecordKvRow label="Updated Date" value={vendor.updatedAt} mono />
            <RecordKvRow
              label="Status"
              value={vendor.status === "active" ? "Active" : "Inactive"}
              isLast
            />
          </RecordSectionCard>

          <RecordSectionCard
            title="Mapped Products"
            icon={Package}
            accent="blue"
            className="lg:col-span-2"
          >
            {mappedProducts.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4">
                No products linked to this supplier. Assign a supplier in Product Master.
              </p>
            ) : (
              <div className="overflow-hidden border border-border rounded-lg">
                <div className="overflow-x-auto">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="px-3 py-2 text-left font-semibold text-foreground">Product Code</th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground">Product Name</th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground">SKU</th>
                        <th className="px-3 py-2 text-left font-semibold text-foreground">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {mappedProducts.map((product: any) => (
                        <tr
                          key={product.product_id}
                          className="border-b border-border/60 last:border-0 hover:bg-muted/20"
                        >
                          <td className="px-3 py-2">
                            <Link
                              href={`/masters/products/${product.product_id}`}
                              className="font-mono font-semibold text-brand-700 hover:underline"
                            >
                              {product.product_code}
                            </Link>
                          </td>
                          <td className="px-3 py-2 font-medium text-foreground">{product.product_name}</td>
                          <td className="px-3 py-2 font-mono text-muted-foreground">{product.sku || "—"}</td>
                          <td className="px-3 py-2 capitalize text-muted-foreground">{product.status}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </RecordSectionCard>
        </div>
      </div>
    </RecordDetailPage>
  );
}
