"use client";

import React, { useCallback, useMemo, useState } from "react";
import { AppLayout } from "@/components/layout/AppLayout";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, Search } from "lucide-react";
import {
  AccountTxn,
  RecordStatus,
  TxnType,
  loadAccountTxns,
  nextId,
  postEntryAfterApproval,
  saveAccountTxns,
} from "../data";
import {
  AccountsColumnFilterProvider,
  AccountsColumnHeader,
  SortTh,
  SectionTabs,
  useAccountsFilteredRows,
} from "./AccountsUI";
import {
  ACCOUNTS_ACTION_BUTTON_CLASS,
  ACCOUNTS_PAGE_SUBTITLE_CLASS,
  ACCOUNTS_PAGE_TITLE_CLASS,
} from "@/lib/accounts/accounts-typography";

const TABS = [
  { id: "all", label: "All" },
  { id: "draft", label: "Draft" },
  { id: "approved", label: "Approved" },
  { id: "posted", label: "Posted" },
  { id: "rejected", label: "Rejected" },
];

function TransactionTable({
  title,
  partyLabel,
  toolbarRows,
  onApprove,
  onPost,
}: {
  title: string;
  partyLabel: string;
  toolbarRows: AccountTxn[];
  onApprove: (rec: AccountTxn) => void;
  onPost: (rec: AccountTxn) => void;
}) {
  const visible = useAccountsFilteredRows(toolbarRows);

  return (
    <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
      <div className="overflow-x-auto">
        <table className="accounts-table w-full min-w-[980px] text-xs">
          <thead className="border-b border-border/60">
            <tr>
              <SortTh label={`${title} No.`} colKey="number" />
              <SortTh label="Date" colKey="date" filterType="date" />
              <SortTh label={partyLabel} colKey="party" />
              <SortTh label="Reference No." colKey="referenceNo" />
              <SortTh label="Amount" colKey="amount" filterType="amount" align="right" />
              <SortTh label="Tax" colKey="taxAmount" filterType="amount" align="right" />
              <SortTh label="Total" colKey="totalAmount" filterType="amount" align="right" />
              <SortTh label="Created By" colKey="createdBy" />
              <SortTh label="Updated By" colKey="updatedBy" />
              <AccountsColumnHeader label="" colKey="_actions" sortable={false} filterable={false} />
            </tr>
          </thead>
          <tbody>
            {visible.map((r) => (
              <tr key={r.id} className="accounts-table-row group">
                <td className="px-3 py-2 text-xs font-mono">{r.number}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.date}</td>
                <td className="px-3 py-2 text-xs">{r.party}</td>
                <td className="px-3 py-2 text-xs">{r.referenceNo || "—"}</td>
                <td className="px-3 py-2 text-xs">{r.amount.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs">{r.taxAmount.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs font-semibold">{r.totalAmount.toFixed(2)}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.createdBy}</td>
                <td className="px-3 py-2 text-xs text-muted-foreground">{r.updatedBy}</td>
                <td className="px-3 py-2 text-right">
                  {r.status === "draft" && (
                    <Button size="sm" className="h-7 text-sm" onClick={() => onApprove(r)}>
                      Approve
                    </Button>
                  )}
                  {r.status === "approved" && (
                    <Button
                      size="sm"
                      className="h-7 text-sm bg-emerald-600 hover:bg-emerald-700 text-white"
                      onClick={() => onPost(r)}
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
  );
}

export function TransactionPage({
  txnType,
  title,
  partyLabel,
}: {
  txnType: TxnType;
  title: string;
  partyLabel: string;
}) {
  const [records, setRecords] = useState<AccountTxn[]>(loadAccountTxns().filter((x) => x.txnType === txnType));
  const [tab, setTab] = useState("all");
  const [search, setSearch] = useState("");

  const refresh = () => setRecords(loadAccountTxns().filter((x) => x.txnType === txnType));
  const counts = useMemo(() => {
    const c: Record<string, number> = { all: records.length };
    ["draft", "approved", "posted", "rejected"].forEach((s) => {
      c[s] = records.filter((r) => r.status === s).length;
    });
    return c;
  }, [records]);

  const toolbarRows = useMemo(() => {
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
    return r;
  }, [records, tab, search]);

  const getCellValue = useCallback(
    (row: AccountTxn, key: string) => (row as unknown as Record<string, unknown>)[key],
    [],
  );

  const createDraft = () => {
    const all = loadAccountTxns();
    const id = nextId(all);
    const code: Record<TxnType, string> = {
      purchase: "PUR",
      sales: "SAL",
      purchase_return: "PRT",
      sales_return: "SRT",
      expenses: "EXP",
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
    const all = loadAccountTxns().map((x) => (x.id === rec.id ? { ...x, status, updatedBy: "Admin" } : x));
    saveAccountTxns(all);
    refresh();
  };

  return (
    <AppLayout>
      <div className="max-w-[1400px] mx-auto space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h1 className={ACCOUNTS_PAGE_TITLE_CLASS}>{title}</h1>
            <p className={ACCOUNTS_PAGE_SUBTITLE_CLASS}>
              ERP posting supported only for approved records.
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              className={ACCOUNTS_ACTION_BUTTON_CLASS}
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
            <Button className={`${ACCOUNTS_ACTION_BUTTON_CLASS} bg-brand-600 text-white`} onClick={createDraft}>
              <Plus className="w-4 h-4 mr-1" /> New Entry
            </Button>
          </div>
        </div>

        <SectionTabs tabs={TABS} active={tab} onChange={setTab} counts={counts} />

        <div className="relative max-w-md">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-8 pl-9 text-[13px]"
            placeholder={`Search ${title}`}
          />
        </div>

        <AccountsColumnFilterProvider
          rows={toolbarRows}
          getCellValue={getCellValue}
          columnConfig={{
            number: { type: "text" },
            date: { type: "date" },
            party: { type: "text" },
            referenceNo: { type: "text" },
            amount: { type: "amount" },
            taxAmount: { type: "amount" },
            totalAmount: { type: "amount" },
            createdBy: { type: "text" },
            updatedBy: { type: "text" },
          }}
          defaultSortKey="date"
          defaultSortDir="desc"
        >
          <TransactionTable
            title={title}
            partyLabel={partyLabel}
            toolbarRows={toolbarRows}
            onApprove={(r) => updateStatus(r, "approved")}
            onPost={(r) => updateStatus(r, "posted")}
          />
        </AccountsColumnFilterProvider>
      </div>
    </AppLayout>
  );
}
