"use client";

import { useEffect, useMemo, useState } from "react";
import { FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetBody,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { StatusBadge } from "@/components/record-detail/StatusBadge";
import {
  type GeographyRecord,
  getChildren,
  getGeographyHistory,
  getParentName,
  loadGeographies,
} from "../geography-master-data";
import {
  formatAssignedUsersForGeography,
  getUsersForGeography,
  getCoverageModeLabel,
  formatGeographyCoverageCount,
} from "../geography-workflow-data";

export type GeographyDetailTab = "overview" | "children" | "coverage" | "users" | "history";

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">{value != null && String(value).trim() ? value : "—"}</p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground border-b border-border pb-1.5">{title}</h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

export function GeographyDetailSheet({
  open,
  onClose,
  record,
  initialTab = "overview",
  onOpenChild,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  record: GeographyRecord | null;
  initialTab?: GeographyDetailTab;
  onOpenChild?: (child: GeographyRecord) => void;
  onEdit?: () => void;
}) {
  const [tab, setTab] = useState<GeographyDetailTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, record?.id]);

  const children = useMemo(() => {
    if (!record) return [];
    return getChildren(record.id, loadGeographies());
  }, [record, open]);

  const history = useMemo(() => {
    if (!record) return [];
    return getGeographyHistory(record.id);
  }, [record, open]);

  if (!record) return null;

  const parentName = getParentName(record.parentId);

  return (
    <Sheet
      open={open}
      onOpenChange={(v) => {
        if (!v) onClose();
        else setTab(initialTab);
      }}
    >
      <SheetContent className="max-w-[520px] sm:max-w-[520px]">
        <SheetHeader>
          <SheetTitle>{record.name}</SheetTitle>
          <SheetDescription>
            {record.geographyType}
            {parentName !== "—" ? ` · under ${parentName}` : ""}
          </SheetDescription>
        </SheetHeader>

        <SheetBody className="pt-4">
          <Tabs
            value={tab}
            onValueChange={(v) => setTab(v as GeographyDetailTab)}
            className="space-y-4"
          >
            <TabsList className="w-full justify-start h-auto flex-wrap gap-1 bg-muted/40 p-1">
              <TabsTrigger value="overview" className="text-xs px-2.5 py-1.5">
                Overview
              </TabsTrigger>
              <TabsTrigger value="children" className="text-xs px-2.5 py-1.5">
                Child Geographies
              </TabsTrigger>
              <TabsTrigger value="coverage" className="text-xs px-2.5 py-1.5">
                Coverage
              </TabsTrigger>
              <TabsTrigger value="users" className="text-xs px-2.5 py-1.5">
                Assigned Users
              </TabsTrigger>
              <TabsTrigger value="history" className="text-xs px-2.5 py-1.5">
                History
              </TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="m-0 outline-none space-y-5">
              <Section title="Geography Details">
                <DetailItem label="Geography Name" value={record.name} />
                <DetailItem label="Level" value={record.geographyType} />
                <DetailItem label="Parent Geography" value={parentName} />
                <DetailItem label="Inheritance" value={record.coverageType ?? getCoverageModeLabel(record.id)} />
                <DetailItem label="Effective From" value={record.effectiveFrom} />
                <div>
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={record.status} />
                  </div>
                </div>
                <DetailItem label="Coverage Count" value={formatGeographyCoverageCount(record.id)} />
                <DetailItem label="Assigned Users" value={formatAssignedUsersForGeography(record.id)} />
              </Section>
              <Section title="System Information">
                <DetailItem label="Created By" value={record.createdBy} />
                <DetailItem label="Created Date" value={record.createdDate} />
                <DetailItem label="Updated By" value={record.updatedBy} />
                <DetailItem label="Updated Date" value={record.updatedDate} />
              </Section>
            </TabsContent>

            <TabsContent value="children" className="m-0 outline-none">
              {children.length === 0 ? (
                <p className="text-xs text-muted-foreground py-6 text-center">
                  No child geographies under this folder.
                </p>
              ) : (
                <div className="border border-border rounded-lg overflow-hidden">
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="bg-muted/40 border-b border-border">
                        <th className="text-left px-3 py-2 font-semibold">Geography Name</th>
                        <th className="text-left px-3 py-2 font-semibold">Type</th>
                        <th className="text-left px-3 py-2 font-semibold">Status</th>
                        <th className="text-right px-3 py-2 font-semibold">Coverage</th>
                        <th className="text-right px-3 py-2 font-semibold">Users</th>
                        <th className="text-center px-3 py-2 font-semibold w-16">Open</th>
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={child.id} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 font-medium">{child.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">{child.geographyType}</td>
                          <td className="px-3 py-2">
                            <StatusBadge status={child.status} />
                          </td>
                          <td className="px-3 py-2 text-right">{child.coverageCount}</td>
                          <td className="px-3 py-2 text-right">{child.assignedUsers}</td>
                          <td className="px-3 py-2 text-center">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0"
                              onClick={() => onOpenChild?.(child)}
                            >
                              <FolderOpen className="w-3.5 h-3.5 text-brand-600" />
                            </Button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="coverage" className="m-0 outline-none">
              {record.geographyType === "Territory" ? (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {getCoverageModeLabel(record.id)} · {formatGeographyCoverageCount(record.id)} pincodes mapped on this territory.
                  </p>
                  <p className="text-xs text-muted-foreground">Use the Coverage tab to add or change pincode mappings.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="text-xs text-muted-foreground">
                    {getCoverageModeLabel(record.id)} · {formatGeographyCoverageCount(record.id)} pincodes inherited from child territories.
                  </p>
                </div>
              )}
            </TabsContent>

            <TabsContent value="users" className="m-0 outline-none">
              {(() => {
                const users = getUsersForGeography(record.id);
                if (users.length === 0) {
                  return (
                    <p className="text-xs text-muted-foreground py-6 text-center">
                      No users assigned. Assign users from User Management (role determines geography level).
                    </p>
                  );
                }
                return (
                  <div className="border border-border rounded-lg overflow-hidden">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="bg-muted/40 border-b border-border">
                          <th className="text-left px-3 py-2 font-semibold">User</th>
                          <th className="text-left px-3 py-2 font-semibold">Role</th>
                          <th className="text-left px-3 py-2 font-semibold">Effective From</th>
                        </tr>
                      </thead>
                      <tbody>
                        {users.map((u) => (
                          <tr key={u.id} className="border-b border-border/60 last:border-0">
                            <td className="px-3 py-2 font-medium">{u.userName}</td>
                            <td className="px-3 py-2">{u.role}</td>
                            <td className="px-3 py-2 font-mono">{u.effectiveFrom}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                );
              })()}
            </TabsContent>

            <TabsContent value="history" className="m-0 outline-none">
              <div className="border border-border rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-muted/40 border-b border-border">
                      <th className="text-left px-3 py-2 font-semibold">Date</th>
                      <th className="text-left px-3 py-2 font-semibold">Action</th>
                      <th className="text-left px-3 py-2 font-semibold">User</th>
                      <th className="text-left px-3 py-2 font-semibold">Remarks</th>
                    </tr>
                  </thead>
                  <tbody>
                    {history.map((entry) => (
                      <tr key={entry.id} className="border-b border-border/60 last:border-0">
                        <td className="px-3 py-2 font-mono whitespace-nowrap">{entry.date}</td>
                        <td className="px-3 py-2">{entry.action}</td>
                        <td className="px-3 py-2">{entry.user}</td>
                        <td className="px-3 py-2 text-muted-foreground">{entry.remarks}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </TabsContent>
          </Tabs>

          <div className="flex items-center justify-end gap-2 pt-6">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
              Close
            </Button>
            {onEdit && (
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={onEdit}
              >
                Edit
              </Button>
            )}
          </div>
        </SheetBody>
      </SheetContent>
    </Sheet>
  );
}
