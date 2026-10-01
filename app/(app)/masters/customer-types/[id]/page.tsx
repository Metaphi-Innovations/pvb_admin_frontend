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
import { loadCustomerTypes, type CustomerTypeRecord } from "../customer-type-data";

export default function CustomerTypeDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customerType, setCustomerType] = useState<CustomerTypeRecord | null>(null);
  const [activeTab, setActiveTab] = useState("overview");

	useEffect(() => {
		const list = loadCustomerTypes();
		setCustomerType(list.find((c) => c.id === Number(id)) ?? null);
	}, [id]);

  if (!customerType) {
    return (
      <RecordDetailPage
        listHref="/masters/customer-types"
        listLabel="Customer Types"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Customer Type not found.</p>
          <Link href="/masters/customer-types" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  const tabs = [{ value: "overview", label: "Overview" }];
  const docCount = customerType.documentTypes?.length ?? 0;

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <RecordSectionCard title="Customer Type Info" icon={User} accent="blue">
          <RecordKvRow label="Customer Type ID" value={String(customerType.id)} mono />
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
      onEdit={() => router.push(`/masters/customer-types/${customerType.id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Customer Type",
            icon: Pencil,
            onClick: () => router.push(`/masters/customer-types/${customerType.id}/edit`),
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
