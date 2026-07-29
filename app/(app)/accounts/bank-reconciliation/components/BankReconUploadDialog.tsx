"use client";

import React, { useCallback, useMemo, useRef, useState } from "react";
import { AlertCircle, FileSpreadsheet, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import { parseStatementFile } from "@/lib/accounts/bank-statement-import/parse-file";
import { headersToOptions } from "@/lib/accounts/bank-statement-import/column-mapper";
import { detectAmountMode, validateAmountMapping } from "@/lib/accounts/bank-statement-import/amount-parser";
import { buildPreviewRows, rowsToImport } from "@/lib/accounts/bank-statement-import/validate-preview";
import { executeStatementImport } from "@/lib/accounts/bank-statement-import/import-engine";
import {
  DATE_FORMAT_OPTIONS,
  SYSTEM_FIELDS,
  type ColumnMapping,
  type ParsedStatementFile,
} from "@/lib/accounts/bank-statement-import/types";
import {
  DEFAULT_AMOUNT_FORMAT,
  DEFAULT_DIRECTION_RULES,
  loadSavedFormats,
} from "@/lib/accounts/bank-recon-register";
import { formatFileSize } from "@/lib/accounts/bank-statement-import/sanitize";

type UploadStep = "file" | "map" | "importing";

const AMOUNT_FIELDS = [
  { key: "debitAmount", label: "Debit Amount" },
  { key: "creditAmount", label: "Credit Amount" },
  { key: "transactionAmount", label: "Transaction Amount" },
  { key: "transactionType", label: "Transaction Type (DR/CR)" },
  { key: "depositAmount", label: "Deposit Amount" },
  { key: "withdrawalAmount", label: "Withdrawal Amount" },
] as const;

export function BankReconUploadDialog({
  open,
  onClose,
  bankAccountId,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  bankAccountId: string;
  onImported: () => void;
}) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<UploadStep>("file");
  const [file, setFile] = useState<File | null>(null);
  const [parsed, setParsed] = useState<ParsedStatementFile | null>(null);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [mapping, setMapping] = useState<ColumnMapping>({});
  const [dateFormat, setDateFormat] = useState("DD-MM-YYYY");
  const [formatName, setFormatName] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const savedFormats = useMemo(() => loadSavedFormats(bankAccountId), [bankAccountId, open]);
  const hasSavedFormat = savedFormats.length > 0;

  const reset = useCallback(() => {
    setStep("file");
    setFile(null);
    setParsed(null);
    setParseErrors([]);
    setMapping({});
    setDateFormat("DD-MM-YYYY");
    setFormatName("");
    setError(null);
    setBusy(false);
  }, []);

  const handleClose = () => {
    reset();
    onClose();
  };

  const handleFileSelect = async (f: File) => {
    setParseErrors([]);
    setError(null);
    setBusy(true);
    setFile(f);
    const result = await parseStatementFile(f);
    setBusy(false);
    if (!result.ok) {
      setParseErrors(result.errors.map((e) => e.message));
      setParsed(null);
      return;
    }
    setParsed(result.parsed);

    const existing = savedFormats[0];
    if (existing) {
      setMapping(existing.columnMapping);
      setDateFormat(existing.dateFormat);
      setStep("importing");
      runImport(result.parsed, existing.columnMapping, existing.dateFormat, existing.id, false);
    } else {
      setMapping({});
      setFormatName(`${f.name.replace(/\.[^.]+$/, "")} Format`);
      setStep("map");
    }
  };

  const validateMapping = (): string | null => {
    if (!parsed) return "No file parsed.";
    if (!mapping.transactionDate) return "Map Transaction Date.";
    if (!mapping.narration) return "Map Narration / Description.";
    const amountErr = validateAmountMapping(mapping);
    if (amountErr) return amountErr;
    return null;
  };

  const runImport = (
    parsedFile: ParsedStatementFile,
    columnMapping: ColumnMapping,
    df: string,
    savedFormatId: string | null,
    saveNewFormat: boolean,
  ) => {
    setBusy(true);
    setError(null);
    setStep("importing");
    try {
      const amountMode = detectAmountMode(columnMapping);
      const statementPeriod = {
        from: parsedFile.firstTransactionDate ?? "",
        to: parsedFile.lastTransactionDate ?? "",
        openingBalance: "",
        closingBalance: "",
      };
      const previewRows = buildPreviewRows({
        parsed: parsedFile,
        mapping: columnMapping,
        amountMode,
        dateFormat: df,
        amountFormat: DEFAULT_AMOUNT_FORMAT,
        directionRules: DEFAULT_DIRECTION_RULES,
        bankAccountId,
        statementPeriod,
      });
      const importable = rowsToImport(previewRows);
      if (importable.length === 0) {
        setError("No valid rows to import. Check column mapping and file content.");
        setStep(savedFormatId ? "file" : "map");
        setBusy(false);
        return;
      }

      executeStatementImport({
        bankAccountId,
        fileName: parsedFile.fileName,
        fileType: parsedFile.fileType,
        statementPeriod,
        previewRows,
        mappingConfig: {
          columnMapping,
          amountMode,
          dateFormat: df,
          amountFormat: DEFAULT_AMOUNT_FORMAT,
          directionRules: DEFAULT_DIRECTION_RULES,
          headerRowIndex: parsedFile.headerRowIndex,
          dataStartRowIndex: parsedFile.dataStartRowIndex,
        },
        savedFormatId,
        saveFormat:
          saveNewFormat && formatName.trim()
            ? { option: "new" as const, formatName: formatName.trim() }
            : undefined,
      });

      onImported();
      handleClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
      setStep(savedFormatId ? "file" : "map");
    } finally {
      setBusy(false);
    }
  };

  const handleMapAndImport = () => {
    const err = validateMapping();
    if (err) {
      setError(err);
      return;
    }
    if (!parsed) return;
    runImport(parsed, mapping, dateFormat, null, true);
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className="max-w-lg p-0 gap-0 overflow-hidden">
        <DialogHeader className="px-5 pt-5 pb-3 border-b">
          <DialogTitle className="text-sm font-semibold">Upload Bank Statement</DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            CSV or Excel only. Map columns manually if this is the first import for this account.
          </DialogDescription>
        </DialogHeader>

        <div className="px-5 py-4 space-y-3 max-h-[70vh] overflow-y-auto">
          {step === "file" && (
            <>
              <div
                className={cn(
                  "border-2 border-dashed rounded-xl px-4 py-6 text-center transition-colors cursor-pointer",
                  file ? "border-brand-300 bg-brand-50/25" : "border-border hover:border-brand-300 hover:bg-brand-50/15",
                )}
                onClick={() => fileInputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files[0];
                  if (f) void handleFileSelect(f);
                }}
              >
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".csv,.xls,.xlsx"
                  className="hidden"
                  onChange={(e) => {
                    const f = e.target.files?.[0];
                    if (f) void handleFileSelect(f);
                  }}
                />
                {file ? (
                  <div className="flex items-center justify-center gap-2">
                    <FileSpreadsheet className="w-5 h-5 text-brand-600" />
                    <div className="text-left">
                      <p className="text-xs font-semibold">{file.name}</p>
                      <p className="text-[11px] text-muted-foreground">{formatFileSize(file.size)}</p>
                    </div>
                    <button
                      type="button"
                      className="ml-2 p-1 rounded hover:bg-muted"
                      onClick={(e) => {
                        e.stopPropagation();
                        setFile(null);
                        setParsed(null);
                      }}
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-2" />
                    <p className="text-xs font-medium">Drop file or click to browse</p>
                    <p className="text-[11px] text-muted-foreground mt-1">CSV, XLS, XLSX · Max 10 MB</p>
                  </>
                )}
              </div>
              {hasSavedFormat && (
                <p className="text-[11px] text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
                  Saved format &quot;{savedFormats[0].formatName}&quot; will be applied automatically.
                </p>
              )}
              {!hasSavedFormat && (
                <p className="text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  No saved column mapping for this account. You will map columns manually after upload.
                </p>
              )}
            </>
          )}

          {step === "map" && parsed && (
            <>
              <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
                Map Columns — {parsed.fileName}
              </p>
              <div className="space-y-2">
                {SYSTEM_FIELDS.required.map((field) => (
                  <div key={field.key} className="grid grid-cols-[1fr_1.2fr] gap-2 items-center">
                    <Label className="text-xs">
                      {field.label} <span className="text-red-500">*</span>
                    </Label>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] ?? "__none__"}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">
                          — Not mapped —
                        </SelectItem>
                        {headersToOptions(parsed.headers).map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {AMOUNT_FIELDS.map((field) => (
                  <div key={field.key} className="grid grid-cols-[1fr_1.2fr] gap-2 items-center">
                    <Label className="text-xs">{field.label}</Label>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] ?? "__none__"}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue placeholder="Select column…" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">
                          — Not mapped —
                        </SelectItem>
                        {headersToOptions(parsed.headers).map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
                {SYSTEM_FIELDS.optional.map((field) => (
                  <div key={field.key} className="grid grid-cols-[1fr_1.2fr] gap-2 items-center">
                    <Label className="text-xs">{field.label}</Label>
                    <Select
                      value={mapping[field.key as keyof ColumnMapping] ?? "__none__"}
                      onValueChange={(v) =>
                        setMapping((m) => ({ ...m, [field.key]: v === "__none__" ? null : v }))
                      }
                    >
                      <SelectTrigger className="h-8 text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="__none__" className="text-xs">
                          — Not mapped —
                        </SelectItem>
                        {headersToOptions(parsed.headers).map((o) => (
                          <SelectItem key={o.value} value={o.value} className="text-xs">
                            {o.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div className="space-y-1">
                  <Label className="text-xs">Date Format</Label>
                  <Select value={dateFormat} onValueChange={setDateFormat}>
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DATE_FORMAT_OPTIONS.map((d) => (
                        <SelectItem key={d.value} value={d.value} className="text-xs">
                          {d.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label className="text-xs">Save Format As</Label>
                  <Input
                    className="h-8 text-xs"
                    value={formatName}
                    onChange={(e) => setFormatName(e.target.value)}
                    placeholder="e.g. HDFC Current Format"
                  />
                </div>
              </div>
            </>
          )}

          {step === "importing" && (
            <div className="py-8 text-center space-y-2">
              <div className="w-8 h-8 border-2 border-brand-600 border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-medium">Importing transactions…</p>
            </div>
          )}

          {parseErrors.length > 0 && (
            <div className="rounded-lg border border-red-200 bg-red-50 px-3 py-2 space-y-1">
              {parseErrors.map((e) => (
                <p key={e} className="text-xs text-red-700 flex items-start gap-1">
                  <AlertCircle className="w-3.5 h-3.5 flex-shrink-0 mt-0.5" />
                  {e}
                </p>
              ))}
            </div>
          )}
          {error && (
            <p className="text-xs text-red-600 flex items-center gap-1">
              <AlertCircle className="w-3.5 h-3.5" />
              {error}
            </p>
          )}
        </div>

        <div className="px-5 py-3 border-t bg-muted/20 flex justify-end gap-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose} disabled={busy}>
            Cancel
          </Button>
          {step === "map" && (
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={handleMapAndImport}
              disabled={busy}
            >
              Import Transactions
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
