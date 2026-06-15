"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import { Clock, Mail, MapPin, Pencil, Phone, User, Warehouse } from "lucide-react";
import {
	type WarehouseMaster,
	type WarehouseStatus,
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
            className="mt-2 inline-block text-xs text-brand-600 hover:underline"
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

  const tabs = [{ value: "overview", label: "Overview" }];

  const kpis = [
    {
      icon: Warehouse,
      iconBg: "#EEF3FB",
      iconColor: "#0C3F8A",
      value: warehouse.warehouseType,
      label: "Type",
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
      value: warehouse.manager || "—",
      label: "Manager",
    },
    {
      icon: Warehouse,
      iconBg: "#F5F3FF",
      iconColor: "#7C3AED",
      value: warehouse.capacity ? warehouse.capacity.toLocaleString() : "—",
      label: "Capacity (Sq. Ft.)",
    },
  ];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Basic Details" icon={Warehouse} accent="blue">
          <RecordKvRow label="Warehouse Name" value={warehouse.warehouseName} highlight />
          <RecordKvRow label="Warehouse Code" value={warehouse.warehouseCode} mono copy />
          <RecordKvRow label="Warehouse Type" value={warehouse.warehouseType} />
          <RecordKvRow
            label="Capacity (Sq. Ft.)"
            value={warehouse.capacity?.toLocaleString()}
          />
          <RecordKvRow label="Operated By" value={warehouse.operatedBy} />
          {warehouse.operatedBy === "C&F Agent" && (
            <RecordKvRow label="Customer Type" value={warehouse.customerType} />
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
              <RecordKvRow
                label="Mobile"
                value={c.mobileNumber}
                mono
                link
                href={c.mobileNumber ? `tel:${c.mobileNumber}` : undefined}
              />
              <RecordKvRow
                label="Email"
                value={c.emailAddress || "—"}
                link={!!c.emailAddress}
                href={c.emailAddress ? `mailto:${c.emailAddress}` : undefined}
              />
            </React.Fragment>
          ))}
          <RecordKvRow label="GST Number" value={warehouse.gstNumber} mono copy isLast />
        </RecordSectionCard>

        <RecordSectionCard title="Address Details" icon={MapPin} accent="purple">
          <RecordKvRow label="Address" value={warehouse.address} />
          <RecordKvRow label="State" value={warehouse.state} />
          <RecordKvRow label="District" value={warehouse.district} />
          <RecordKvRow label="City" value={warehouse.city} />
          <RecordKvRow label="Pin Code" value={warehouse.pincode} mono isLast />
        </RecordSectionCard>

        <RecordSectionCard title="Warehouse Manager" icon={User} accent="orange">
          <RecordKvRow label="Manager Name" value={warehouse.manager} isLast />
        </RecordSectionCard>

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
      recordCode={warehouse.warehouseCode}
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
          { label: "Type", value: warehouse.warehouseType, highlight: true },
          { label: "Operated By", value: warehouse.operatedBy },
          { label: "Manager", value: warehouse.manager || "—" },
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
