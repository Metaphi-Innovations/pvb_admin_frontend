"use client";

import React, { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AlertCircle,
  ArrowLeft,
  ArrowRight,
  Check,
  Download,
  FileSpreadsheet,
  History,
  Upload,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { AccountsPageShell } from "@/components/accounts/AccountsPageShell";
import { AccountsSummaryCards } from "@/components/accounts/AccountsSummaryCards";
import {
  AccountsTable,
  AccountsTableBody,
  AccountsTableCell,
  AccountsTableHead,
  AccountsTableHeadCell,
  AccountsTableHeadRow,
  AccountsTableRow,
  AccountsTableScroll,
} from "@/components/accounts/AccountsTable";
import { formatMoney } from "@/lib/accounts/money-format";
import { cn } from "@/lib/utils";
import {
  getBankReconAccounts,
  getBankReconAccountById,
  maskAccountNumber,
} from "@/app/(app)/accounts/bank-reconciliation/bank-reconciliation-v2-data";
import {
  BANK_RECON_IMPORT_HISTORY_PATH,
  bankReconUploadPath,
  bankReconWorkspacePath,
  RECONCILIATION_LIST_PATH,
} from "@/app/(app)/accounts/bank-reconciliation/reconciliation-utils";
import {
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DIRECTION_RULES,
  loadAccountImportMeta,
  loadSavedFormats,
} from "@/lib/accounts/bank-recon-register";
import { parseStatementFile, rebuildParsedFromRaw } from "@/lib/accounts/bank-statement-import/parse-file";
import { autoDetectColumnMapping, headersToOptions } from "@/lib/accounts/bank-statement-import/column-mapper";
import { detectAmountMode, validateAmountMapping } from "@/lib/accounts/bank-statement-import/amount-parser";
import { autoDetectDateFormat, formatIsoForDisplay, parseStatementDate } from "@/lib/accounts/bank-statement-import/date-parser";
import {
  buildPreviewRows,
  computePreviewSummary,
  exportValidationErrorReport,
  rowsToImport,
} from "@/lib/accounts/bank-statement-import/validate-preview";
import { executeStatementImport } from "@/lib/accounts/bank-statement-import/import-engine";
import {
  DATE_FORMAT_OPTIONS,
  SYSTEM_FIELDS,
  type ColumnMapping,
  type ImportResultSummary,
  type ParsedStatementFile,
  type PreviewRow,
  type PreviewValidationStatus,
  type SaveFormatOption,
  type StatementPeriodConfig,
} from "@/lib/accounts/bank-statement-import/types";
import { downloadSampleFormat, STATEMENT_FIXTURES, fixtureToFile } from "@/lib/accounts/bank-statement-import/fixtures";
import { formatFileSize } from "@/lib/accounts/bank-statement-import/sanitize";
import { ACCOUNTS_FILTER_CONTROL_CLASS, ACCOUNTS_FILTER_LABEL_CLASS } from "@/lib/accounts/accounts-typography";

const STEPS = [
  "Select Bank Account",
  "Upload File",
  "Map Columns",
  "Preview & Validate",
  "Import Summary",
] as const;

const PREVIEW_STATUS_CLASS: Record<PreviewValidationStatus, string> = {
  Valid: "bg-emerald-50 text-emerald-700",
  Invalid: "bg-red-50 text-red-700",
  "Duplicate – Will Not Import": "bg-red-50 text-red-700",
  "Duplicate Within File": "bg-red-50 text-red-700",
  "Already Imported": "bg-slate-100 text-slate-600",
  "Existing Manual Transaction Found": "bg-purple-50 text-purple-700",
  "Possible Duplicate": "bg-amber-50 text-amber-700",
  "Missing Reference – Review Required": "bg-orange-50 text-orange-700",
  "Balance Mismatch": "bg-amber-50 text-amber-700",
  Excluded: "bg-slate-100 text-slate-600",
};

function StepIndicator({ current }: { current: number }) {
  return (
    <ol className="flex flex-wrap items-center gap-1 mb-3">
      {STEPS.map((label, i) => {
        const n = i + 1;
        const done = n < current;
        const active = n === current;
        return (
          <li key={label} className="flex items-center gap-1">
            {i > 0 && <span className="text-muted-foreground text-[10px]">›</span>}
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] font-medium border",
                done && "bg-emerald-50 border-emerald-200 text-emerald-700",
                active && "bg-brand-50 border-brand-300 text-brand-700",
                !done && !active && "bg-white border-border text-muted-foreground",
              )}
            >
              <span
                className={cn(
                  "w-4 h-4 rounded-full flex items-center justify-center text-[10px]",
                  done && "bg-emerald-500 text-white",
                  active && "bg-brand-600 text-white",
                  !done && !active && "bg-muted text-muted-foreground",
                )}
              >
                {done ? <Check className="w-2.5 h-2.5" /> : n}
              </span>
              {label}
            </span>
          </li>
        );
      })}
    </ol>
  );
}

