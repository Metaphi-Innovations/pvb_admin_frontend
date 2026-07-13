"use client";

import React, { useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
} from "@/components/record-detail";
import { Pencil, Tags } from "lucide-react";
import { useSupplierType } from "@/hooks/masters";

export default function VendorTypeDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [activeTab, setActiveTab] = useState("overview");

  const { data: supplierType, isLoading, isError } = useSupplierType(id);

  if (isLoading) {
    return (
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading supplier type details...</p>
        </div>
      </AppLayout>
    );
  }

  if (isError || !supplierType) {
    return (
      <RecordDetailPage
        listHref="/masters/vendor-type"
        listLabel="Supplier Types"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Supplier type not found.</p>
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
        <RecordSectionCard title="Supplier Type Info" icon={Tags} accent="blue">
          <RecordKvRow label="Supplier Type ID" value={supplierType.supplierTypeUuid} mono />
          <RecordKvRow label="Supplier Type Name" value={supplierType.supplierTypeName} />
          <RecordKvRow label="Initial Code" value={supplierType.initialCode} mono copy highlight />
          <RecordKvRow label="Description" value={supplierType.description} isLast />
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <RecordDetailPage
      listHref="/masters/vendor-type"
      listLabel="Supplier Types"
      recordName={supplierType.supplierTypeName}
      recordCode={supplierType.initialCode}
      statusLabel={supplierType.status === "active" ? "Active" : "Inactive"}
      statusVariant={supplierType.status}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/vendor-type/${supplierType.supplierTypeUuid}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Supplier Type",
            icon: Pencil,
            onClick: () => router.push(`/masters/vendor-type/${supplierType.supplierTypeUuid}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Initial Code", value: supplierType.initialCode, highlight: true },
          { label: "Description", value: supplierType.description || "—" },
          { label: "Created By", value: supplierType.createdBy || "—" },
          { label: "Created At", value: supplierType.createdAt || "—" },
          { label: "Updated By", value: supplierType.updatedBy || "—" },
          { label: "Updated At", value: supplierType.updatedAt || "—" },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
