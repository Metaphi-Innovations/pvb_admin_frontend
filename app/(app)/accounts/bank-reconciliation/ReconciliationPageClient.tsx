"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { AppLayout } from "@/components/layout/AppLayout";
import { PageHeader } from "@/components/ui/PageHeader";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsListingTableCard } from "@/components/accounts/AccountsListingHeader";
import {
  ReportFilterRow,
  ReportSearchFilter,
  ACCOUNTS_FILTER_CONTROL_CLASS,
  ACCOUNTS_FILTER_LABEL_CLASS,
} from "@/components/accounts/ReportFilters";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { FileSpreadsheet, FlaskConical, Landmark, MoreVertical, Plus, Trash2, Upload } from "lucide-react";
import { accountsBreadcrumb } from "@/lib/accounts/accounts-nav";
import { seedDummyBankReconciliation } from "./bank-reconciliation-demo";
import {
  deleteBankStatement,
  enrichStatementsWithStats,
  filterStatements,
  loadBankAccounts,
  loadBankStatements,
  type BankStatement,
} from "./bank-reconciliation-data";
import { exportAllReconciliationData, exportStatementsListToExcel } from "./bank-reconciliation-export";
import { UploadStatementDialog } from "./components/UploadStatementDialog";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import { MONTH_NAMES, monthYearLabel, RECONCILIATION_BREADCRUMB, RECONCILIATION_LIST_PATH } from "./reconciliation-utils";

interface ReconciliationPageClientProps {
  embedded?: boolean;
}

