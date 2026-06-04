"use client";

import React, { useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageContentSkeleton } from "@/components/layout/PageContentSkeleton";
import { PageHeader } from "@/components/ui/PageHeader";
import { Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import { useDeferredLoad } from "@/hooks/useDeferredLoad";
import {
  AccountTxn,
  RecordStatus,
  TxnType,
  loadAccountTxns,
  nextId,
  postEntryAfterApproval,
  saveAccountTxns,
} from "../data";
import { SortTh, StatusBadge, SectionTabs } from "./AccountsUI";

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "approved", label: "Approved" },
  { id: "posted", label: "Posted" },
  { id: "rejected", label: "Rejected" },
];

export type TransactionPageClientProps = {
  txnType: TxnType;
  title: string;
  partyLabel: string;
};

export default function TransactionPageClient({
  txnType,
  title,
  partyLabel,
}: TransactionPageClientProps) {
  const { data: allTxns, ready } = useDeferredLoad(
    () => loadAccountTxns().filter((x) => x.txnType === txnType),
    [txnType],
  );
  const [records, setRecords] = useState<AccountTxn[]>([]);
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");
  const [sortKey, setSortKey] = useState("date");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("desc");

  React.useEffect(() => {
    if (ready) setRecords(allTxns);
  }, [ready, allTxns]);

  const refresh = () => setRecords(loadAccountTxns().filter((x) => x.txnType === txnType));

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    ["draft", "approved", "posted", "rejected"].forEach((s) => {
      c[s] = records.filter((r) => r.status === s).length;
    });
    return c;
  }, [records]);

  const visible = useMemo(() => {
    let r = [...records];
    if (tab !== "all") r = r.filter((x) => x.status === tab);
    if (search.trim()) {
      const q = search.toLowerCase();
      r = r.filter(
        (x) =>
          x.number.toLowerCase().includes(q) ||
          x.party.toLowerCase().includes(q) ||
          x.referenceNo.toLowerCase().includes(q),
      );
    }
    return r.sort((a, b) => {
      const av = String((a as unknown as Record<string, unknown>)[sortKey] ?? "");
      const bv = String((b as unknown as Record<string, unknown>)[sortKey] ?? "");
      return sortDir === "asc" ? av.localeCompare(bv) : bv.localeCompare(av);
    });
  }, [records, tab, search, sortKey, sortDir]);

  const createDraft = () => {
    const all = loadAccountTxns();
    const id = nextId(all);
    const code: Record<TxnType, string> = {
      purchase: "PUR",
      sales: "SAL",
      purchase_return: "PRT",
      sales_return: "SRT",
      payment: "PAY",
      bank_reconciliation: "BNK",
      journal: "JRN",
    };
    all.push({
      id,
      txnType,
      number: `${code[txnType]}-${String(id).padStart(4, "0")}`,
      date: new Date().toISOString().slice(0, 10),
      party: `New ${partyLabel}`,
      referenceNo: "",
      referenceModule: "Manual",
      amount: 0,
      taxAmount: 0,
      totalAmount: 0,
      remarks: "",
      status: "draft",
      createdBy: "Admin",
      updatedBy: "Admin",
    });
    saveAccountTxns(all);
    refresh();
  };

  const updateStatus = (rec: AccountTxn, status: RecordStatus) => {
    const all = loadAccountTxns().map((x) =>
      x.id === rec.id ? { ...x, status, updatedBy: "Admin" } : x,
    );
    saveAccountTxns(all);
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <PageHeader
          title={title}
          description="ERP posting supported only for approved records."
          icon={Wallet}
          breadcrumbs={[
            { label: "Accounts", href: "/accounts" },
            { label: title },
          ]}
          actions={
            <>
            <Button
              variant="outline"
              onClick={() => {
                postEntryAfterApproval({
                  txnType,
                  approvalStatus: "approved",
                  sourceModule: "ERP Integration",
                  sourceRefNo: "AUTO-REF",
                  party: `Auto ${partyLabel}`,
                  amount: 1000,
                  taxAmount: 180,
                });
                refresh();
              }}
            >
              Post Approved Entry
            </Button>
            <Button onClick={createDraft}>
              <Plus className="w-3.5 h-3.5" /> New Entry
            </Button>
            </>
          }
        />

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-9 pl-9 text-sm"
            placeholder={`Search ${title}`}
          />
        </div>

        {!ready ? (
          <PageContentSkeleton />
        ) : (
          <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full min-w-[980px] text-sm">
                <thead className="bg-muted/20 border-b border-border/60">
                  <tr>
                    <SortTh
                      label={`${title} No.`}
                      colKey="number"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={(k) => {
                        setSortKey(k);
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      }}
                    />
                    <SortTh
                      label="Date"
                      colKey="date"
                      sortKey={sortKey}
                      sortDir={sortDir}
                      onSort={(k) => {
                        setSortKey(k);
                        setSortDir(sortDir === "asc" ? "desc" : "asc");
                      }}
                    />
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      {partyLabel}
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Reference No.
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Amount
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Tax
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Total
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Status
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Created By
                    </th>
                    <th className="px-3 py-2.5 text-left text-[11px] font-medium text-muted-foreground">
                      Updated By
                    </th>
                    <th className="px-3 py-2.5 w-36" />
                  </tr>
                </thead>
                <tbody>
                  {visible.map((r) => (
                    <tr key={r.id} className="border-b border-border/40 last:border-0 h-11">
                      <td className="px-3 py-2 text-xs font-mono">{r.number}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.date}</td>
                      <td className="px-3 py-2 text-xs">{r.party}</td>
                      <td className="px-3 py-2 text-xs">{r.referenceNo || "—"}</td>
                      <td className="px-3 py-2 text-xs">{r.amount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs">{r.taxAmount.toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs font-semibold">{r.totalAmount.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <StatusBadge status={r.status} />
                      </td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                      <td className="px-3 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                      <td className="px-3 py-2 text-right">
                        {r.status === "draft" && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px]"
                            onClick={() => updateStatus(r, "approved")}
                          >
                            Approve
                          </Button>
                        )}
                        {r.status === "approved" && (
                          <Button
                            size="sm"
                            className="h-7 text-[11px] bg-emerald-600 hover:bg-emerald-700 text-white"
                            onClick={() => updateStatus(r, "posted")}
                          >
                            Post
                          </Button>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </AppLayout>
  );
}
