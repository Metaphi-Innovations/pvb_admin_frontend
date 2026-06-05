"use client";

import React, { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Edit2, User } from "lucide-react";
import { AppLayout } from "@/components/layout/AppLayout";
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
      <AppLayout>
        <div className="py-16 text-center">
          <p className="text-sm text-muted-foreground">Customer Type not found.</p>
          <Link href="/masters/customer-types" className="mt-2 inline-block text-xs text-brand-600 hover:underline">
            Back to listing
          </Link>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[800px] mx-auto space-y-5">
        {/* Header */}
        <div className="flex items-start gap-4">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 px-2 -ml-2"
            onClick={() => router.push("/masters/customer-types")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <User className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground truncate">{customerType.customerType}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  Customer Type Details
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Link href={`/masters/customer-types/${customerType.id}/edit`}>
              <Button size="sm" className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700">
                <Edit2 className="w-3.5 h-3.5" /> Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Details Card */}
        <div className="grid grid-cols-1 gap-3">
          <DetailCard title="Customer Type Info">
            <InfoRow label="Customer Type ID" value={String(customerType.id)} />
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
                        <td className="px-3 py-2.5 text-xs text-foreground font-medium break-words whitespace-normal">
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
    </AppLayout>
  );
}
