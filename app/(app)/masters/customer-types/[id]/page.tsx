"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordSectionCard,
} from "@/components/record-detail";
import { FileText, Pencil, User } from "lucide-react";
import { CustomerTypeListService } from "@/services/customer-type-list.service";
import type { CustomerTypeRecord } from "../customer-type-data";

function toCustomerTypeRecord(detail: {
  id: number;
  customerTypeId: string;
  initialCode: string;
  customerType: string;
  description: string;
  status: "active" | "inactive";
  documents: { id: string; title: string }[];
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  updatedBy: string;
}): CustomerTypeRecord {
  return {
    id: detail.id,
    customerTypeId: detail.customerTypeId,
    customerTypeCode: detail.initialCode,
    initialCode: detail.initialCode,
    customerType: detail.customerType,
    description: detail.description,
    documentTypes: detail.documents.map((doc, idx) => ({
      id: `DOC-${idx + 1}`,
      documentTypeId: doc.id,
      documentName: doc.title,
    })),
    status: detail.status,
    createdBy: detail.createdBy || "—",
    createdDate: detail.createdAt ? detail.createdAt.slice(0, 10) : "",
    updatedBy: detail.updatedBy || "—",
    updatedDate: detail.updatedAt ? detail.updatedAt.slice(0, 10) : "",
  };
}

export default function CustomerTypeDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customerType, setCustomerType] = useState<CustomerTypeRecord | null>(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

  useEffect(() => {
    if (!id) return;

    setLoading(true);
    setLoadError(null);

    CustomerTypeListService.view(id)
      .then((detail) => setCustomerType(toCustomerTypeRecord(detail)))
      .catch((error: unknown) => {
        const err = error as { status?: number; message?: string } | undefined;
        const message =
          err?.status === 404
            ? "Customer type not found."
            : err?.message || "Failed to load customer type.";
        setLoadError(message);
        setCustomerType(null);
      })
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) {
    return (
      <RecordDetailPage
        listHref="/masters/customer-types"
        listLabel="Customer Types"
        recordName="Loading..."
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Loading customer type...</p>
        </div>
      </RecordDetailPage>
    );
  }

  if (!customerType || loadError) {
    return (
      <RecordDetailPage
        listHref="/masters/customer-types"
        listLabel="Customer Types"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">{loadError || "Customer Type not found."}</p>
          <Link href="/masters/customer-types" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const routeId = customerType.customerTypeId || id;
  const tabs = [{ value: "overview", label: "Overview" }];
  const docCount = customerType.documentTypes?.length ?? 0;

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Customer Type Info" icon={User} accent="blue">
          <RecordKvRow label="Customer Type" value={customerType.customerType} />
          <RecordKvRow label="Initial Code" value={customerType.initialCode} mono copy highlight />
          <RecordKvRow label="Description" value={customerType.description} isLast />
        </RecordSectionCard>

        <RecordSectionCard title="Document Type Required" icon={FileText} accent="green">
          {docCount === 0 ? (
            <p className="text-sm text-muted-foreground py-4">No documents required.</p>
          ) : (
            <table className="min-w-full divide-y divide-border">
              <thead className="bg-muted/40">
                <tr>
                  <th className="w-12 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Sr.</th>
                  <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Document Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/60">
                {customerType.documentTypes.map((doc, idx) => (
                  <tr key={doc.id} className="hover:bg-muted/10 transition-colors">
                    <td className="px-3 py-2.5 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                    <td className="px-3 py-2.5 text-xs text-foreground font-medium break-words whitespace-normal font-mono">
                      {doc.documentName}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <RecordDetailPage
      listHref="/masters/customer-types"
      listLabel="Customer Types"
      recordName={customerType.customerType}
      recordCode={customerType.initialCode}
      statusLabel={customerType.status === "active" ? "Active" : "Inactive"}
      statusVariant={customerType.status}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/customer-types/${routeId}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Customer Type",
            icon: Pencil,
            onClick: () => router.push(`/masters/customer-types/${routeId}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Initial Code", value: customerType.initialCode, highlight: true },
          { label: "Documents Required", value: String(docCount) },
          { label: "Description", value: customerType.description || "—" },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
