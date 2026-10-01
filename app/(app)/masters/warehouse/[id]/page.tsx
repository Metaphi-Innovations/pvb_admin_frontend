"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
  RecordMiniTable,
} from "@/components/record-detail";
import { Clock, Mail, MapPin, Pencil, Phone, User, Warehouse, FileText } from "lucide-react";
import {
	type WarehouseMaster,
	type WarehouseStatus,
	type WarehouseDocument,
	loadWarehouses,
	formatStatus,
} from "../warehouse-data";
import { AppLayout } from "@/components/layout/AppLayout";

const STATUS_LABEL: Record<WarehouseStatus, string> = {
  active: "Active",
  inactive: "Inactive",
  under_maintenance: "Under Maintenance",
  closed: "Closed",
};

const STATUS_VARIANT: Record<WarehouseStatus, "active" | "inactive" | "neutral" | "blocked"> = {
  active: "active",
  inactive: "inactive",
  under_maintenance: "neutral",
  closed: "blocked",
};

export default function WarehouseDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [warehouse, setWarehouse] = useState<WarehouseMaster | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

	useEffect(() => {
		const list = loadWarehouses();
		setWarehouse(list.find((w) => w.id === Number(id)) ?? null);
	}, [id]);

  if (!warehouse) {
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
          <Link
            href="/masters/warehouse"
            className="inline-block mt-2 text-xs text-brand-600 hover:underline"
          >
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const contacts = warehouse.contacts?.length
     ? warehouse.contacts
     : [
         {
           id: "CON-1",
           contactPerson: warehouse.contactPerson,
           mobileNumber: warehouse.mobileNumber,
           emailAddress: warehouse.emailAddress,
           isPrimary: true,
         },
       ];

  const primaryContact = contacts.find((c) => c.isPrimary) ?? contacts[0];
  const designation =
    primaryContact?.designation?.trim() || warehouse.manager || "—";

  const tabs = [{ value: "overview", label: "Overview" }];

  const kpis = [
    {
      icon: Warehouse,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: warehouse.operatedBy,
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

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <RecordSectionCard title="Basic Details" icon={Warehouse} accent="blue">
          <RecordKvRow label="Warehouse Name" value={warehouse.warehouseName} highlight />
          <RecordKvRow label="Operated By" value={warehouse.operatedBy} />
          {warehouse.operatedBy === "C&F Agent" && (
            <RecordKvRow label="C&F Agent" value={warehouse.customerType} />
          )}
          <RecordKvRow
            label="Status"
            value={
              <RecordStatusPill
                label={STATUS_LABEL[warehouse.status]}
                variant={STATUS_VARIANT[warehouse.status]}
              />
            }
            isLast
          />
        </RecordSectionCard>

        <RecordSectionCard title="Contact Persons" icon={Phone} accent="green">
          {contacts.map((c, idx) => (
            <React.Fragment key={c.id || idx}>
              <RecordKvRow
                label={c.isPrimary ? "Primary Contact" : `Contact ${idx + 1}`}
                value={c.contactPerson || "—"}
                highlight
              />
              {(c.designation || warehouse.manager) && (
                <RecordKvRow
                  label="Designation"
                  value={c.designation || (c.isPrimary ? warehouse.manager : "—") || "—"}
                />
              )}
              <RecordKvRow
                label="Mobile"
                value={c.mobileNumber}
                mono
                link
                href={c.mobileNumber ? `tel:${c.mobileNumber}` : undefined}
              />
              {c.alternateContact && (
                <RecordKvRow
                  label="Alternate Contact"
                  value={c.alternateContact}
                  mono
                  link
                  href={`tel:${c.alternateContact}`}
                />
              )}
              <RecordKvRow
                label="Email"
                value={c.emailAddress || "—"}
                link={!!c.emailAddress}
                href={c.emailAddress ? `mailto:${c.emailAddress}` : undefined}
                isLast={idx === contacts.length - 1}
              />
            </React.Fragment>
          ))}
        </RecordSectionCard>

        <RecordSectionCard title="Address Details" icon={MapPin} accent="purple">
          <RecordKvRow label="Address Line 1" value={warehouse.address || "—"} />
          {warehouse.addressLine2 ? (
            <RecordKvRow label="Address Line 2" value={warehouse.addressLine2} />
          ) : null}
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
              <RecordKvRow
                label="Registration Type"
                value={warehouse.gstRegistrationType || "—"}
              />
              <RecordKvRow label="GSTIN" value={warehouse.gstNumber} mono copy />
              <RecordKvRow
                label="Registered Legal Name"
                value={warehouse.registeredLegalName || "—"}
              />
              <RecordKvRow
                label="Registered GST Address"
                value={warehouse.registeredAddress || "—"}
                isLast
              />
            </>
          )}
        </RecordSectionCard>

        <RecordSectionCard title="Bank Details" icon={FileText} accent="blue">
          <RecordKvRow
            label="Account Holder Name"
            value={warehouse.accountHolderName || "—"}
          />
          <RecordKvRow label="Bank Name" value={warehouse.bankName || "—"} />
          <RecordKvRow label="Branch Name" value={warehouse.branch || "—"} />
          <RecordKvRow
            label="Account Number"
            value={warehouse.accountNumber || "—"}
            mono
          />
          <RecordKvRow
            label="IFSC Code"
            value={warehouse.ifscCode || "—"}
            mono
          />
          <RecordKvRow
            label="SWIFT Code"
            value={warehouse.swiftCode || "—"}
            mono
            isLast
          />
        </RecordSectionCard>

        <div className="lg:col-span-2">
          <RecordSectionCard title="Warehouse Documents" icon={FileText} accent="blue">
            {(!warehouse.documents || warehouse.documents.length === 0) ? (
              <div className="py-6 text-center text-xs text-muted-foreground">
                No documents uploaded.
              </div>
            ) : (
              <RecordMiniTable
                columns={[
                  {
                    key: "documentName",
                    header: "Document Name",
                    render: (r: WarehouseDocument) => <span className="font-medium">{r.documentName}</span>,
                  },
                  {
                    key: "fileName",
                    header: "File Name",
                    render: (r: WarehouseDocument) =>
                      r.fileName ? (
                        <button
                          type="button"
                          className="text-brand-600 hover:underline text-left font-mono text-[11px]"
                          onClick={() => {
                            const url = r.fileUrl;
                            if (!url) return;
                            const trimmedUrl = url.trim();
                            if (!trimmedUrl) return;
                            const isAbsolute =
                              /^https?:\/\//i.test(trimmedUrl) ||
                              /^blob:/i.test(trimmedUrl) ||
                              /^data:/i.test(trimmedUrl);
                            const safeUrl = isAbsolute ? trimmedUrl : `https://${trimmedUrl}`;
                            window.open(safeUrl, "_blank", "noopener,noreferrer");
                          }}
                        >
                          {r.fileName}
                        </button>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      ),
                  },
                  {
                    key: "uploadedAt",
                    header: "Uploaded At",
                    render: (r: WarehouseDocument) => <span className="text-muted-foreground">{r.uploadedAt || "—"}</span>,
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
            <RecordKvRow label="Created Date" value={warehouse.createdDate} />
            <RecordKvRow label="Updated By" value={warehouse.updatedBy} />
            <RecordKvRow label="Updated Date" value={warehouse.updatedDate} isLast />
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
      statusLabel={STATUS_LABEL[warehouse.status]}
      statusVariant={STATUS_VARIANT[warehouse.status]}
      metaItems={[
        {
          label: warehouse.contactPerson,
          icon: User,
        },
        {
          label: warehouse.mobileNumber,
          icon: Phone,
          href: `tel:${warehouse.mobileNumber}`,
        },
        ...(warehouse.emailAddress
          ? [{ label: warehouse.emailAddress, icon: Mail, href: `mailto:${warehouse.emailAddress}` }]
          : []),
      ]}
      kpis={kpis}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/warehouse/${warehouse.id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Warehouse",
            icon: Pencil,
            onClick: () => router.push(`/masters/warehouse/${warehouse.id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Operated By", value: warehouse.operatedBy, highlight: true },
          { label: "Designation", value: designation },
          { label: "City", value: warehouse.city || "—" },
          { label: "Created", value: warehouse.createdDate },
          { label: "Updated", value: warehouse.updatedDate },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
