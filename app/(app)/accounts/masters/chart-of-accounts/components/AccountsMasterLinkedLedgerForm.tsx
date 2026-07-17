"use client";

import { useMemo, useState } from "react";
import { ArrowLeft, Check, ChevronsUpDown, Save, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AccountsMoneyInput } from "@/components/accounts/AccountsMoneyInput";
import { cn } from "@/lib/utils";
import { loadProducts } from "@/app/(app)/masters/products/product-data";
import { loadGSTMasters } from "@/app/(app)/masters/gst/gst-data";
import { loadHrEmployees } from "@/app/(app)/hr/employees/employee-master-data";
import {
  loadChartOfAccounts,
  nextId,
  saveChartOfAccounts,
} from "@/app/(app)/accounts/data";
import {
  DEFAULT_LEDGER_FORM,
  defaultBalanceTypeForParent,
  formToLedger,
  generateLedgerCode,
  parentGroupLabel,
} from "../chart-of-accounts-data";
import type { CoaMasterLinkedFormKind } from "../coa-master-linked-form-bridge";
import { dispatchAccountsDataChanged } from "@/lib/accounts/accounts-data-events";

interface MasterOption {
  id: number;
  name: string;
  code: string;
  details: Array<{ label: string; value: string }>;
}

const CONFIG: Record<
  CoaMasterLinkedFormKind,
  { title: string; source: string; module: string }
> = {
  product: {
    title: "Product Ledger",
    source: "ERP Product Master",
    module: "product_master",
  },
  gst: { title: "GST Ledger", source: "GST Master", module: "gst_master" },
  employee: {
    title: "Employee Ledger",
    source: "HR Employee Master",
    module: "employee_master",
  },
};

function loadOptions(kind: CoaMasterLinkedFormKind): MasterOption[] {
  if (kind === "product") {
    return loadProducts()
      .filter((item) => item.status === "active")
      .map((item) => ({
        id: item.id,
        name: item.productName,
        code: item.sku || item.productCode,
        details: [
          { label: "SKU", value: item.sku || item.productCode },
          { label: "Unit", value: item.baseUnit || item.mou || "—" },
          { label: "HSN", value: item.hsnCode || "—" },
          { label: "GST", value: item.gstRate ? `${item.gstRate}%` : "—" },
        ],
      }));
  }
  if (kind === "gst") {
    return loadGSTMasters()
      .filter((item) => item.status === "active")
      .map((item) => ({
        id: item.id,
        name: item.gstName || `${item.gstPercentage}% GST`,
        code: item.gstCode || item.gstId,
        details: [
          { label: "GST Type", value: item.taxType || "Taxable" },
          { label: "GST Rate", value: `${item.gstPercentage}%` },
          { label: "GST Nature", value: item.remarks || "Statutory GST" },
        ],
      }));
  }
  return loadHrEmployees()
    .filter((item) => item.status === "active")
    .map((item) => ({
      id: item.id,
      name: item.employeeName,
      code: item.employeeCode,
      details: [
        { label: "Employee", value: item.employeeCode },
        { label: "Department", value: item.department || "—" },
        { label: "Branch", value: item.branch || "—" },
      ],
    }));
}

