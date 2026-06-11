"use client";

import React, { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { FormContainer } from "@/components/layout/FormContainer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  Edit2,
  Warehouse,
} from "lucide-react";
import {
  type WarehouseMaster,
  type WarehouseStatus,
  loadWarehouses,
} from "../warehouse-data";

const STATUS_CFG: Record<
  WarehouseStatus,
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
  under_maintenance: {
    bg: "bg-amber-50",
    text: "text-amber-700",
    dot: "bg-amber-500",
    label: "Under Maintenance",
  },
  closed: {
    bg: "bg-red-50",
    text: "text-red-700",
    dot: "bg-red-400",
    label: "Closed",
  },
};

function InfoRow({
  label,
  value,
  mono,
}: {
  label: string;
  value?: string | number;
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
        {value !== undefined && value !== "" ? value : "-"}
      </span>
    </div>
  );
}

function StatusPill({ status }: { status: WarehouseStatus }) {
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

export default function WarehouseDetailPage() {
  const router = useRouter();
  const { id } = useParams<{ id: string }>();
  const [warehouse, setWarehouse] = useState<WarehouseMaster | null>(null);

  useEffect(() => {
    const list = loadWarehouses();
    setWarehouse(list.find((w) => w.id === Number(id)) ?? null);
  }, [id]);

  if (!warehouse) {
    return (
      <div className="py-16 text-center">
        <p className="text-sm text-muted-foreground">Warehouse not found.</p>
        <Link
          href="/masters/warehouse"
          className="mt-2 inline-block text-xs text-brand-600 hover:underline"
        >
          Back to listing
        </Link>
      </div>
    );
  }

  return (
    <FormContainer
      title={warehouse.warehouseName}
      description={`${warehouse.warehouseCode} • ${warehouse.contactPerson} • ${warehouse.mobileNumber}`}
      onBack={() => router.push("/masters/warehouse")}
      actions={
        <div className="flex items-center gap-2">
          <StatusPill status={warehouse.status} />
          <Link href={`/masters/warehouse/${warehouse.id}/edit`}>
            <Button
              size="sm"
              className="h-9 gap-1.5 bg-brand-600 text-xs font-semibold text-white hover:bg-brand-700 rounded-lg"
            >
              <Edit2 className="h-3.5 w-3.5" /> Edit
            </Button>
          </Link>
        </div>
      }
      noCard={true}
    >
      <div className="max-w-[800px] mx-auto space-y-5">
        {/* Content Cards */}
        <div className="grid grid-cols-2 gap-3">
          <DetailCard title="Basic Details">
            <InfoRow label="Warehouse Name" value={warehouse.warehouseName} />
            <InfoRow label="Warehouse Code" value={warehouse.warehouseCode} mono />
            <InfoRow label="Warehouse Type" value={warehouse.warehouseType} />
            <InfoRow
              label="Capacity (Sq. Ft.)"
              value={warehouse.capacity?.toLocaleString()}
            />
            <InfoRow label="Operated By" value={warehouse.operatedBy} />
            {warehouse.operatedBy === "C&F Agent" && (
              <InfoRow label="Customer Type" value={warehouse.customerType} />
            )}
            <InfoRow label="Status" value={STATUS_CFG[warehouse.status].label} />
          </DetailCard>

          <DetailCard title="Contact Person Details">
            <div className="space-y-3">
              {(warehouse.contacts || [
                {
                  id: "CON-1",
                  contactPerson: warehouse.contactPerson,
                  mobileNumber: warehouse.mobileNumber,
                  emailAddress: warehouse.emailAddress,
                  isPrimary: true
                }
              ]).map((c, idx) => (
                <div key={c.id || idx} className="pb-2.5 border-b border-border/40 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <span className="text-xs font-semibold text-foreground">{c.contactPerson || "—"}</span>
                    {c.isPrimary && (
                      <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-brand-50 text-brand-600 border border-brand-200">
                        Primary
                      </span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[11px] text-muted-foreground">
                    <div>
                      <span className="font-medium">Mobile:</span> <span className="font-mono text-foreground">{c.mobileNumber || "—"}</span>
                    </div>
                    <div>
                      <span className="font-medium">Email:</span> <span className="text-foreground">{c.emailAddress || "—"}</span>
                    </div>
                  </div>
                </div>
              ))}
              <div className="pt-2 border-t border-border/40">
                <InfoRow label="GST Number" value={warehouse.gstNumber} mono />
              </div>
            </div>
          </DetailCard>

          <DetailCard title="Address Details">
            <InfoRow label="Address" value={warehouse.address} />
            <InfoRow label="State" value={warehouse.state} />
            <InfoRow label="District" value={warehouse.district} />
            <InfoRow label="City" value={warehouse.city} />
            <InfoRow label="Pin Code" value={warehouse.pincode} mono />
          </DetailCard>

          <DetailCard title="Warehouse Manager">
            <InfoRow label="Manager Name" value={warehouse.manager} />
          </DetailCard>

          <DetailCard title="Audit Details">
            <InfoRow label="Created By" value={warehouse.createdBy} />
            <InfoRow label="Created Date" value={warehouse.createdDate} />
            <InfoRow label="Updated By" value={warehouse.updatedBy} />
            <InfoRow label="Updated Date" value={warehouse.updatedDate} />
          </DetailCard>
        </div>
      </div>
    </FormContainer>
  );
}
