"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
} from "@/components/record-detail";
import { Pencil, Tags } from "lucide-react";
import { loadVendorTypes, type VendorTypeRecord } from "../vendor-type-data";

export default function VendorTypeDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [vendorType, setVendorType] = useState<VendorTypeRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    const list = loadVendorTypes();
    setVendorType(list.find((item) => item.id === Number(id)) ?? null);
  }, [id]);

  if (!vendorType) {
    return (
      <RecordDetailPage
        listHref="/masters/vendor-type"
        listLabel="Vendor Types"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Vendor type not found.</p>
          <Link href="/masters/vendor-type" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const tabs = [{ value: "overview", label: "Overview" }];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Vendor Type Info" icon={Tags} accent="blue">
          <RecordKvRow label="Vendor Type ID" value={String(vendorType.id)} mono />
          <RecordKvRow label="Vendor Type Name" value={vendorType.vendorTypeName} />
          <RecordKvRow label="Initial Code" value={vendorType.initialCode} mono copy highlight />
          <RecordKvRow label="Description" value={vendorType.description} isLast />
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <RecordDetailPage
      listHref="/masters/vendor-type"
      listLabel="Vendor Types"
      recordName={vendorType.vendorTypeName}
      recordCode={vendorType.initialCode}
      statusLabel={vendorType.status === "active" ? "Active" : "Inactive"}
      statusVariant={vendorType.status}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/vendor-type/${vendorType.id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Vendor Type",
            icon: Pencil,
            onClick: () => router.push(`/masters/vendor-type/${vendorType.id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Initial Code", value: vendorType.initialCode, highlight: true },
          { label: "Description", value: vendorType.description || "—" },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