export function AccountsMasterLinkedLedgerForm({
  kind,
  parentGroupId,
  onClose,
  onSaved,
}: {
  kind: CoaMasterLinkedFormKind;
  parentGroupId: number;
  onClose: () => void;
  onSaved: (ledgerId: number, parentGroupId: number) => void;
}) {
  const config = CONFIG[kind];
  const records = loadChartOfAccounts();
  const options = useMemo(() => loadOptions(kind), [kind]);
  const [selectedId, setSelectedId] = useState<number | null>(null);
  const [search, setSearch] = useState("");
  const [open, setOpen] = useState(false);
  const [openingBalance, setOpeningBalance] = useState("0");
  const [balanceType, setBalanceType] = useState<"Debit" | "Credit">(
    defaultBalanceTypeForParent(records, parentGroupId),
  );
  const [error, setError] = useState<string | null>(null);

  const selected = options.find((option) => option.id === selectedId) ?? null;
  const filtered = options.filter((option) =>
    `${option.name} ${option.code}`.toLowerCase().includes(search.trim().toLowerCase()),
  );

  const handleSave = () => {
    if (!selected) {
      setError(`Select a record from ${config.source}.`);
      return;
    }
    const latest = loadChartOfAccounts();
    const existing = latest.find(
      (record) =>
        record.nodeLevel === "ledger" &&
        record.erpSourceModule === config.module &&
        record.erpSourceId === selected.id,
    );
    if (existing) {
      setError(`This ${config.title.toLowerCase()} already exists.`);
      return;
    }

    const form = {
      ...DEFAULT_LEDGER_FORM,
      ledgerName: selected.name,
      alias: selected.code,
      description: `${config.source}: ${selected.code}`,
      parentGroupId,
      openingBalance,
      balanceType,
    };
    const ledger = {
      ...formToLedger(
        form,
        nextId(latest),
        generateLedgerCode(latest),
        latest,
      ),
      gstApplicable: kind === "gst",
      isSystemGenerated: true,
      ledgerKind: "MASTER" as const,
      masterType: config.module,
      masterId: selected.id,
      erpSourceModule: config.module,
      erpSourceId: selected.id,
    };
    saveChartOfAccounts([...latest, ledger]);
    dispatchAccountsDataChanged("ledgers", {
      operation: "create",
      recordId: ledger.id,
    });
    onSaved(ledger.id, parentGroupId);
  };

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden bg-background">
      <div className="flex flex-shrink-0 items-center gap-3 border-b border-border bg-white px-5 py-3">
        <button type="button" onClick={onClose} className="p-1.5 hover:bg-muted rounded-md">
          <ArrowLeft className="w-4 h-4" />
        </button>
        <div className="flex-1">
          <h2 className="text-sm font-semibold">Add {config.title}</h2>
          <p className="text-[11px] text-muted-foreground">
            {parentGroupLabel(records, parentGroupId)}
          </p>
        </div>
        <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
          Cancel
        </Button>
        <Button
          size="sm"
          className="h-8 text-xs gap-1.5 bg-brand-600 hover:bg-brand-700 text-white"
          onClick={handleSave}
        >
          <Save className="w-3.5 h-3.5" /> Save Ledger
        </Button>
      </div>

      <div className="flex-1 overflow-y-auto px-5 py-4">
        <div className="max-w-[720px] space-y-4 rounded-xl border border-border bg-white p-4 shadow-sm">
          <div className="space-y-1.5">
            <Label className="text-xs font-medium">{config.source}</Label>
            <Popover open={open} onOpenChange={setOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className="w-full h-9 px-3 text-sm text-left border border-border rounded-lg flex items-center justify-between"
                >
                  <span className={selected ? "text-foreground" : "text-muted-foreground"}>
                    {selected ? `${selected.name} (${selected.code})` : `Select from ${config.source}…`}
                  </span>
                  <ChevronsUpDown className="w-4 h-4 text-muted-foreground" />
                </button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <div className="relative border-b border-border p-2">
                  <Search className="absolute left-4 top-4 w-3.5 h-3.5 text-muted-foreground" />
                  <Input
                    value={search}
                    onChange={(event) => setSearch(event.target.value)}
                    className="h-8 pl-8 text-xs"
                    placeholder="Search…"
                  />
                </div>
                <div className="max-h-64 overflow-y-auto p-1">
                  {filtered.map((option) => (
                    <button
                      type="button"
                      key={option.id}
                      onClick={() => {
                        setSelectedId(option.id);
                        setError(null);
                        setOpen(false);
                      }}
                      className={cn(
                        "w-full flex items-center gap-2 px-3 py-2 text-xs text-left rounded-md hover:bg-muted/60",
                        selectedId === option.id && "bg-brand-50",
                      )}
                    >
                      <span className="flex-1 truncate">{option.name}</span>
                      <span className="font-mono text-muted-foreground">{option.code}</span>
                      {selectedId === option.id && <Check className="w-3.5 h-3.5 text-brand-600" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {selected && (
            <div className="grid grid-cols-2 gap-3 rounded-xl border border-border bg-muted/20 p-3">
              {selected.details.map((detail) => (
                <div key={detail.label}>
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground">{detail.label}</p>
                  <p className="text-xs font-medium mt-0.5">{detail.value}</p>
                </div>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Opening Balance</Label>
              <AccountsMoneyInput
                className="h-9 text-sm"
                value={openingBalance}
                onChange={(value) => setOpeningBalance(String(value))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs font-medium">Balance Type</Label>
              <div className="grid h-9 grid-cols-2 rounded-lg border border-border p-0.5">
                {(["Debit", "Credit"] as const).map((value) => (
                  <button
                    type="button"
                    key={value}
                    onClick={() => setBalanceType(value)}
                    className={cn(
                      "text-xs rounded-md",
                      balanceType === value && "bg-brand-50 text-brand-700 font-semibold",
                    )}
                  >
                    {value}
                  </button>
                ))}
              </div>
            </div>
          </div>
          {error && <p className="text-xs text-red-600">{error}</p>}
        </div>
      </div>
    </div>
  );
}