export default function BankStatementUploadPageClient() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const presetAccountId = searchParams.get("accountId") ?? "";

  const [step, setStep] = useState(1);
  const [accountId, setAccountId] = useState(presetAccountId);
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedStatementFile | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [headerRow, setHeaderRow] = useState(0);
  const [dataStartRow, setDataStartRow] = useState(1);
  const [selectedSheet, setSelectedSheet] = useState("");
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dateFormat, setDateFormat] = useState("DD-MM-YYYY");
  const [amountFormat, setAmountFormat] = useState(DEFAULT_AMOUNT_FORMAT);
  const [directionRules, setDirectionRules] = useState(DEFAULT_DIRECTION_RULES);
  const [statementPeriod, setStatementPeriod] = useState<StatementPeriodConfig>({
    from: "",
    to: "",
    openingBalance: "",
    closingBalance: "",
  });
  const [previewRows, setPreviewRows] = useState<PreviewRow[]>([]);
  const [importResult, setImportResult] = useState<ImportResultSummary | null>(null);
  const [saveFormatOption, setSaveFormatOption] = useState<SaveFormatOption>("once");
  const [formatName, setFormatName] = useState("");
  const [savedFormatDetected, setSavedFormatDetected] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const accounts = useMemo(() => getBankReconAccounts(), []);
  const account = accountId ? getBankReconAccountById(accountId) : undefined;
  const accountMeta = accountId ? loadAccountImportMeta(accountId) : null;
  const savedFormats = accountId ? loadSavedFormats(accountId) : [];

  useEffect(() => {
    if (presetAccountId) setAccountId(presetAccountId);
  }, [presetAccountId]);

  const applySavedFormat = useCallback(
    (formatId: string) => {
      const fmt = savedFormats.find((f) => f.id === formatId);
      if (!fmt) return;
      setMapping(fmt.columnMapping);
      setDateFormat(fmt.dateFormat);
      setAmountFormat(fmt.amountFormat);
      setDirectionRules(fmt.directionRules);
      setHeaderRow(fmt.headerRow);
      setDataStartRow(fmt.dataStartRow);
      setSavedFormatDetected(fmt.formatName);
    },
    [savedFormats],
  );

  const handleFileSelect = async (f: File) => {
    setParseErrors([]);
    setBusy(true);
    setFile(f);
    const result = await parseStatementFile(f, selectedSheet || undefined, headerRow, dataStartRow);
    setBusy(false);
    if (!result.ok) {
      setParseErrors(result.errors.map((e) => e.message));
      setParsed(null);
      return;
    }
    setParsed(result.parsed);
    setSelectedSheet(result.parsed.selectedSheet);
    const autoMap = autoDetectColumnMapping(result.parsed.headers);
    setMapping(autoMap);
    const dateCol = autoMap.transactionDate;
    const samples = dateCol
      ? result.parsed.dataRows.slice(0, 15).map((r) => r[result.parsed.headers.indexOf(dateCol)] ?? "")
      : [];
    setDateFormat(autoDetectDateFormat(samples.filter(Boolean)));
    if (result.parsed.firstTransactionDate) {
      setStatementPeriod((p) => ({
        ...p,
        from: p.from || result.parsed.firstTransactionDate || "",
        to: p.to || result.parsed.lastTransactionDate || "",
      }));
    }
    if (savedFormats.length === 1) applySavedFormat(savedFormats[0].id);
  };

  const rebuildPreview = useCallback(() => {
    if (!parsed || !accountId) return;
    const rebuilt = rebuildParsedFromRaw(parsed, headerRow, dataStartRow);
    setParsed(rebuilt);
    const mode = detectAmountMode(mapping);
    const rows = buildPreviewRows({
      parsed: rebuilt,
      mapping,
      amountMode: mode,
      dateFormat,
      amountFormat,
      directionRules,
      bankAccountId: accountId,
      statementPeriod,
    });
    setPreviewRows(rows);
  }, [parsed, accountId, headerRow, dataStartRow, mapping, dateFormat, amountFormat, directionRules, statementPeriod]);

  const runImport = () => {
    setBusy(true);
    const result = executeStatementImport({
      bankAccountId: accountId,
      fileName: file?.name ?? "statement",
      fileType: parsed?.fileType ?? "csv",
      statementPeriod,
      previewRows,
      mappingConfig: {
        columnMapping: mapping,
        amountMode: detectAmountMode(mapping),
        dateFormat,
        amountFormat,
        directionRules,
        headerRowIndex: headerRow,
        dataStartRowIndex: dataStartRow,
      },
      savedFormatId: null,
      saveFormat:
        saveFormatOption !== "once" && formatName.trim()
          ? { option: saveFormatOption, formatName: formatName.trim() }
          : undefined,
    });
    setImportResult(result);
    setBusy(false);
    setConfirmOpen(false);
    setStep(5);
  };

  const goNext = () => {
    if (step === 1 && !accountId) return;
    if (step === 2) {
      if (!parsed || parseErrors.length) return;
    }
    if (step === 3) {
      const amtErr = validateAmountMapping(mapping);
      if (amtErr) {
        setParseErrors([amtErr]);
        return;
      }
      if (!mapping.transactionDate || !mapping.narration) {
        setParseErrors(["Transaction Date and Narration mappings are required."]);
        return;
      }
      setParseErrors([]);
      rebuildPreview();
    }
    if (step === 4) {
      setConfirmOpen(true);
      return;
    }
    setStep((s) => Math.min(5, s + 1));
  };

  const goBack = () => setStep((s) => Math.max(1, s - 1));

  const previewSummary = useMemo(
    () => computePreviewSummary(previewRows, statementPeriod),
    [previewRows, statementPeriod],
  );

  const importableCount = rowsToImport(previewRows).length;

  const sampleDatePreview = useMemo(() => {
    if (!parsed?.dataRows.length || !mapping.transactionDate) return "—";
    const idx = parsed.headers.indexOf(mapping.transactionDate);
    const raw = parsed.dataRows[0]?.[idx] ?? "";
    const r = parseStatementDate(raw, dateFormat);
    return r.iso ? formatIsoForDisplay(r.iso) : raw || "—";
  }, [parsed, mapping.transactionDate, dateFormat]);

  return (
    <AccountsPageShell
      breadcrumbs={[
        { label: "Accounts", href: "/accounts/masters/chart-of-accounts" },
        { label: "Banking" },
        { label: "Bank Reconciliation", href: RECONCILIATION_LIST_PATH },
        { label: "Upload Statement" },
      ]}
      title="Upload Bank Statement"
      description="Import bank statement transactions into the reconciliation register"
      layout="standard"
      actions={
        <div className="flex items-center gap-1.5">
          <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
            <Link href={BANK_RECON_IMPORT_HISTORY_PATH}>
              <History className="w-3.5 h-3.5" /> Import History
            </Link>
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 text-xs"
            onClick={() => router.push(accountId ? bankReconWorkspacePath(accountId) : RECONCILIATION_LIST_PATH)}
          >
            Cancel
          </Button>
        </div>
      }
    >
      <div className="max-w-[1200px] mx-auto space-y-3">
        <StepIndicator current={step} />

        {parseErrors.length > 0 && (
          <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0 mt-0.5" />
            <div className="space-y-0.5">
              {parseErrors.map((e) => (
                <p key={e} className="text-xs text-red-700">{e}</p>
              ))}
            </div>
          </div>
        )}

        {savedFormatDetected && step >= 2 && (
          <div className="rounded-lg border border-brand-200 bg-brand-50 px-3 py-2 text-xs text-brand-700">
            Saved format detected: <strong>{savedFormatDetected}</strong> — review mapping before import.
          </div>
        )}

        {/* Step 1 */}
        {step === 1 && (
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
            <div className="space-y-1.5 max-w-md">
              <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Bank Account *</Label>
              <Select value={accountId} onValueChange={setAccountId}>
                <SelectTrigger className={ACCOUNTS_FILTER_CONTROL_CLASS}>
                  <SelectValue placeholder="Select bank account…" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={a.id}>
                      {a.accountNickname} · {maskAccountNumber(a.accountNumber)}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {account && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
                {[
                  ["Bank Name", account.bankName],
                  ["Account Type", account.accountType],
                  ["Book Balance", formatMoney(account.bookBalance)],
                  ["Last Reconciled", account.lastReconciledDate ?? "—"],
                  ["Last Imported Until", accountMeta?.lastStatementImportedUntil ?? account.lastStatementImportedUntil ?? "—"],
                  ["Last Import File", accountMeta?.lastImportFileName ?? "—"],
                ].map(([l, v]) => (
                  <div key={l} className="p-2 rounded-md border border-border bg-muted/20">
                    <p className="text-[10px] text-muted-foreground uppercase">{l}</p>
                    <p className="font-medium truncate">{v}</p>
                  </div>
                ))}
              </div>
            )}
            {savedFormats.length > 0 && (
              <div className="space-y-1.5">
                <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Saved Statement Format</Label>
                <Select onValueChange={applySavedFormat}>
                  <SelectTrigger className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "max-w-md")}>
                    <SelectValue placeholder="Select saved format (optional)…" />
                  </SelectTrigger>
                  <SelectContent>
                    {savedFormats.map((f) => (
                      <SelectItem key={f.id} value={f.id}>{f.formatName}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        )}

        {/* Step 2 */}
        {step === 2 && (
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
            <div
              className={cn(
                "border-2 border-dashed rounded-xl p-6 text-center transition-colors",
                "border-border hover:border-brand-300 hover:bg-brand-50/30",
              )}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                const f = e.dataTransfer.files[0];
                if (f) void handleFileSelect(f);
              }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
              <p className="text-sm font-medium">Drag & drop bank statement file</p>
              <p className="text-[11px] text-muted-foreground mt-1">CSV, XLS, XLSX · Max 10 MB · PDF not supported</p>
              <div className="flex flex-wrap items-center justify-center gap-2 mt-3">
                <Button type="button" size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" onClick={() => fileInputRef.current?.click()}>
                  Browse File
                </Button>
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs gap-1" onClick={() => downloadSampleFormat(account?.bankName)}>
                  <Download className="w-3.5 h-3.5" /> Sample Format
                </Button>
              </div>
              <input ref={fileInputRef} type="file" accept=".csv,.xls,.xlsx" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleFileSelect(f); }} />
            </div>

            <div className="flex flex-wrap gap-1.5">
              <span className="text-[11px] text-muted-foreground w-full">Demo test files:</span>
              {STATEMENT_FIXTURES.slice(0, 6).map((fx) => (
                <button key={fx.id} type="button" className="text-[11px] px-2 py-1 rounded border border-border hover:bg-muted" onClick={() => void handleFileSelect(fixtureToFile(fx))}>
                  {fx.label}
                </button>
              ))}
            </div>

            {file && parsed && (
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs border-t border-border pt-3">
                {[
                  ["File Name", file.name],
                  ["File Type", parsed.fileType.toUpperCase()],
                  ["File Size", formatFileSize(file.size)],
                  ["Sheets", String(parsed.sheetNames.length)],
                  ["Selected Sheet", parsed.selectedSheet],
                  ["Total Rows", String(parsed.totalRowsDetected)],
                  ["First Date", parsed.firstTransactionDate ?? "—"],
                  ["Last Date", parsed.lastTransactionDate ?? "—"],
                ].map(([l, v]) => (
                  <div key={l} className="p-2 rounded-md border border-border">
                    <p className="text-[10px] text-muted-foreground">{l}</p>
                    <p className="font-medium truncate">{v}</p>
                  </div>
                ))}
              </div>
            )}

            {parsed && parsed.sheetNames.length > 1 && (
              <div className="space-y-1 max-w-xs">
                <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Excel Sheet</Label>
                <Select value={selectedSheet} onValueChange={async (v) => { setSelectedSheet(v); if (file) await handleFileSelect(file); }}>
                  <SelectTrigger className={ACCOUNTS_FILTER_CONTROL_CLASS}><SelectValue /></SelectTrigger>
                  <SelectContent>{parsed.sheetNames.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
                </Select>
              </div>
            )}

            {parsed && (
              <div className="space-y-2">
                <p className="text-xs font-semibold">Raw rows preview — select header row</p>
                <div className="flex flex-wrap gap-3 items-end">
                  <div className="space-y-0.5">
                    <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Header Row #</Label>
                    <Input type="number" min={1} value={headerRow + 1} onChange={(e) => setHeaderRow(Math.max(0, Number(e.target.value) - 1))} className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "w-24")} />
                  </div>
                  <div className="space-y-0.5">
                    <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Data Starts Row #</Label>
                    <Input type="number" min={2} value={dataStartRow + 1} onChange={(e) => setDataStartRow(Math.max(1, Number(e.target.value) - 1))} className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "w-24")} />
                  </div>
                  <Button type="button" size="sm" variant="outline" className="h-7 text-xs" onClick={() => { if (parsed) setParsed(rebuildParsedFromRaw(parsed, headerRow, dataStartRow)); }}>
                    Apply Rows
                  </Button>
                </div>
                <AccountsTableScroll className="max-h-[220px] border border-border rounded-lg">
                  <AccountsTable minWidth={600}>
                    <AccountsTableBody>
                      {parsed.rawRows.slice(0, 18).map((row, ri) => (
                        <AccountsTableRow key={ri} className={cn(ri === headerRow && "bg-brand-50/60")}>
                          <AccountsTableCell mono className="w-10">{ri + 1}</AccountsTableCell>
                          {row.slice(0, 8).map((cell, ci) => (
                            <AccountsTableCell key={ci} className="text-[11px] max-w-[120px] truncate">{cell}</AccountsTableCell>
                          ))}
                        </AccountsTableRow>
                      ))}
                    </AccountsTableBody>
                  </AccountsTable>
                </AccountsTableScroll>
              </div>
            )}

            {file && (
              <Button type="button" variant="outline" size="sm" className="h-7 text-xs gap-1" onClick={() => { setFile(null); setParsed(null); setParseErrors([]); }}>
                <X className="w-3.5 h-3.5" /> Remove file
              </Button>
            )}
          </div>
        )}

        {/* Step 3 — mapping (abbreviated layout) */}
        {step === 3 && parsed && (
          <div className="rounded-xl border border-border bg-white shadow-sm p-4 space-y-3">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <div className="space-y-2">
                <p className="text-xs font-semibold">Required Fields</p>
                {[...SYSTEM_FIELDS.required, { key: "debitAmount", label: "Debit Amount" }, { key: "creditAmount", label: "Credit Amount" }, { key: "transactionAmount", label: "Transaction Amount" }, { key: "transactionType", label: "Transaction Type (DR/CR)" }, { key: "depositAmount", label: "Deposit Amount" }, { key: "withdrawalAmount", label: "Withdrawal Amount" }].map((field) => (
                  <div key={field.key} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] ?? "__none__"}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? null : v }))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{headersToOptions(parsed.headers).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
                <p className="text-xs font-semibold pt-2">Optional Fields</p>
                {SYSTEM_FIELDS.optional.map((field) => (
                  <div key={field.key} className="grid grid-cols-2 gap-2 items-center">
                    <span className="text-xs text-muted-foreground">{field.label}</span>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] ?? "__none__"}
                      onValueChange={(v) => setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? null : v }))}
                    >
                      <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                      <SelectContent>{headersToOptions(parsed.headers).map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className={ACCOUNTS_FILTER_CONTROL_CLASS}><SelectValue /></SelectTrigger>
                    <SelectContent>{DATE_FORMAT_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label} ({o.example})</SelectItem>)}</SelectContent>
                  </Select>
                  <p className="text-[11px] text-muted-foreground">Sample converted: {sampleDatePreview}</p>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-3 bg-muted/20">
                  <p className="text-xs font-semibold">Amount Format</p>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={amountFormat.currencySymbol} onCheckedChange={(v) => setAmountFormat((a) => ({ ...a, currencySymbol: v === true }))} /> Strip ₹ symbol</label>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={amountFormat.bracketsNegative} onCheckedChange={(v) => setAmountFormat((a) => ({ ...a, bracketsNegative: v === true }))} /> (500.00) as negative</label>
                  <label className="flex items-center gap-2 text-xs"><Checkbox checked={amountFormat.drCrSuffix} onCheckedChange={(v) => setAmountFormat((a) => ({ ...a, drCrSuffix: v === true }))} /> DR / CR suffix</label>
                </div>
                <div className="space-y-2 rounded-lg border border-border p-3">
                  <p className="text-xs font-semibold">Save Mapping</p>
                  <Select value={saveFormatOption} onValueChange={(v) => setSaveFormatOption(v as SaveFormatOption)}>
                    <SelectTrigger className="h-8 text-xs"><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="once">Use once without saving</SelectItem>
                      <SelectItem value="new">Save as new format</SelectItem>
                      <SelectItem value="update">Update existing format</SelectItem>
                    </SelectContent>
                  </Select>
                  {saveFormatOption !== "once" && (
                    <Input value={formatName} onChange={(e) => setFormatName(e.target.value)} placeholder="Format name e.g. HDFC Current CSV" className="h-8 text-xs" />
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Step 4 — Preview */}
        {step === 4 && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-2">
              <PeriodField label="Statement From" value={statementPeriod.from} onChange={(v) => setStatementPeriod((p) => ({ ...p, from: v }))} />
              <PeriodField label="Statement To" value={statementPeriod.to} onChange={(v) => setStatementPeriod((p) => ({ ...p, to: v }))} />
              <PeriodField label="Opening Balance" value={statementPeriod.openingBalance} onChange={(v) => setStatementPeriod((p) => ({ ...p, openingBalance: v }))} />
              <PeriodField label="Closing Balance" value={statementPeriod.closingBalance} onChange={(v) => setStatementPeriod((p) => ({ ...p, closingBalance: v }))} />
              <div className="flex items-end">
                <Button type="button" size="sm" variant="outline" className="h-8 text-xs w-full" onClick={rebuildPreview}>Re-validate</Button>
              </div>
            </div>
            <AccountsSummaryCards
              columns={5}
              items={[
                { label: "Total Rows", value: String(previewSummary.totalRows) },
                { label: "Valid Rows", value: String(previewSummary.validRows) },
                { label: "Invalid Rows", value: String(previewSummary.invalidRows), warn: previewSummary.invalidRows > 0 },
                { label: "Duplicates", value: String(previewSummary.exactDuplicates) },
                { label: "Possible Duplicates", value: String(previewSummary.possibleDuplicates) },
                { label: "Missing Refs", value: String(previewSummary.missingReferences) },
                { label: "Total Deposits", value: formatMoney(previewSummary.totalDeposits) },
                { label: "Total Withdrawals", value: formatMoney(previewSummary.totalWithdrawals) },
                { label: "Balance Diff", value: previewSummary.balanceDifference != null ? formatMoney(Math.abs(previewSummary.balanceDifference)) : "—", warn: previewSummary.balanceDifference != null && previewSummary.balanceDifference !== 0 },
              ]}
            />
            <div className="rounded-xl border border-border bg-white shadow-sm overflow-hidden">
              <AccountsTableScroll>
                <AccountsTable minWidth={1200}>
                  <AccountsTableHead>
                    <AccountsTableHeadRow>
                      {["Row", "Date", "Value Date", "Reference", "Narration", "Deposit", "Withdrawal", "Balance", "Status", "Message", "Incl."].map((h) => (
                        <AccountsTableHeadCell key={h} sticky={false}>{h}</AccountsTableHeadCell>
                      ))}
                    </AccountsTableHeadRow>
                  </AccountsTableHead>
                  <AccountsTableBody>
                    {previewRows.map((row) => (
                      <AccountsTableRow key={row.rowNumber}>
                        <AccountsTableCell mono>{row.rowNumber}</AccountsTableCell>
                        <AccountsTableCell>{row.statementDate || "—"}</AccountsTableCell>
                        <AccountsTableCell>{row.valueDate || "—"}</AccountsTableCell>
                        <AccountsTableCell mono>{row.reference || "—"}</AccountsTableCell>
                        <AccountsTableCell wrap><span className="line-clamp-1 text-[11px]">{row.narration}</span></AccountsTableCell>
                        <AccountsTableCell align="right" money>{row.deposit ? formatMoney(row.deposit) : "—"}</AccountsTableCell>
                        <AccountsTableCell align="right" money>{row.withdrawal ? formatMoney(row.withdrawal) : "—"}</AccountsTableCell>
                        <AccountsTableCell align="right" money>{row.balance != null ? formatMoney(row.balance) : "—"}</AccountsTableCell>
                        <AccountsTableCell>
                          <span className={cn("text-[10px] px-1.5 py-0.5 rounded-full font-medium", PREVIEW_STATUS_CLASS[row.validationStatus])}>{row.validationStatus}</span>
                        </AccountsTableCell>
                        <AccountsTableCell wrap><span className="text-[10px] text-muted-foreground line-clamp-2">{row.validationMessage}</span></AccountsTableCell>
                        <AccountsTableCell>
                          <Checkbox
                            checked={row.included}
                            disabled={row.validationStatus === "Invalid" || row.validationStatus === "Already Imported" || row.validationStatus === "Duplicate Within File"}
                            onCheckedChange={(v) => setPreviewRows((rows) => rows.map((r) => r.rowNumber === row.rowNumber ? { ...r, included: v === true } : r))}
                          />
                        </AccountsTableCell>
                      </AccountsTableRow>
                    ))}
                  </AccountsTableBody>
                </AccountsTable>
              </AccountsTableScroll>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button type="button" size="sm" variant="outline" className="h-8 text-xs" onClick={() => {
                const csv = exportValidationErrorReport(previewRows);
                const blob = new Blob([csv], { type: "text/csv" });
                const url = URL.createObjectURL(blob);
                const a = document.createElement("a");
                a.href = url;
                a.download = "validation-errors.csv";
                a.click();
                URL.revokeObjectURL(url);
              }}>
                Download Error Report
              </Button>
            </div>
          </div>
        )}

        {/* Step 5 — Summary */}
        {step === 5 && importResult && (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-4">
            <div className="flex items-center gap-2">
              <Check className="w-5 h-5 text-emerald-600" />
              <p className="text-sm font-semibold text-emerald-800">Import Successful — {importResult.batchNumber}</p>
            </div>
            <AccountsSummaryCards
              columns={3}
              items={[
                { label: "Rows Processed", value: String(importResult.totalRowsProcessed) },
                { label: "Transactions Imported", value: String(importResult.transactionsImported) },
                { label: "Manual Linked", value: String(importResult.manualTransactionsLinked) },
                { label: "Duplicates Skipped", value: String(importResult.exactDuplicatesSkipped) },
                { label: "Possible Duplicates", value: String(importResult.possibleDuplicatesPending) },
                { label: "Invalid Skipped", value: String(importResult.invalidRowsNotImported) },
                { label: "Deposits Imported", value: formatMoney(importResult.totalDepositsImported) },
                { label: "Withdrawals Imported", value: formatMoney(importResult.totalWithdrawalsImported) },
              ]}
            />
            <div className="flex flex-wrap gap-2">
              <Button asChild size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white">
                <Link href={bankReconWorkspacePath(accountId)}>View Imported Transactions</Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs gap-1.5">
                <Link href={`${bankReconWorkspacePath(accountId)}?tab=auto-match&runMatch=1`}>
                  Run Auto Match
                </Link>
              </Button>
              <Button asChild size="sm" variant="outline" className="h-8 text-xs">
                <Link href={BANK_RECON_IMPORT_HISTORY_PATH}>Import History</Link>
              </Button>
              <Button size="sm" variant="outline" className="h-8 text-xs" onClick={() => { setStep(1); setImportResult(null); setFile(null); setParsed(null); setPreviewRows([]); }}>
                Upload Another Statement
              </Button>
            </div>
          </div>
        )}

        {/* Navigation */}
        {step < 5 && (
          <div className="flex items-center justify-between pt-2 border-t border-border">
            <Button type="button" variant="outline" size="sm" className="h-8 text-xs gap-1" disabled={step === 1} onClick={goBack}>
              <ArrowLeft className="w-3.5 h-3.5" /> Back
            </Button>
            <Button
              type="button"
              size="sm"
              className="h-8 text-xs gap-1 bg-brand-600 hover:bg-brand-700 text-white"
              disabled={busy || (step === 1 && !accountId) || (step === 2 && !parsed) || (step === 4 && importableCount === 0)}
              onClick={goNext}
            >
              {step === 4 ? `Import ${importableCount} Valid Transactions` : "Continue"}
              <ArrowRight className="w-3.5 h-3.5" />
            </Button>
          </div>
        )}
      </div>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-base">Confirm Statement Import</DialogTitle>
            <DialogDescription className="text-xs">
              Review the import summary before proceeding. Invalid and duplicate rows will be skipped.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-1 text-xs">
            <p><span className="text-muted-foreground">Bank Account:</span> {account?.accountNickname}</p>
            <p><span className="text-muted-foreground">Statement Period:</span> {statementPeriod.from} — {statementPeriod.to}</p>
            <p><span className="text-muted-foreground">File:</span> {file?.name}</p>
            <p><span className="text-muted-foreground">Valid Rows:</span> {importableCount}</p>
            <p><span className="text-muted-foreground">Skipped Duplicates:</span> {previewSummary.exactDuplicates}</p>
            <p><span className="text-muted-foreground">Invalid Rows:</span> {previewSummary.invalidRows}</p>
            <p><span className="text-muted-foreground">Total Deposits:</span> {formatMoney(previewSummary.totalDeposits)}</p>
            <p><span className="text-muted-foreground">Total Withdrawals:</span> {formatMoney(previewSummary.totalWithdrawals)}</p>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setConfirmOpen(false)}>Cancel</Button>
            <Button size="sm" className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white" disabled={busy} onClick={runImport}>
              Import {importableCount} Transactions
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </AccountsPageShell>
  );
}

function PeriodField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <div className="space-y-0.5">
      <Label className={ACCOUNTS_FILTER_LABEL_CLASS}>{label}</Label>
      <Input type={label.includes("Balance") ? "number" : "date"} value={value} onChange={(e) => onChange(e.target.value)} className={cn(ACCOUNTS_FILTER_CONTROL_CLASS, "h-8 text-xs")} />
    </div>
  );
}
