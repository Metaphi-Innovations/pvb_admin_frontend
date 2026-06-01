import React from "react";
import { StatusBadge } from "@/components/ui/StatusBadge";

export default function StatusBadgesSection() {
  const statuses = [
    { key: "active", label: "Active", use: "Active, live status" },
    { key: "inactive", label: "Inactive", use: "Inactive, offline" },
    { key: "pending", label: "Pending", use: "Awaiting action" },
    { key: "approved", label: "Approved", use: "Approved, accepted" },
    { key: "rejected", label: "Rejected", use: "Rejected, denied" },
    { key: "draft", label: "Draft", use: "Draft, unsaved" },
    { key: "shipped", label: "Shipped", use: "In transit, shipped" },
    { key: "overdue", label: "Overdue", use: "Past deadline" },
    { key: "partial", label: "Partial", use: "Partially complete" },
    { key: "closed", label: "Closed", use: "Closed, archived" },
  ] as const;

  return (
    <div className="space-y-8">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Status Variants</h3>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
          {statuses.map((item) => (
            <div key={item.key} className="bg-muted/20 border border-border rounded-lg p-4">
              <div className="flex items-center gap-2 mb-3">
                <StatusBadge status={item.key as any} size="md" showDot />
              </div>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-xs text-muted-foreground mt-1">{item.use}</p>
            </div>
          ))}
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Badge Sizes</h3>
        <div className="bg-muted/20 border border-border rounded-lg p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">Small</p>
            <StatusBadge status="active" size="sm" showDot />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">Medium (Default)</p>
            <StatusBadge status="pending" size="md" showDot />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">Large</p>
            <StatusBadge status="approved" size="lg" showDot />
          </div>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">With/Without Dot</h3>
        <div className="bg-muted/20 border border-border rounded-lg p-6 space-y-4">
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">With Status Dot</p>
            <StatusBadge status="active" showDot />
          </div>
          <div>
            <p className="text-xs text-muted-foreground font-semibold mb-2">Without Status Dot</p>
            <StatusBadge status="active" showDot={false} />
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Badge Usage</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Use semantic colors that match the status meaning</p>
          <p>• Always include status dot for better visual recognition</p>
          <p>• Use in table cells, lists, and data displays</p>
          <p>• Keep label text concise and readable</p>
        </div>
      </div>
    </div>
  );
}