export default function ReconciliationPageClient({ embedded = false }: ReconciliationPageClientProps) {
  const router = useRouter();
  const [statements, setStatements] = useState(() => enrichStatementsWithStats(loadBankStatements()));
  const [search, setSearch] = useState("");
  const [bankFilter, setBankFilter] = useState("all");
  const [monthFilter, setMonthFilter] = useState("all");
  const [yearFilter, setYearFilter] = useState("all");
  const [uploadOpen, setUploadOpen] = useState(false);
  const [reuploadPreset, setReuploadPreset] = useState<BankStatement | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<BankStatement | null>(null);
  const [exporting, setExporting] = useState(false);

  const accounts = loadBankAccounts();
  const years = useMemo(() => {
    const set = new Set(statements.map((s) => s.year));
    const y = new Date().getFullYear();
    set.add(y);
    set.add(y - 1);
    return Array.from(set).sort((a, b) => b - a);
  }, [statements]);

  const refresh = useCallback(() => {
    setStatements(enrichStatementsWithStats(loadBankStatements()));
  }, []);

  useEffect(() => {
    seedDummyBankReconciliation();
    refresh();
  }, [refresh]);

  const visible = useMemo(
    () =>
      filterStatements(statements, {
        search,
        bankAccountId: bankFilter,
        month: monthFilter,
        year: yearFilter,
      }),
    [statements, search, bankFilter, monthFilter, yearFilter],
  );

  const grouped = useMemo(() => {
    const map = new Map<string, typeof visible>();
    for (const s of visible) {
      const key = monthYearLabel(s.month, s.year);
      if (!map.has(key)) map.set(key, []);
      map.get(key)!.push(s);
    }
    return Array.from(map.entries());
  }, [visible]);

  const handleExportList = async () => {
    setExporting(true);
    try {
      await exportStatementsListToExcel(visible);
    } finally {
      setExporting(false);
    }
  };

  const handleExportAll = async () => {
    setExporting(true);
    try {
      await exportAllReconciliationData();
    } finally {
      setExporting(false);
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    deleteBankStatement(deleteTarget.id);
    setDeleteTarget(null);
    refresh();
  };

  const headerActions = (
    <div className="flex flex-wrap items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-[13px] font-medium gap-1.5"
        disabled={exporting || visible.length === 0}
        onClick={handleExportList}
      >
        <FileSpreadsheet className="w-4 h-4" />
        Export List
      </Button>
      <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium gap-1.5" disabled={exporting} onClick={handleExportAll}>
        <FileSpreadsheet className="w-4 h-4" />
        Export All Entries
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="h-9 text-[13px] font-medium gap-1.5"
        onClick={() => {
          const { statementId } = seedDummyBankReconciliation(true);
          refresh();
          router.push(`${RECONCILIATION_LIST_PATH}/${statementId}`);
        }}
      >
        <FlaskConical className="w-4 h-4" />
        Load demo entries
      </Button>
      <Button
        size="sm"
        className="h-9 text-[13px] font-medium gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
        onClick={() => {
          setReuploadPreset(null);
          setUploadOpen(true);
        }}
      >
        <Upload className="w-4 h-4" />
        Upload Statement
      </Button>
    </div>
  );

  const filterBar = (
    <ReportFilterRow>
      <ReportSearchFilter
        value={search}
        onChange={setSearch}
        placeholder="Bank account, statement name…"
        className="min-w-[200px] flex-1 max-w-md"
      />
      <div className="space-y-1 min-w-[160px]">
        <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank</Label>
        <Select value={bankFilter} onValueChange={setBankFilter}>
          <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[160px]")}>
            <SelectValue placeholder="All banks" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All banks</SelectItem>
            {accounts.map((a) => (
              <SelectItem key={a.id} value={String(a.id)}>
                {a.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 min-w-[130px]">
        <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Month</Label>
        <Select value={monthFilter} onValueChange={setMonthFilter}>
          <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[130px]")}>
            <SelectValue placeholder="All months" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All months</SelectItem>
            {MONTH_NAMES.map((m, i) => (
              <SelectItem key={m} value={String(i + 1)}>
                {m}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1 min-w-[100px]">
        <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Year</Label>
        <Select value={yearFilter} onValueChange={setYearFilter}>
          <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "mt-0 w-[100px]")}>
            <SelectValue placeholder="All years" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All years</SelectItem>
            {years.map((y) => (
              <SelectItem key={y} value={String(y)}>
                {y}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </ReportFilterRow>
  );

  const listContent = grouped.length === 0 ? (
    <div className="flex flex-col items-center justify-center py-16 text-center">
      <Landmark className="w-10 h-10 text-muted-foreground/40 mb-3" />
      <p className="text-sm text-muted-foreground">No bank statements yet. Upload a monthly statement to begin.</p>
      <Button size="sm" className="mt-4 h-9 text-[13px] font-medium bg-brand-600 text-white" onClick={() => setUploadOpen(true)}>
        <Plus className="w-4 h-4 mr-1" />
        Upload Statement
      </Button>
    </div>
  ) : (
    <div className="space-y-4 p-4">
      {grouped.map(([period, rows]) => (
        <div key={period} className="space-y-2">
          <h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground px-0.5">{period}</h2>
          <div className="bg-white border border-border/60 rounded-lg overflow-hidden">
            <div className="overflow-x-auto">
              <table className="accounts-table w-full min-w-[1200px]">
                <thead className="border-b border-border/60">
                  <tr>
                    {[
                      "Bank Account",
                      "Month",
                      "Year",
                      "Total",
                      "Matched",
                      "Unmatched",
                      "Reconciled",
                      "Status",
                      "Uploaded By",
                      "Uploaded",
                      "",
                    ].map((h) => (
                      <th
                        key={h || "a"}
                        className="px-2.5 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {rows.map((s) => (
                    <tr key={s.id} className="accounts-table-row group">
                      <td className="px-2.5 py-2 text-xs font-medium">{s.bankAccountName}</td>
                      <td className="px-2.5 py-2 text-xs">{MONTH_NAMES[s.month - 1]}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{s.year}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums">{s.total}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums text-blue-700">{s.matched}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums text-amber-700">{s.unmatched}</td>
                      <td className="px-2.5 py-2 text-xs tabular-nums text-emerald-700">{s.reconciled}</td>
                      <td className="px-2.5 py-2 text-xs">
                        <span className="inline-flex px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 text-[10px] font-medium">
                          {s.uploadStatus}
                        </span>
                      </td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{s.uploadedBy}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{s.uploadedAt?.slice(0, 10)}</td>
                      <td className="px-2.5 py-2 text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-7 w-7">
                              <MoreVertical className="w-4 h-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-44">
                            <DropdownMenuItem className="text-xs" asChild>
                              <Link href={`${RECONCILIATION_LIST_PATH}/${s.id}`}>View Entries</Link>
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={() => {
                                setReuploadPreset(s);
                                setUploadOpen(true);
                              }}
                            >
                              Re-upload / Overwrite
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              className="text-xs"
                              onClick={async () => {
                                const { exportStatementEntriesToExcel } = await import("./bank-reconciliation-export");
                                const { getEntriesForStatement } = await import("./bank-reconciliation-data");
                                await exportStatementEntriesToExcel(s, getEntriesForStatement(s.id));
                              }}
                            >
                              Export Excel
                            </DropdownMenuItem>
                            <DropdownMenuItem className="text-xs text-red-600" onClick={() => setDeleteTarget(s)}>
                              <Trash2 className="w-3 h-3 mr-1.5" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const dialogs = (
    <>
      <UploadStatementDialog
        open={uploadOpen}
        onOpenChange={(v) => {
          setUploadOpen(v);
          if (!v) setReuploadPreset(null);
        }}
        preset={reuploadPreset}
        onSuccess={(id) => {
          refresh();
          router.push(`${RECONCILIATION_LIST_PATH}/${id}`);
        }}
      />

      <Dialog open={!!deleteTarget} onOpenChange={(v) => !v && setDeleteTarget(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="text-sm">Delete statement?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground">
            This will remove all entries and matching data for{" "}
            <strong>{deleteTarget?.statementName}</strong>. This cannot be undone.
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-9 text-[13px] font-medium" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button size="sm" className="h-9 text-[13px] font-medium bg-red-600 hover:bg-red-700 text-white" onClick={confirmDelete}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );

  if (embedded) {
    return (
      <>
        <AccountsPageShell
          breadcrumbs={accountsBreadcrumb("Banking", "Bank Reconciliation")}
          title="Bank Reconciliation"
          description="Upload month-wise bank statements and manually match entries to payments, purchases, sales, and ledgers."
          actions={headerActions}
          filters={filterBar}
          layout="split"
          className="h-full min-h-0"
        >
          <AccountsListingTableCard className="flex-1 min-h-0">
            <div className="flex-1 overflow-auto min-h-0">{listContent}</div>
          </AccountsListingTableCard>
        </AccountsPageShell>
        {dialogs}
      </>
    );
  }

  return (
    <AppLayout>
      <div className="max-w-[1680px] mx-auto space-y-3">
        <PageHeader
          title="Bank Reconciliation"
          description="Upload month-wise bank statements and manually match entries to payments, purchases, sales, and ledgers."
          breadcrumbs={RECONCILIATION_BREADCRUMB}
          actions={headerActions}
        />
        {filterBar}
        {listContent}
      </div>
      {dialogs}
    </AppLayout>
  );
}
