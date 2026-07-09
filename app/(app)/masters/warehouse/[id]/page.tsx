"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
  RecordMiniTable,
} from "@/components/record-detail";
import { Clock, MapPin, Pencil, Phone, User, Warehouse, FileText } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
import { useWarehouse } from "@/hooks/masters";
import type { WarehouseListRecord } from "@/services/warehouse-list.service";

function formatStatus(status: string): string {
  if (status === "Under Maintenance" || status === "under_maintenance") return "Under Maintenance";
  if (status === "Closed" || status === "closed") return "Closed";
  if (status === "Active" || status === "active") return "Active";
  if (status === "Inactive" || status === "inactive") return "Inactive";
  return status;
}

const STATUS_VARIANT: Record<string, "active" | "inactive" | "neutral" | "blocked"> = {
  Active: "active",
  active: "active",
  Inactive: "inactive",
  inactive: "inactive",
  "Under Maintenance": "neutral",
  under_maintenance: "neutral",
  Closed: "blocked",
  closed: "blocked",
};

export default function WarehouseDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: warehouse, isLoading, isError } = useWarehouse(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading warehouse details...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !warehouse) {
    return (
      <RecordDetailPage
        listHref="/masters/warehouse"
        listLabel="Warehouses"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Warehouse not found.</p>
          <Link href="/masters/warehouse" className="inline-block mt-2 text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const primaryContact = warehouse.contacts?.[0];
  const designation = primaryContact?.designation?.trim() || "—";

  const kpis = [
    {
      icon: Warehouse,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: warehouse.operatedBy || "—",
      label: "Operated By",
    },
    {
      icon: MapPin,
      iconBg: "#E6F7EF",
      iconColor: "#1E9E61",
      value: warehouse.city || "—",
      label: "City",
    },
    {
      icon: User,
      iconBg: "#FFFBEB",
      iconColor: "#D97706",
      value: designation,
      label: "Designation",
    },
  ];

  const tabs = [{ value: "overview", label: "Overview" }];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecordSectionCard title="Basic Details" icon={Warehouse} accent="blue">
          <RecordKvRow label="Warehouse Name" value={warehouse.warehouseName} highlight />
          <RecordKvRow label="Operated By" value={warehouse.operatedBy || "—"} />
          <RecordKvRow
            label="Status"
            value={
              <RecordStatusPill
                label={formatStatus(warehouse.status)}
                variant={STATUS_VARIANT[warehouse.status] ?? "neutral"}
              />
            }
            isLast
          />
        </RecordSectionCard>

        <RecordSectionCard title="Contact Persons" icon={Phone} accent="green">
          {warehouse.contacts && warehouse.contacts.length > 0 ? (
            warehouse.contacts.map((c, idx) => (
              <React.Fragment key={idx}>
                <RecordKvRow
                  label={c.is_primary ? "Primary Contact" : `Contact ${idx + 1}`}
                  value={c.contact_person || "—"}
                  highlight
                />
                {c.designation && (
                  <RecordKvRow label="Designation" value={c.designation} />
                )}
                <RecordKvRow
                  label="Mobile"
                  value={c.mobile_number}
                  mono
                  link
                  href={c.mobile_number ? `tel:${c.mobile_number}` : undefined}
                />
                {c.alternate_contact && (
                  <RecordKvRow
                    label="Alternate Contact"
                    value={c.alternate_contact}
                    mono
                    link
                    href={`tel:${c.alternate_contact}`}
                  />
                )}
                <RecordKvRow
                  label="Email"
                  value={c.email_address || "—"}
                  link={!!c.email_address}
                  href={c.email_address ? `mailto:${c.email_address}` : undefined}
                  isLast={idx === (warehouse.contacts?.length ?? 1) - 1}
                />
              </React.Fragment>
            ))
          ) : (
            <RecordKvRow label="No contacts" value="—" isLast />
          )}
        </RecordSectionCard>

        <RecordSectionCard title="Address Details" icon={MapPin} accent="purple">
          <RecordKvRow label="Address Line 1" value={warehouse.address || "—"} />
          {warehouse.address1 && <RecordKvRow label="Address Line 2" value={warehouse.address1} />}
          <RecordKvRow label="Pin Code" value={warehouse.pincode} mono />
          <RecordKvRow label="District" value={warehouse.district || "—"} />
          <RecordKvRow label="City" value={warehouse.city || "—"} />
          <RecordKvRow label="Town" value={warehouse.town || "—"} />
          <RecordKvRow label="State" value={warehouse.state || "—"} isLast />
        </RecordSectionCard>

        <RecordSectionCard title="GST & Tax Details" icon={FileText} accent="orange">
          <RecordKvRow
            label="GST Applicable"
            value={warehouse.gstApplicable ? "Yes" : "No"}
            isLast={!warehouse.gstApplicable}
          />
          {warehouse.gstApplicable && (
            <>
              <RecordKvRow label="Registration Type" value={warehouse.registrationType || "—"} />
              <RecordKvRow label="GSTIN" value={warehouse.gstNumber} mono copy />
              <RecordKvRow label="Registered Legal Name" value={warehouse.registeredLegalName || "—"} />
              <RecordKvRow label="Registered GST Address" value={warehouse.registeredGstAddress || "—"} isLast />
            </>
          )}
        </RecordSectionCard>

        <RecordSectionCard title="Bank Details" icon={FileText} accent="blue">
          <RecordKvRow label="Account Holder Name" value={warehouse.accountHolderName || "—"} />
          <RecordKvRow label="Bank Name" value={warehouse.bankName || "—"} />
          <RecordKvRow label="Branch Name" value={warehouse.branchName || "—"} />
          <RecordKvRow label="Account Number" value={warehouse.accountNumber || "—"} mono />
          <RecordKvRow label="IFSC Code" value={warehouse.ifscCode || "—"} mono />
          <RecordKvRow label="SWIFT Code" value={warehouse.swiftCode || "—"} mono isLast />
        </RecordSectionCard>

        <div className="lg:col-span-2">
          <RecordSectionCard title="Warehouse Documents" icon={FileText} accent="blue">
            {(!warehouse.documents || warehouse.documents.length === 0) ? (
              <div className="py-6 text-center text-xs text-muted-foreground">No documents uploaded.</div>
            ) : (
              <RecordMiniTable
                columns={[
                  {
                    key: "document_name",
                    header: "Document Name",
                    render: (r: { document_name: string }) => <span className="font-medium">{r.document_name}</span>,
                  },
                ]}
                rows={warehouse.documents}
              />
            )}
          </RecordSectionCard>
        </div>

        <div className="lg:col-span-2">
          <RecordSectionCard title="Audit Details" icon={Clock} accent="slate">
            <RecordKvRow label="Created By" value={warehouse.createdBy} />
            <RecordKvRow label="Created Date" value={warehouse.createdAt} />
            <RecordKvRow label="Updated By" value={warehouse.updatedBy} />
            <RecordKvRow label="Updated Date" value={warehouse.updatedAt} isLast />
          </RecordSectionCard>
        </div>
      </div>
    );
  };

  return (
    <RecordDetailPage
      listHref="/masters/warehouse"
      listLabel="Warehouses"
      recordName={warehouse.warehouseName}
      statusLabel={formatStatus(warehouse.status)}
      statusVariant={STATUS_VARIANT[warehouse.status] ?? "neutral"}
      kpis={kpis}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/warehouse/${warehouse.warehouseUuid}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Warehouse",
            icon: Pencil,
            onClick: () => router.push(`/masters/warehouse/${warehouse.warehouseUuid}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Operated By", value: warehouse.operatedBy || "—", highlight: true },
          { label: "City", value: warehouse.city || "—" },
          { label: "Created", value: warehouse.createdAt },
          { label: "Updated", value: warehouse.updatedAt },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
