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
import type { BusinessGeoListItem } from "@/services/business-geography.service";

export type GeographyDetailTab =
  | "overview"
  | "children"
  | "coverage"
  | "users"
  | "history";

/** Soft adapter for API items and legacy localStorage GeographyRecord. */
export type GeographyDetailRecord = {
  id: string | number;
  name: string;
  level?: string;
  geographyType?: string;
  parentName?: string;
  parentId?: string | number | null;
  coverageLabel?: string;
  effectiveDate?: string;
  effectiveFrom?: string;
  status: string;
  pincodeCount?: number;
  coverageCount?: number;
  code?: string;
  createdBy?: string;
  createdDate?: string;
  updatedBy?: string;
  updatedDate?: string;
};

function DetailItem({ label, value }: { label: string; value?: string | number }) {
  return (
    <div>
      <p className="text-[11px] text-muted-foreground">{label}</p>
      <p className="text-xs font-medium mt-0.5">
        {value != null && String(value).trim() ? value : "—"}
      </p>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-3">
      <h3 className="text-xs font-semibold text-foreground border-b border-border pb-1.5">
        {title}
      </h3>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">{children}</div>
    </div>
  );
}

function resolveLevel(record: GeographyDetailRecord): string {
  return record.level || record.geographyType || "—";
}

function resolveEffective(record: GeographyDetailRecord): string {
  return record.effectiveDate || record.effectiveFrom || "";
}

function resolveCoverage(record: GeographyDetailRecord): string {
  if (record.coverageLabel) return record.coverageLabel;
  if (record.coverageCount != null) return String(record.coverageCount);
  return "—";
}

export function GeographyDetailSheet({
  open,
  onClose,
  record,
  childRecords,
  initialTab = "overview",
  onOpenChild,
  onEdit,
}: {
  open: boolean;
  onClose: () => void;
  record: GeographyDetailRecord | BusinessGeoListItem | null;
  childRecords?: GeographyDetailRecord[];
  initialTab?: GeographyDetailTab;
  onOpenChild?: (child: GeographyDetailRecord) => void;
  onEdit?: () => void;
}) {
  const [tab, setTab] = useState<GeographyDetailTab>(initialTab);

  useEffect(() => {
    if (open) setTab(initialTab);
  }, [open, initialTab, record?.id]);

  const children = useMemo(() => childRecords ?? [], [childRecords]);

  if (!record) return null;

  const level = resolveLevel(record);
  const parentName = record.parentName ?? "—";
  const coverage = resolveCoverage(record);
  const effective = resolveEffective(record);
  const pinCount =
    record.pincodeCount ??
    ("coverageCount" in record && typeof record.coverageCount === "number"
      ? record.coverageCount
      : undefined);

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
            {level}
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
            </TabsList>

            <TabsContent value="overview" className="m-0 outline-none space-y-5">
              <Section title="Geography Details">
                <DetailItem label="Geography Name" value={record.name} />
                <DetailItem label="Level" value={level} />
                <DetailItem label="Parent Geography" value={parentName} />
                <DetailItem label="Coverage" value={coverage} />
                <DetailItem label="Effective From" value={effective} />
                <div>
                  <p className="text-[11px] text-muted-foreground">Status</p>
                  <div className="mt-1">
                    <StatusBadge status={record.status} />
                  </div>
                </div>
                <DetailItem
                  label="Pincode Count"
                  value={level === "Territory" ? pinCount : "—"}
                />
                <DetailItem label="Code" value={record.code} />
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
                        {onOpenChild ? (
                          <th className="text-center px-3 py-2 font-semibold w-16">Open</th>
                        ) : null}
                      </tr>
                    </thead>
                    <tbody>
                      {children.map((child) => (
                        <tr key={String(child.id)} className="border-b border-border/60 last:border-0">
                          <td className="px-3 py-2 font-medium">{child.name}</td>
                          <td className="px-3 py-2 text-muted-foreground">
                            {resolveLevel(child)}
                          </td>
                          <td className="px-3 py-2">
                            <StatusBadge status={child.status} />
                          </td>
                          <td className="px-3 py-2 text-right">{resolveCoverage(child)}</td>
                          {onOpenChild ? (
                            <td className="px-3 py-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0"
                                onClick={() => onOpenChild(child)}
                              >
                                <FolderOpen className="w-3.5 h-3.5 text-brand-600" />
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </TabsContent>

            <TabsContent value="coverage" className="m-0 outline-none">
              <p className="text-xs text-muted-foreground">
                {coverage}
                {level === "Territory" && pinCount != null
                  ? ` · ${pinCount} pincode${pinCount === 1 ? "" : "s"} mapped.`
                  : "."}
              </p>
            </TabsContent>

            <TabsContent value="users" className="m-0 outline-none">
              <p className="text-xs text-muted-foreground py-6 text-center">
                Manage assigned users in User Management.
              </p>
            </TabsContent>

            <TabsContent value="history" className="m-0 outline-none">
              <p className="text-xs text-muted-foreground py-6 text-center">
                See the Audit tab for change history.
              </p>
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
