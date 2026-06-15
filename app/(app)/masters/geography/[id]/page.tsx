"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useRouter, useParams } from "next/navigation";
import {
  RecordDetailPage,
  RecordKvRow,
  RecordMiniTable,
  RecordSectionCard,
  RecordStatusPill,
} from "@/components/record-detail";
import { ChevronRight, Clock, MapPin, Pencil, Users } from "lucide-react";
import {
  type GeoNode, loadGeoNodes, getAncestorPath, getChildren,
} from "../geo-data";
import { LevelBadge } from "../components/LevelBadge";

export default function GeographyViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);
  const [activeTab, setActiveTab] = useState("overview");

  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [node, setNode] = useState<GeoNode | null>(null);

  useEffect(() => {
    const all = loadGeoNodes();
    setNodes(all);
    setNode(all.find((n) => n.id === id) ?? null);
  }, [id]);

  if (nodes.length > 0 && !node) {
    return (
      <RecordDetailPage
        listHref="/masters/geography"
        listLabel="Geography"
        recordName="Not found"
        statusLabel="—"
        statusVariant="neutral"
      >
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Geography node not found</p>
          <Link href="/masters/geography" className="text-xs text-brand-600 hover:underline">
            Back to Geography
          </Link>
        </div>
      </RecordDetailPage>
    );
  }

  if (!node) return null;

  const path = getAncestorPath(node, nodes);
  const parent = node.parentId ? nodes.find((n) => n.id === node.parentId) : null;
  const children = getChildren(node.id, nodes);

  const tabs = [{ value: "overview", label: "Overview" }];

  const childColumns = [
    {
      key: "name",
      header: "Name",
      render: (r: GeoNode) => (
        <span className="font-semibold text-[#3D5473]">{r.name}</span>
      ),
    },
    {
      key: "code",
      header: "Code",
      render: (r: GeoNode) => (
        <span className="font-mono text-[12px] text-brand-700">{r.code || "—"}</span>
      ),
    },
    {
      key: "level",
      header: "Level",
      render: (r: GeoNode) => <LevelBadge level={r.level} />,
    },
    {
      key: "status",
      header: "Status",
      render: (r: GeoNode) => (
        <RecordStatusPill
          label={r.status === "active" ? "Active" : "Inactive"}
          variant={r.status === "active" ? "active" : "inactive"}
        />
      ),
    },
  ];

  const renderTabContent = () => {
    if (activeTab !== "overview") return null;

    return (
      <div className="grid grid-cols-1 gap-4">
        {path.length > 1 && (
          <RecordSectionCard title="Hierarchy Path" icon={ChevronRight} accent="purple">
            <div className="flex items-center flex-wrap gap-1 py-2">
              {path.map((n, i) => (
                <span key={n.id} className="flex items-center gap-1">
                  {i > 0 && <ChevronRight className="w-3.5 h-3.5 text-muted-foreground/50 flex-shrink-0" />}
                  {n.id === node.id ? (
                    <span className="text-xs font-semibold text-brand-700">{n.name}</span>
                  ) : (
                    <Link
                      href={`/masters/geography/${n.id}`}
                      className="text-xs text-muted-foreground hover:text-brand-600 hover:underline transition-colors"
                    >
                      {n.name}
                    </Link>
                  )}
                </span>
              ))}
            </div>
          </RecordSectionCard>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecordSectionCard title="Territory Details" icon={MapPin} accent="blue">
            <RecordKvRow label="Name" value={node.name} highlight />
            <RecordKvRow
              label="Level"
              value={<LevelBadge level={node.level} />}
            />
            <RecordKvRow label="Code" value={node.code || "—"} mono copy />
            <RecordKvRow
              label="Status"
              value={
                <RecordStatusPill
                  label={node.status === "active" ? "Active" : "Inactive"}
                  variant={node.status === "active" ? "active" : "inactive"}
                />
              }
            />
            {node.level === "Pincode" && (
              <RecordKvRow label="Pincode" value={node.pincode || "—"} mono />
            )}
            <RecordKvRow
              label="Parent"
              value={
                parent ? (
                  <Link
                    href={`/masters/geography/${parent.id}`}
                    className="text-[#1554B4] hover:underline"
                  >
                    {parent.name}
                  </Link>
                ) : (
                  "None (Root)"
                )
              }
              isLast
            />
          </RecordSectionCard>

          <RecordSectionCard title="Audit Details" icon={Clock} accent="slate">
            <RecordKvRow label="Created" value={node.createdDate} />
            <RecordKvRow label="Last Updated" value={node.updatedDate} isLast />
          </RecordSectionCard>
        </div>

        <RecordSectionCard title={`Direct Children (${children.length})`} icon={Users} accent="green">
          <RecordMiniTable
            columns={childColumns}
            rows={children}
            onRowClick={(r) => router.push(`/masters/geography/${r.id}`)}
          />
        </RecordSectionCard>
      </div>
    );
  };

  return (
    <RecordDetailPage
      listHref="/masters/geography"
      listLabel="Geography"
      recordName={node.name}
      recordCode={node.code}
      typeBadge={<LevelBadge level={node.level} />}
      statusLabel={node.status === "active" ? "Active" : "Inactive"}
      statusVariant={node.status === "active" ? "active" : "inactive"}
      tabs={tabs}
      activeTab={activeTab}
      onTabChange={setActiveTab}
      onEdit={() => router.push(`/masters/geography/${node.id}/edit`)}
      sidebar={{
        quickActions: [
          {
            label: "Edit Territory",
            icon: Pencil,
            onClick: () => router.push(`/masters/geography/${node.id}/edit`),
            variant: "primary",
          },
        ],
        summary: [
          { label: "Level", value: node.level, highlight: true },
          { label: "Code", value: node.code || "—" },
          { label: "Parent", value: parent?.name || "Root" },
          { label: "Children", value: String(children.length) },
          { label: "Created", value: node.createdDate },
          { label: "Updated", value: node.updatedDate },
        ],
      }}
    >
      {renderTabContent()}
    </RecordDetailPage>
  );
}
