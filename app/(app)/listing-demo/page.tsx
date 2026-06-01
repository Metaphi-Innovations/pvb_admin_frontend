"use client";

import React, { useState } from "react";
import { AppLayout, PageShell } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { DataTable, type Column } from "@/components/ui/DataTable";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Eye, Pencil, FileText, Trash2, Users } from "lucide-react";
import type { StatusKey } from "@/lib/tokens";

// ── Sample data ───────────────────────────────────────────────────────────────
interface Distributor {
  id:        string;
  name:      string;
  code:      string;
  state:     string;
  district:  string;
  mobile:    string;
  gstin:     string;
  creditLimit: string;
  outstanding: string;
  status:    StatusKey;
  since:     string;
}

const SAMPLE_DATA: Distributor[] = Array.from({ length: 24 }, (_, i) => ({
  id:          `DIST-${String(i + 1).padStart(4, "0")}`,
  name:        ["Agro World Pvt Ltd", "Green Fields Traders", "Kisan Seva Kendra", "Agri Input Hub",
                 "Farm Fresh Supply", "BioGrow Traders", "Harit Krishi", "Shivam Agro",][i % 8]!,
  code:        `DT${String(1000 + i + 1)}`,
  state:       ["Maharashtra", "Karnataka", "MP", "Rajasthan"][i % 4]!,
  district:    ["Pune", "Nashik", "Aurangabad", "Kolhapur", "Belgaum", "Indore", "Jaipur", "Surat"][i % 8]!,
  mobile:      `98765${String(43210 + i).padStart(5, "0")}`,
  gstin:       `27AABCP${String(1234 + i)}A1Z5`,
  creditLimit: ["₹5L", "₹10L", "₹8L", "₹15L", "₹3L"][i % 5]!,
  outstanding: ["₹1.2L", "₹3.4L", "₹0", "₹5.6L", "₹2.1L"][i % 5]!,
  status:      (["active", "active", "active", "inactive", "pending"] as StatusKey[])[i % 5]!,
  since:       `${2018 + (i % 6)}-${String((i % 12) + 1).padStart(2, "0")}-01`,
}));

// ── Columns ───────────────────────────────────────────────────────────────────
const COLUMNS: Column<Distributor>[] = [
  {
    key: "id", header: "Dist. ID", sortable: true, width: "100px",
    render: (v) => <span className="font-mono text-xs text-brand-700 font-semibold">{String(v)}</span>,
  },
  {
    key: "name", header: "Distributor Name", sortable: true,
    render: (v, row) => (
      <div>
        <p className="font-medium text-foreground">{String(v)}</p>
        <p className="text-[11px] text-muted-foreground">{row.code}</p>
      </div>
    ),
  },
  { key: "state",    header: "State",    sortable: true },
  { key: "district", header: "District", sortable: true },
  { key: "mobile",   header: "Mobile",   render: (v) => <span className="font-mono text-xs">{String(v)}</span> },
  { key: "creditLimit", header: "Credit Limit", align: "right", sortable: true,
    render: (v) => <span className="font-semibold text-foreground">{String(v)}</span>,
  },
  { key: "outstanding", header: "Outstanding", align: "right", sortable: true,
    render: (v) => {
      const zero = String(v) === "₹0";
      return (
        <span className={zero ? "text-muted-foreground" : "font-semibold text-amber-700"}>
          {String(v)}
        </span>
      );
    },
  },
  {
    key: "status", header: "Status", align: "center",
    render: (v) => <StatusBadge status={v as StatusKey} size="sm" />,
  },
  { key: "since", header: "Member Since", sortable: true,
    render: (v) => <span className="text-muted-foreground text-xs">{String(v)}</span>,
  },
];

// ── Page ───────────────────────────────────────────────────────────────────────
export default function ListingDemoPage() {
  const [search,   setSearch]   = useState("");
  const [status,   setStatus]   = useState("all");
  const [state,    setState]    = useState("all");
  const [page,     setPage]     = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const filtered = SAMPLE_DATA.filter(d => {
    const matchSearch = !search || d.name.toLowerCase().includes(search.toLowerCase()) || d.id.includes(search);
    const matchStatus = status === "all" || d.status === status;
    const matchState  = state  === "all" || d.state === state;
    return matchSearch && matchStatus && matchState;
  });

  const paginated = filtered.slice((page - 1) * pageSize, page * pageSize);

  return (
    <AppLayout>
      <PageShell>
        <PageHeader
          title="Distributors"
          description="Manage your distributor network across all territories"
          icon={Users}
          breadcrumbs={[
            { label: "Home",    href: "/dashboard" },
            { label: "Masters", href: "/masters"   },
            { label: "Distributors" },
          ]}
          actions={
            <Button
              className="bg-brand-500 hover:bg-brand-600 text-white gap-1.5"
              size="sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add Distributor
            </Button>
          }
        />

        <DataTable
          columns={COLUMNS}
          data={paginated}
          totalCount={filtered.length}
          page={page}
          pageSize={pageSize}
          onPageChange={setPage}
          onPageSizeChange={(s) => { setPageSize(s); setPage(1); }}
          searchValue={search}
          onSearchChange={(v) => { setSearch(v); setPage(1); }}
          searchPlaceholder="Search by name, code, GSTIN…"
          emptyModule="Distributor"
          rowKey={r => r.id}
          onRowClick={row => console.log("Row clicked:", row)}
          filterSlot={
            <div className="flex items-center gap-2">
              <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-28 text-xs rounded-input">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"      className="text-xs">All Status</SelectItem>
                  <SelectItem value="active"   className="text-xs">Active</SelectItem>
                  <SelectItem value="inactive" className="text-xs">Inactive</SelectItem>
                  <SelectItem value="pending"  className="text-xs">Pending</SelectItem>
                </SelectContent>
              </Select>
              <Select value={state} onValueChange={(v) => { setState(v); setPage(1); }}>
                <SelectTrigger className="h-8 w-32 text-xs rounded-input">
                  <SelectValue placeholder="State" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all"         className="text-xs">All States</SelectItem>
                  <SelectItem value="Maharashtra" className="text-xs">Maharashtra</SelectItem>
                  <SelectItem value="Karnataka"   className="text-xs">Karnataka</SelectItem>
                  <SelectItem value="MP"          className="text-xs">MP</SelectItem>
                  <SelectItem value="Rajasthan"   className="text-xs">Rajasthan</SelectItem>
                </SelectContent>
              </Select>
            </div>
          }
          actions={[
            { label: "View",         icon: Eye,      onClick: (r) => console.log("View",   r) },
            { label: "Edit",         icon: Pencil,   onClick: (r) => console.log("Edit",   r) },
            { label: "Statement",    icon: FileText,  onClick: (r) => console.log("Stmt",   r) },
            { label: "Delete",       icon: Trash2,   onClick: (r) => console.log("Delete", r), variant: "destructive" },
          ]}
          bulkActions={[
            { label: "Export Selected", onClick: (rows) => console.log("Export", rows) },
          ]}
        />
      </PageShell>
    </AppLayout>
  );
}
