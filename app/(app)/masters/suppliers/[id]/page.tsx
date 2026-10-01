"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import { Building2, Clock, FileText, IndianRupee, Mail, MapPin, Pencil, Phone, Truck } from "lucide-react";
import {
  getPaymentTermLabel,
  loadSuppliers,
  saveSuppliers,
  type Supplier,
  type SupplierStatus,
} from "../supplier-data";

function TypeBadge({ label }: { label: string }) {
  return (
    <span className="inline-flex items-center rounded-md bg-brand-50 border border-brand-100 px-2 py-0.5 text-[11px] font-semibold text-brand-700">
      {label}
    </span>
  );
}

export default function SupplierDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [records, setRecords] = useState<Supplier[]>([]);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const list = loadSuppliers();
    setRecords(list);
    setSupplier(list.find((item) => item.id === Number(id)) ?? null);
  }, [id]);

  const updateStatus = (status: SupplierStatus) => {
    if (!supplier) return;
    const updated = records.map((item) =>
      item.id === supplier.id
        ? {
            ...item,
            status,
            updatedBy: "Admin",
            updatedDate: new Date().toISOString().slice(0, 10),
          }
        : item,
    );
    setRecords(updated);
    saveSuppliers(updated);
    setSupplier(updated.find((item) => item.id === supplier.id) ?? null);
  };

  if (!supplier) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-[#6B80A0]">Supplier not found.</p>
          <Link href="/masters/suppliers" className="mt-2 inline-block text-xs text-[#1554B4]">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  const tabs = [
    { value: "overview", label: "Overview" },
    { value: "tax", label: "Tax & Compliance" },
    { value: "bank", label: "Bank Details" },
    { value: "po", label: "PO History", count: 0 },
    { value: "grn", label: "GRN History", count: 0 },
    { value: "activity", label: "Activity" },
  ];

  const kpis = [
    { icon: Truck, iconBg: "#E8F4FD", iconColor: "#1554B4", value: "0", label: "Total POs" },
    { icon: IndianRupee, iconBg: "#E6F7EF", iconColor: "#1E9E61", value: "₹ 0.00", label: "Total Value" },
    { icon: Clock, iconBg: "#FFF4E6", iconColor: "#E87B35", value: "0", label: "Pending GRN" },
    { icon: Clock, iconBg: "#F3EEFF", iconColor: "#7C5CBF", value: "—", label: "Last PO" },
    { icon: IndianRupee, iconBg: "#FEECEC", iconColor: "#D14343", value: "₹ 0.00", label: "Outstanding" },
  ];

  const renderTab = () => {
    switch (activeTab) {
      case "overview":
        return (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <RecordSectionCard title="Supplier Details" icon={Building2} accent="blue">
              <RecordKvRow label="Supplier Name" value={supplier.supplierName} highlight />
              <RecordKvRow label="Code" value={supplier.supplierCode} mono copy />
              <RecordKvRow label="Mobile" value={supplier.mobile} mono link href={`tel:${supplier.mobile}`} />
              <RecordKvRow label="Email" value={supplier.email || "—"} link={!!supplier.email} href={supplier.email ? `mailto:${supplier.email}` : undefined} />
              <RecordKvRow
                label="Status"
                value={<RecordStatusPill label={supplier.status === "active" ? "Active" : "Inactive"} variant={supplier.status} />}
                isLast
              />
            </RecordSectionCard>
            <RecordSectionCard title="Address" icon={MapPin} accent="purple">
              <RecordKvRow label="Address" value={supplier.address} isLast />
            </RecordSectionCard>
          </div>
        );
      case "tax":
        return (
          <RecordSectionCard title="Tax & Registration" icon={FileText} accent="blue">
            <RecordKvRow label="GSTIN" value={supplier.gstin} mono copy />
            <RecordKvRow label="CIB Regn #" value={supplier.cibRegn} />
            <RecordKvRow label="CIB Expiry" value={supplier.cibRegnExpiry} />
            <RecordKvRow label="FCO Regn #" value={supplier.fcoRegn} />
            <RecordKvRow label="FCO Expiry" value={supplier.fcoRegnExpiry} isLast />
          </RecordSectionCard>
        );
      case "bank":
        return (
          <RecordSectionCard title="Bank Details" icon={IndianRupee} accent="green">
            <p className="text-sm text-[#6B80A0] py-4">No bank details on file.</p>
          </RecordSectionCard>
        );
      case "po":
      case "grn":
        return (
          <RecordSectionCard title={activeTab === "po" ? "PO History" : "GRN History"} icon={Truck} accent="blue">
            <p className="text-sm text-[#6B80A0] py-4">No records yet.</p>
          </RecordSectionCard>
        );
      case "activity":
        return (
          <RecordSectionCard title="Activity" icon={Clock} accent="slate">
            <p className="text-sm text-[#6B80A0] py-4">No activity recorded.</p>
          </RecordSectionCard>
        );
      default:
        return null;
    }
  };

  return (
    <RecordDetailPage
        listHref="/masters/suppliers"
        listLabel="Suppliers"
        recordName={supplier.supplierName}
        recordCode={supplier.supplierCode}
        typeBadge={<TypeBadge label="Supplier" />}
        statusLabel={supplier.status === "active" ? "Active" : "Inactive"}
        statusVariant={supplier.status}
        metaItems={[
          { label: supplier.mobile, icon: Phone, href: `tel:${supplier.mobile}` },
          ...(supplier.email ? [{ label: supplier.email, icon: Mail, href: `mailto:${supplier.email}` }] : []),
        ]}
        kpis={kpis}
        tabs={tabs}
        activeTab={activeTab}
        onTabChange={setActiveTab}
        active={supplier.status === "active"}
        onActiveChange={(on) => updateStatus(on ? "active" : "inactive")}
        onEdit={() => router.push(`/masters/suppliers/${supplier.id}/edit`)}
        secondaryAction={{
          label: "New PO",
          onClick: () => router.push("/procurement/purchase-orders/new"),
        }}
        sidebar={{
          quickActions: [
            {
              label: "New PO",
              icon: Truck,
              onClick: () => router.push("/procurement/purchase-orders/new"),
              variant: "primary",
            },
            {
              label: "Edit Supplier",
              icon: Pencil,
              onClick: () => router.push(`/masters/suppliers/${supplier.id}/edit`),
              variant: "outline",
            },
          ],
          summary: [
            { label: "Payment Terms", value: getPaymentTermLabel(supplier.paymentTerms), highlight: true },
            { label: "GSTIN", value: supplier.gstin || "—" },
            { label: "Created By", value: supplier.createdBy },
            { label: "Created", value: supplier.createdDate },
            { label: "Updated", value: supplier.updatedDate },
          ],
          activity: [],
        }}
      >
        {renderTab()}
      </RecordDetailPage>
  );
}
