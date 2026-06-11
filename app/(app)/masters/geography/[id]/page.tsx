"use client";

import React, { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import Link from "next/link";
import { cn } from "@/lib/utils";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Edit2, MapPin, ChevronRight, Users } from "lucide-react";
import {
  type GeoNode, loadGeoNodes, getAncestorPath, getChildren,
} from "../geo-data";
import { LevelBadge } from "../components/LevelBadge";

// ── Status pill ───────────────────────────────────────────────────────────────
function StatusPill({ status }: { status: string }) {
  const active = status === "active";
  return (
    <span className={cn(
      "inline-flex items-center gap-1.5 text-[11px] px-2.5 py-1 rounded-full font-medium",
      active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600",
    )}>
      <span className={cn("w-1.5 h-1.5 rounded-full flex-shrink-0", active ? "bg-emerald-500" : "bg-slate-400")} />
      {active ? "Active" : "Inactive"}
    </span>
  );
}

// ── Info row ─────────────────────────────────────────────────────────────────
function InfoRow({ label, value, children }: { label: string; value?: string; children?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between py-2.5 border-b border-border/50 last:border-0 gap-4">
      <span className="text-xs text-muted-foreground flex-shrink-0 w-28">{label}</span>
      {children ?? <span className="text-xs font-medium text-foreground text-right">{value || "—"}</span>}
    </div>
  );
}

// ── Main ─────────────────────────────────────────────────────────────────────
export default function GeographyViewPage() {
  const router = useRouter();
  const params = useParams();
  const id = Number(params.id);

  const [nodes, setNodes] = useState<GeoNode[]>([]);
  const [node, setNode] = useState<GeoNode | null>(null);

  useEffect(() => {
    const all = loadGeoNodes();
    setNodes(all);
    setNode(all.find(n => n.id === id) ?? null);
  }, [id]);

  if (nodes.length > 0 && !node) {
    return (
      <AppLayout>
        <div className="flex flex-col items-center justify-center py-24 gap-3">
          <MapPin className="w-8 h-8 text-muted-foreground" />
          <p className="text-sm font-medium text-foreground">Geography node not found</p>
          <button onClick={() => router.push("/masters/geography")} className="text-xs text-brand-600 hover:underline">
            ← Back to Geography
          </button>
        </div>
      </AppLayout>
    );
  }

  if (!node) return null; // Loading

  const path = getAncestorPath(node, nodes);
  const parent = node.parentId ? nodes.find(n => n.id === node.parentId) : null;
  const children = getChildren(node.id, nodes);

  return (
    <AppLayout>
      <div className="max-w-[640px] mx-auto space-y-5">

        {/* Back button */}
        <button
          onClick={() => router.push("/masters/geography")}
          className="flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Geography
        </button>

        {/* ── Main card ── */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">

          {/* Card header */}
          <div className="px-5 py-4 border-b border-border flex items-start justify-between gap-3">
            <div className="flex items-start gap-3 flex-1 min-w-0">
              <div className="w-10 h-10 rounded-xl bg-brand-50 border border-brand-100 flex items-center justify-center flex-shrink-0">
                <MapPin className="w-5 h-5 text-brand-600" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h1 className="text-base font-bold text-foreground leading-tight">{node.name}</h1>
                  {node.code && (
                    <span className="font-mono text-[11px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-px rounded">
                      {node.code}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                  <LevelBadge level={node.level} />
                  <StatusPill status={node.status} />
                </div>
              </div>
            </div>
            <Button
              size="sm"
              className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white flex-shrink-0"
              onClick={() => router.push(`/masters/geography/${node.id}/edit`)}
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          </div>

          {/* Hierarchy path */}
          {path.length > 1 && (
            <div className="px-5 py-3 border-b border-border bg-muted/20">
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-2">
                Hierarchy Path
              </p>
              <div className="flex items-center flex-wrap gap-1">
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
            </div>
          )}

          {/* Details grid */}
          <div className="px-5 py-4">
            <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground mb-3">
              Details
            </p>
            <div className="bg-muted/20 rounded-xl border border-border/50 px-3">
              <InfoRow label="Name" value={node.name} />
              <InfoRow label="Level"><LevelBadge level={node.level} /></InfoRow>
              <InfoRow label="Code" value={node.code || "—"} />
              <InfoRow label="Status"><StatusPill status={node.status} /></InfoRow>
              {node.level === "Pincode" && (
                <InfoRow label="Pincode" value={node.pincode || "—"} />
              )}
              <InfoRow label="Parent">
                {parent ? (
                  <Link
                    href={`/masters/geography/${parent.id}`}
                    className="text-xs font-medium text-brand-600 hover:underline"
                  >
                    {parent.name}
                  </Link>
                ) : (
                  <span className="text-xs font-medium text-muted-foreground">None (Root)</span>
                )}
              </InfoRow>
              <InfoRow label="Created" value={node.createdDate} />
              <InfoRow label="Last Updated" value={node.updatedDate} />
            </div>
          </div>

        </div>

        {/* ── Children section ── */}
        <div className="bg-white rounded-xl border border-border shadow-sm overflow-hidden">
          <div className="px-5 py-4 border-b border-border flex items-center gap-2">
            <Users className="w-4 h-4 text-muted-foreground" />
            <p className="text-xs font-semibold text-foreground">
              Direct Children ({children.length})
            </p>
          </div>

          {children.length === 0 ? (
            <div className="px-5 py-8 text-center">
              <p className="text-xs text-muted-foreground">No children under this node.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-muted/30 border-b border-border">
                    <th className="px-4 py-2 text-left text-xs font-semibold text-foreground">Name</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-32">Level</th>
                    <th className="px-3 py-2.5 text-left text-xs font-semibold text-foreground w-28">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {children.map(child => (
                    <tr key={child.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors">
                      <td className="px-4 py-2">
                        <Link
                          href={`/masters/geography/${child.id}`}
                          className="text-xs font-semibold text-foreground hover:text-brand-600 transition-colors"
                        >
                          {child.name}
                        </Link>
                        {child.code && (
                          <span className="ml-1.5 font-mono text-[10px] font-semibold text-brand-700 bg-brand-50 border border-brand-100 px-1.5 py-px rounded">
                            {child.code}
                          </span>
                        )}
                      </td>
                      <td className="px-3 py-2.5"><LevelBadge level={child.level} /></td>
                      <td className="px-3 py-2.5"><StatusPill status={child.status} /></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>
    </AppLayout>
  );
}
