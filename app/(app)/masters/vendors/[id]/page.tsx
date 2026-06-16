"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordMiniTable,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import {
  Building2,
  Clock,
  FileText,
  Landmark,
  Mail,
  MapPin,
  Package,
  Pencil,
  Phone,
  Users,
} from "lucide-react";
import {
  formatCreditPeriod,
  getVendorById,
  type Vendor,
  type VendorContact,
  type VendorDocument,
  type VendorProductMapping,
} from "../vendor-data";
import { formatMoney } from "@/lib/accounts/money-format";

function formatMobile(code: string, mobile: string) {
  if (!mobile) return "—";
  return `${code} ${mobile}`.trim();
}

function formatAddress(addr: Vendor["billingAddress"]) {
  const parts = [addr.line1, addr.line2, addr.city, addr.state, addr.country, addr.pincode].filter(Boolean);
  return parts.length ? parts.join(", ") : "—";
}

function tdsLabel(v: Vendor) {
  if (!v.tdsApplicable) return "Not applicable";
  if (v.tdsPercentage === "custom") return `${v.tdsCustomPercent || "—"}%`;
  const opt = v.tdsPercentage ? `${v.tdsPercentage}%` : "—";
  return opt;
}

export default function ViewVendorPage() {
  const params = useParams();
  const router = useRouter();
  const id = Number(params.id);
  const [vendor, setVendor] = useState<Vendor | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const v = getVendorById(id);
    if (!v) {
      router.replace("/masters/vendors");
      return;
    }
    setVendor(v);
  }, [id, router]);

  if (!vendor) return null;

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "contact", label: "Contact" },
    { value: "banking", label: "Banking" },
    { value: "products", label: "Products", count: vendor.vendorProducts?.length ?? 0 },
    { value: "documents", label: "Documents", count: vendor.documents.filter((d) => d.uploaded).length },
  ];

  const kpis = [
    {
      icon: Package,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: String(vendor.vendorProducts?.length ?? 0),
      label: "Products Mapped",
    },
    {
      icon: Users,
      iconBg: "#E6F7EF",
      iconColor: "#1E9E61",
      value: String(vendor.contacts.length),
      label: "Contacts",
    },
    {
      icon: FileText,
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
      value: String(vendor.documents.filter((d) => d.uploaded).length),
      label: "Documents",
    },
    {
      icon: Clock,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
      value: formatCreditPeriod(vendor),
      label: "Credit Period",
    },
  ];

  const productColumns = [
    {
      key: "product",
      header: "Product",
      render: (r: VendorProductMapping) => (
        <span className="font-medium text-[#3D5473]">{r.productName}</span>
      ),
    },
    {
      key: "sku",
      header: "SKU",
      render: (r: VendorProductMapping) => (
        <span className="font-mono text-[12px]">{r.sku || "—"}</span>
      ),
    },
    {
      key: "price",
      header: "Price",
      align: "right" as const,
      render: (r: VendorProductMapping) => (
        <span className="font-bold tabular-nums">{r.price != null ? formatMoney(r.price) : "—"}</span>
      ),
    },
    {
      key: "status",
      header: "Status",
      render: (r: VendorProductMapping) => (
        <RecordStatusPill
          label={r.status}
          variant={r.status === "Active" ? "active" : "inactive"}
        />
      ),
    },
  ];

  const contactColumns = [
    {
      key: "name",
      header: "Name",
      render: (r: VendorContact) => <span className="font-medium">{r.name || "—"}</span>,
    },
    {
      key: "designation",
      header: "Designation",
      render: (r: VendorContact) => <span>{r.designation || "—"}</span>,
    },
    {
      key: "mobile",
      header: "Mobile",
      render: (r: VendorContact) => (
        <span className="font-mono text-[12px]">{formatMobile(r.countryCode, r.mobile)}</span>
      ),
    },
    {
      key: "email",
      header: "Email",
      render: (r: VendorContact) => <span>{r.email || "—"}</span>,
    },
  ];

  const documentColumns = [
    {
      key: "name",
      header: "Document",
      render: (r: VendorDocument) => <span className="font-medium">{r.documentName}</span>,
    },
    {
      key: "file",
      header: "File",
      render: (r: VendorDocument) => <span className="font-mono text-[12px]">{r.fileName || "—"}</span>,
    },
    {
      key: "status",
      header: "Status",
      render: (r: VendorDocument) => (
        <RecordStatusPill
          label={r.uploaded ? "Uploaded" : "Pending"}
          variant={r.uploaded ? "active" : "draft"}
        />
      ),
    },
  ];

  const renderTabContent = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecordSectionCard title="Basic Details" icon={Building2} accent="blue">
              <RecordKvRow label="Vendor Name" value={vendor.vendorName} highlight />
              <RecordKvRow label="Vendor Code" value={vendor.vendorCode} mono copy />
              <RecordKvRow label="Company Name" value={vendor.companyName} />
              <RecordKvRow label="Legal Company Name" value={vendor.legalCompanyName} />
              <RecordKvRow
                label="Mobile"
                value={formatMobile(vendor.mobileCountryCode, vendor.mobile)}
                mono
                link
                href={`tel:${vendor.mobile}`}
              />
              <RecordKvRow
                label="Email"
                value={vendor.email || "—"}
                link={!!vendor.email}
                href={vendor.email ? `mailto:${vendor.email}` : undefined}
              />
              <RecordKvRow label="Tags" value={vendor.tags || "—"} isLast />
            </RecordSectionCard>

            <RecordSectionCard title="Tax & Compliance" icon={FileText} accent="green">
              <RecordKvRow label="GST Applicable" value={vendor.gstApplicable ? "Yes" : "No"} />
              {vendor.gstApplicable && (
                <RecordKvRow label="GST Number" value={vendor.gstNumber} mono copy />
              )}
              <RecordKvRow label="TDS Applicable" value={vendor.tdsApplicable ? "Yes" : "No"} />
              {vendor.tdsApplicable && (
                <RecordKvRow label="TDS %" value={tdsLabel(vendor)} />
              )}
              <RecordKvRow label="TCS Applicable" value={vendor.tcsApplicable ? "Yes" : "No"} />
              <RecordKvRow label="PAN Number" value={vendor.panNumber} mono copy />
              <RecordKvRow label="Credit Period" value={formatCreditPeriod(vendor)} isLast />
            </RecordSectionCard>

            <div className="lg:col-span-2">
              <RecordSectionCard title="Billing Address" icon={MapPin} accent="purple">
                <RecordKvRow label="Address Line 1" value={vendor.billingAddress.line1} />
                <RecordKvRow label="Address Line 2" value={vendor.billingAddress.line2} />
                <RecordKvRow label="City" value={vendor.billingAddress.city} />
                <RecordKvRow label="State" value={vendor.billingAddress.state} />
                <RecordKvRow label="Country" value={vendor.billingAddress.country} />
                <RecordKvRow label="Pincode" value={vendor.billingAddress.pincode} mono isLast />
              </RecordSectionCard>
            </div>
          </div>
        );

      case "contact":
        return (
          <RecordSectionCard title="Contact Persons" icon={Users} accent="blue">
            <RecordMiniTable columns={contactColumns} rows={vendor.contacts} />
          </RecordSectionCard>
        );

      case "banking":
        return (
          <RecordSectionCard title="Banking Information" icon={Landmark} accent="green">
            <RecordKvRow label="Account Holder" value={vendor.accountHolderName} highlight />
            <RecordKvRow label="Bank Name" value={vendor.bankName} />
            <RecordKvRow label="Branch" value={vendor.branch} />
            <RecordKvRow label="Account Number" value={vendor.accountNumber} mono copy />
            <RecordKvRow label="IFSC Code" value={vendor.ifscCode} mono copy />
            <RecordKvRow label="SWIFT Code" value={vendor.swiftCode} mono isLast />
          </RecordSectionCard>
        );

      case "products":
        return (
          <RecordSectionCard title="Product Mappings" icon={Package} accent="orange">
            <RecordMiniTable
              columns={productColumns}
              rows={vendor.vendorProducts ?? []}
            />
          </RecordSectionCard>
        );

      case "documents":
        return (
          <div className="grid grid-cols-1 gap-4">
            <RecordSectionCard title="Documents" icon={FileText} accent="blue">
              <RecordMiniTable columns={documentColumns} rows={vendor.documents} />
            </RecordSectionCard>
            {vendor.remarks && (
              <RecordSectionCard title="Remarks" icon={FileText} accent="slate">
                <p className="text-sm text-[#3D5473] py-2 whitespace-pre-wrap">{vendor.remarks}</p>
              </RecordSectionCard>
            )}
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <RecordDetailPage
      listHref="/masters/vendors"
      listLabel="Vendors"
      recordName={vendor.vendorName}
      recordCode={vendor.vendorCode}
      statusLabel={vendor.status === "active" ? "Active" : "Inactive"}
      statusVariant={vendor.status}
      metaItems={[
        {
          label: formatMobile(vendor.mobileCountryCode, vendor.mobile),
          icon: Phone,
          href: `tel:${vendor.mobile}`,
        },
        ...(vendor.email
          ? [{ label: vendor.email, icon: Mail, href: `mailto:${vendor.email}` }]
          : []),
        { label: formatAddress(vendor.billingAddress), icon: MapPin },
      ]}
      kpis={kpis}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/vendors/${id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Vendor",
            icon: Pencil,
            onClick: () => router.push(`/masters/vendors/${id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Company", value: vendor.companyName || "—", highlight: true },
          { label: "GSTIN", value: vendor.gstApplicable ? vendor.gstNumber : "—" },
          { label: "PAN", value: vendor.panNumber || "—" },
          { label: "Credit Period", value: formatCreditPeriod(vendor) },
          { label: "Created", value: vendor.createdDate },
          { label: "Updated", value: vendor.updatedDate },
        ],
        documents: vendor.documents
          .filter((d) => d.uploaded)
          .map((d) => ({
            id: d.uid,
            name: d.documentName,
            meta: d.fileName,
            onClick: d.fileUrl ? () => window.open(d.fileUrl, "_blank") : undefined,
          })),
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
