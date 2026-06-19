"use client";

import React, { useEffect, useMemo, useState } from "react";
import { useParams, useRouter } from "next/navigation";
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
  Phone,
  User,
} from "lucide-react";
import {
  formatPaymentTerms,
  getVendorById,
  type Vendor,
} from "../vendor-data";
import { getGstCategoryLabel, deriveGstRegistered } from "@/lib/masters/gst-compliance";
import { getActiveTDSMasters, formatTdsSummary } from "../../tds/tds-data";

function formatMobile(code: string, mobile: string) {
  if (!mobile) return "—";
  return `${code} ${mobile}`.trim();
}

function formatAddress(vendor: Vendor) {
  const a = vendor.billingAddress;
  const lines = [a.line1, a.line2, a.city, a.state, a.pincode, a.country]
    .filter(Boolean)
    .join(", ");
  return lines || "—";
}

export default function ViewVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [vendor, setVendor] = useState<Vendor | null>(null);

  const tds = useMemo(() => {
    if (!vendor?.tdsMasterId) return null;
    return getActiveTDSMasters().find((t) => t.id === vendor.tdsMasterId) ?? null;
  }, [vendor?.tdsMasterId]);

  useEffect(() => {
    const v = getVendorById(id);
    if (!v) {
      router.replace("/masters/vendors");
      return;
    }
    setVendor(v);
  }, [id, router]);

  if (!vendor) return null;

  const gstRegistered = deriveGstRegistered(
    vendor.gstApplicable,
    vendor.gstNumber,
    vendor.gstCategory,
  );

  return (
    <RecordDetailPage
      listHref="/masters/vendors"
      listLabel="Vendors"
      recordName={vendor.vendorName}
      statusLabel={vendor.status === "active" ? "Active" : "Inactive"}
      statusVariant={vendor.status}
      metaItems={[
        ...(vendor.contactPerson
          ? [{ label: vendor.contactPerson, icon: User }]
          : []),
        ...(vendor.mobile
          ? [{
              label: formatMobile(vendor.mobileCountryCode, vendor.mobile),
              icon: Phone,
              href: `tel:${vendor.mobile}`,
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
          value: vendor.vendorType || "—",
          label: "Vendor Type",
        },
        {
          icon: FileText,
          iconBg: "#E6F7EF",
          iconColor: "#1E9E61",
          value: vendor.gstNumber || "—",
          label: "GST Number",
        },
        {
          icon: Clock,
          iconBg: "#FFFBEB",
          iconColor: "#D97706",
          value: formatPaymentTerms(vendor.paymentTerms),
          label: "Payment Terms",
        },
      ]}
      onEdit={() => router.push(`/masters/vendors/${id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Vendor",
            onClick: () => router.push(`/masters/vendors/${id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Vendor Code", value: vendor.vendorCode || "—", highlight: true },
          { label: "Vendor Type", value: vendor.vendorType || "—" },
          { label: "GST", value: vendor.gstNumber || "—" },
          { label: "PAN", value: vendor.panNumber || "—" },
          { label: "Payment Terms", value: formatPaymentTerms(vendor.paymentTerms) },
          { label: "Created", value: vendor.createdDate },
          { label: "Updated", value: vendor.updatedDate },
        ],
      }}
    >
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecordSectionCard title="Vendor Information" icon={Building2} accent="blue">
          <RecordKvRow label="Vendor Code" value={vendor.vendorCode || "—"} mono highlight />
          <RecordKvRow label="Vendor Name" value={vendor.vendorName} highlight />
          <RecordKvRow label="Vendor Type" value={vendor.vendorType || "—"} />
          <RecordKvRow label="Payment Terms" value={formatPaymentTerms(vendor.paymentTerms)} />
          <RecordKvRow label="Contact Person" value={vendor.contactPerson || "—"} />
          <RecordKvRow
            label="Mobile Number"
            value={formatMobile(vendor.mobileCountryCode, vendor.mobile)}
            mono
            link={!!vendor.mobile}
            href={vendor.mobile ? `tel:${vendor.mobile}` : undefined}
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
          <RecordKvRow label="Address Line 1" value={vendor.billingAddress.line1 || "—"} />
          {vendor.billingAddress.line2 && (
            <RecordKvRow label="Address Line 2" value={vendor.billingAddress.line2} />
          )}
          <RecordKvRow label="Pincode" value={vendor.billingAddress.pincode || "—"} mono />
          <RecordKvRow label="Country" value={vendor.billingAddress.country || "—"} />
          <RecordKvRow label="State" value={vendor.billingAddress.state || "—"} />
          <RecordKvRow label="City" value={vendor.billingAddress.city || "—"} isLast />
        </RecordSectionCard>

        <RecordSectionCard title="Tax & Registration" icon={FileText} accent="orange">
          <RecordKvRow label="GST Registered" value={gstRegistered ? "Yes" : "No"} />
          {gstRegistered && (
            <>
              <RecordKvRow
                label="GST Registration Type"
                value={getGstCategoryLabel(vendor.gstCategory ?? "regular")}
              />
              <RecordKvRow label="GSTIN Number" value={vendor.gstNumber} mono copy />
            </>
          )}
          <RecordKvRow label="PAN Number" value={vendor.panNumber || "—"} mono copy />
          <RecordKvRow label="TAN Number" value={vendor.tanNumber || "—"} mono copy />
          <RecordKvRow label="MSME Registered" value={vendor.msmeRegistered ? "Yes" : "No"} />
          {vendor.msmeRegistered && (
            <RecordKvRow label="MSME Number" value={vendor.msmeNumber || "—"} mono copy />
          )}
          <RecordKvRow label="TDS Applicable" value={vendor.tdsApplicable ? "Yes" : "No"} />
          {vendor.tdsApplicable ? (
            <RecordKvRow
              label="TDS Section"
              value={tds ? `${formatTdsSummary(tds)} — ${tds.sectionName}` : "—"}
              mono
              isLast
            />
          ) : (
            <RecordKvRow label="TDS Section" value="—" isLast />
          )}
        </RecordSectionCard>

        <RecordSectionCard title="Bank Details" icon={Landmark} accent="purple">
          <RecordKvRow label="Account Holder" value={vendor.accountHolderName || "—"} highlight />
          <RecordKvRow label="Bank Name" value={vendor.bankName || "—"} />
          <RecordKvRow label="Branch" value={vendor.branch || "—"} />
          <RecordKvRow label="Account Number" value={vendor.accountNumber || "—"} mono copy />
          <RecordKvRow label="IFSC Code" value={vendor.ifscCode || "—"} mono copy isLast />
        </RecordSectionCard>

        <RecordSectionCard title="Audit" icon={Clock} accent="orange">
          <RecordKvRow label="Created By" value={vendor.createdBy} />
          <RecordKvRow label="Created Date" value={vendor.createdDate} mono />
          <RecordKvRow label="Updated By" value={vendor.updatedBy} />
          <RecordKvRow label="Updated Date" value={vendor.updatedDate} mono />
          <RecordKvRow
            label="Status"
            value={vendor.status === "active" ? "Active" : "Inactive"}
            isLast
          />
        </RecordSectionCard>
      </div>
    </RecordDetailPage>
  );
}
