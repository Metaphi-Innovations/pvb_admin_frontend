"use client";

import { useState } from "react";
import { User, CheckCircle2, AlertTriangle, Edit2 } from "lucide-react";
import { AutocompleteSelect } from "@/components/ui/AutocompleteSelect";

export default function AuditLogsSection() {
  const [userFilter, setUserFilter] = useState("all");
  const [actionFilter, setActionFilter] = useState("all");

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Audit Log Entries</h3>
        <div className="bg-white border border-border rounded-card shadow-card overflow-hidden">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-border bg-muted/40">
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Timestamp</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">User</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Action</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Entity</th>
                <th className="text-left px-4 py-2.5 font-semibold text-foreground">Details</th>
              </tr>
            </thead>
            <tbody>
              {[
                {
                  time: "2024-05-21 14:30:45",
                  user: "Rajesh Kumar",
                  action: "Created",
                  entity: "Order #2341",
                  detail: "New order created",
                  icon: CheckCircle2,
                },
                {
                  time: "2024-05-21 13:15:22",
                  user: "Priya Desai",
                  action: "Approved",
                  entity: "Order #2340",
                  detail: "Status changed to approved",
                  icon: CheckCircle2,
                },
                {
                  time: "2024-05-21 12:45:10",
                  user: "Admin User",
                  action: "Updated",
                  entity: "Product SKU-001",
                  detail: "Price updated from ₹450 to ₹475",
                  icon: Edit2,
                },
                {
                  time: "2024-05-21 11:20:33",
                  user: "System",
                  action: "Deleted",
                  entity: "Draft Order #2339",
                  detail: "Cleanup of expired draft",
                  icon: AlertTriangle,
                },
              ].map((log, idx) => {
                const Icon = log.icon;
                return (
                  <tr key={idx} className="border-b border-border hover:bg-muted/20 transition-colors">
                    <td className="px-4 py-3 text-muted-foreground">{log.time}</td>
                    <td className="px-4 py-3 font-medium text-foreground">{log.user}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-1.5">
                        <Icon className={`w-4 h-4 ${
                          log.action === "Deleted" ? "text-red-600" : "text-emerald-600"
                        }`} />
                        <span className="text-foreground">{log.action}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-foreground font-medium">{log.entity}</td>
                    <td className="px-4 py-3 text-muted-foreground">{log.detail}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      <div>
        <h3 className="text-sm font-semibold text-foreground mb-4">Audit Log Filtering</h3>
        <div className="bg-muted/20 border border-border rounded-lg p-4 space-y-3">
          <div className="grid grid-cols-3 gap-2">
            <input type="date" className="text-xs px-3 py-2 border border-border rounded" />
            <AutocompleteSelect
              options={[
                { value: "all", label: "All Users" },
                { value: "rajesh", label: "Rajesh Kumar" },
                { value: "priya", label: "Priya Desai" },
              ]}
              value={userFilter}
              onChange={setUserFilter}
              placeholder="All Users"
              className="h-9 text-xs"
            />
            <AutocompleteSelect
              options={[
                { value: "all", label: "All Actions" },
                { value: "created", label: "Created" },
                { value: "updated", label: "Updated" },
                { value: "deleted", label: "Deleted" },
              ]}
              value={actionFilter}
              onChange={setActionFilter}
              placeholder="All Actions"
              className="h-9 text-xs"
            />
          </div>
        </div>
      </div>

      <div className="bg-info/10 border border-info/20 rounded-lg p-4">
        <p className="text-xs text-info font-semibold mb-2">Audit Log Best Practices</p>
        <div className="space-y-1 text-xs text-info/80">
          <p>• Log all important actions (create, update, delete)</p>
          <p>• Include user identity and timestamp for every entry</p>
          <p>• Store before/after values for critical field changes</p>
          <p>• Make audit logs read-only and tamper-resistant</p>
        </div>
      </div>
    </div>
  );
}
