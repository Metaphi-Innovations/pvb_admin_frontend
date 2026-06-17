"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, User } from "lucide-react";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { loadCustomerTypes, type CustomerTypeRecord } from "../customer-type-data";

function InfoRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/60 px-3 py-2.5 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">{label}</span>
      <span className="text-right text-xs font-medium text-foreground">
        {value ? value : "-"}
      </span>
    </div>
  );
}

function DetailCard({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-white p-3.5">
      <p className="mb-2.5 text-[10px] font-bold uppercase tracking-widest text-muted-foreground">{title}</p>
      <div>{children}</div>
    </div>
  );
}

export default function CustomerTypeDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [customerType, setCustomerType] = useState<CustomerTypeRecord | null>(null);

  useEffect(() => {
    const list = loadCustomerTypes();
    setCustomerType(list.find((c) => c.id === Number(id)) ?? null);
  }, [id]);

  if (!customerType) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Customer Type not found.</p>
        <Link href="/masters/customer-types" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title={customerType.customerType}
      description="Customer Type Details"
      onBack={() => router.push("/masters/customer-types")}
      actions={
        <div className="flex items-center gap-2">
          <Link href={`/masters/customer-types/${customerType.id}/edit`}>
            <Button size="sm" className="h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg">
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          </Link>
        </div>
      }
      noCard={true}
    >
      <div className="max-w-[800px] mx-auto space-y-5">

        {/* Details Card */}
        <div className="grid grid-cols-1 gap-3">
          <DetailCard title="Customer Type Info">
            <InfoRow label="Customer Type ID" value={String(customerType.id)} />
            <InfoRow label="Customer Type Code" value={customerType.customerTypeCode} />
            <InfoRow label="Customer Type" value={customerType.customerType} />
            <InfoRow label="Description" value={customerType.description} />
          </DetailCard>

          <DetailCard title="Document Type Required">
            <div className="rounded-lg border border-border overflow-hidden bg-white mt-1">
              <table className="min-w-full divide-y divide-border table-fixed">
                <thead className="bg-muted/40">
                  <tr>
                    <th className="w-12 px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Sr.</th>
                    <th className="px-3 py-2 text-left text-[11px] font-semibold text-muted-foreground">Document Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/60">
                  {!customerType.documentTypes || customerType.documentTypes.length === 0 ? (
                    <tr>
                      <td colSpan={2} className="px-3 py-6 text-center text-xs text-muted-foreground">
                        No documents required.
                      </td>
                    </tr>
                  ) : (
                    customerType.documentTypes.map((doc, idx) => (
                      <tr key={doc.id} className="hover:bg-muted/10 transition-colors">
                        <td className="px-3 py-2.5 text-xs text-muted-foreground font-medium">{idx + 1}</td>
                        <td className="px-3 py-2.5 text-xs text-foreground font-medium break-words whitespace-normal font-mono">
                          {doc.documentName}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </DetailCard>
        </div>
      </div>
    </FormContainer>
  );
}
