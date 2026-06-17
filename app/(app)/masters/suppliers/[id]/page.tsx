"use client";

import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  ArrowLeft,
  Building2,
  Edit2,
  UserCheck,
  UserX,
} from "lucide-react";
import {
  getPaymentTermLabel,
  loadSuppliers,
  saveSuppliers,
  type Supplier,
  type SupplierStatus,
} from "../supplier-data";

const STATUS_CFG: Record<
  SupplierStatus,
  { bg: string; text: string; dot: string; label: string }
> = {
  active: {
    bg: "bg-emerald-50",
    text: "text-emerald-700",
    dot: "bg-emerald-500",
    label: "Active",
  },
  inactive: {
    bg: "bg-slate-100",
    text: "text-slate-600",
    dot: "bg-slate-400",
    label: "Inactive",
  },
};

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-border/50 px-3 py-2.5 last:border-0">
      <span className="text-[11px] font-medium text-muted-foreground">
        {label}
      </span>
      <span
        className={cn(
          "text-right text-xs font-medium text-foreground",
          mono && "font-mono",
        )}
      >
        {value ? value : "-"}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: SupplierStatus }) {
  const cfg = STATUS_CFG[status];
  return (
    <span className={cn("inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-[11px] font-medium", cfg.bg, cfg.text)}>
      <span className={cn("h-1.5 w-1.5 rounded-full", cfg.dot)} />
      {cfg.label}
    </span>
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

export default function SupplierDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [supplier, setSupplier] = useState<Supplier | null>(null);
  const [records, setRecords] = useState<Supplier[]>([]);

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
          <p className="text-sm text-muted-foreground">Supplier not found.</p>
          <Link
            href="/masters/suppliers"
            className="mt-2 inline-block text-xs text-brand-600 hover:underline"
          >
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
            onClick={() => router.push("/masters/suppliers")}
          >
            <ArrowLeft className="w-4 h-4" />
          </Button>
          <div className="flex-grow min-w-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <Building2 className="w-5 h-5 text-brand-600" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground truncate">{supplier.supplierName}</h1>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {supplier.supplierCode} • {supplier.mobile} • {supplier.email || "No email"}
                </p>
              </div>
              <StatusPill status={supplier.status} />
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 gap-1.5 text-xs"
              onClick={() =>
                updateStatus(supplier.status === "active" ? "inactive" : "active")
              }
            >
              {supplier.status === "active" ? (
                <UserX className="h-3.5 w-3.5" />
              ) : (
                <UserCheck className="h-3.5 w-3.5" />
              )}
              {supplier.status === "active" ? "Deactivate" : "Activate"}
            </Button>
            <Link href={`/masters/suppliers/${supplier.id}/edit`}>
              <Button
                size="sm"
                className="h-8 gap-1.5 bg-brand-600 text-xs text-white hover:bg-brand-700"
              >
                <Edit2 className="h-3.5 w-3.5" /> Edit
              </Button>
            </Link>
          </div>
        </div>

        {/* Content Cards */}
        <div className="grid grid-cols-2 gap-3">
          <DetailCard title="Supplier Details">
            <InfoRow label="Supplier Name" value={supplier.supplierName} />
            <InfoRow label="Mobile Number" value={supplier.mobile} mono />
            <InfoRow label="Email Address" value={supplier.email} />
            <InfoRow label="Status" value={supplier.status === "active" ? "Active" : "Inactive"} />
            <InfoRow
              label="Payment Terms"
              value={getPaymentTermLabel(supplier.paymentTerms)}
            />
          </DetailCard>

          <DetailCard title="Tax & Registration">
            <InfoRow label="GSTIN" value={supplier.gstin} mono />
            <InfoRow label="CIB Regn #" value={supplier.cibRegn} />
            <InfoRow label="CIB Regn Expiry" value={supplier.cibRegnExpiry} />
            <InfoRow label="FCO Regn #" value={supplier.fcoRegn} />
            <InfoRow label="FCO Regn Expiry" value={supplier.fcoRegnExpiry} />
          </DetailCard>

          <DetailCard title="Address">
            <InfoRow label="Address" value={supplier.address} />
          </DetailCard>

          <DetailCard title="Audit">
            <InfoRow label="Created By" value={supplier.createdBy} />
            <InfoRow label="Created Date" value={supplier.createdDate} />
            <InfoRow label="Updated By" value={supplier.updatedBy} />
            <InfoRow label="Updated Date" value={supplier.updatedDate} />
          </DetailCard>
        </div>
      </div>
    </AppLayout>
  );
}
