"use client";

import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  findExistingStatement,
  loadBankAccounts,
  uploadBankStatement,
  type BankStatement,
} from "../bank-reconciliation-data";
import { MONTH_NAMES } from "../reconciliation-utils";

export function UploadStatementDialog({
  open,
  onOpenChange,
  onSuccess,
  preset,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  onSuccess: (statementId: number) => void;
  preset?: BankStatement | null;
}) {
  const accounts = loadBankAccounts();
  const currentYear = new Date().getFullYear();

  const [bankAccountId, setBankAccountId] = useState(String(preset?.bankAccountId ?? accounts[0]?.id ?? ""));
  const [month, setMonth] = useState(String(preset?.month ?? new Date().getMonth() + 1));
  const [year, setYear] = useState(String(preset?.year ?? currentYear));
  const [statementName, setStatementName] = useState(preset?.statementName ?? "");
  const [file, setFile] = useState<File | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [overwriteOpen, setOverwriteOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    if (preset) {
      setBankAccountId(String(preset.bankAccountId));
      setMonth(String(preset.month));
      setYear(String(preset.year));
      setStatementName(preset.statementName);
    }
  }, [open, preset]);

  const reset = () => {
    setError("");
    setFile(null);
    if (!preset) {
      setStatementName("");
    }
  };

  const doUpload = async (overwrite: boolean) => {
    if (!file || !bankAccountId || !statementName.trim()) {
      setError("Please fill all required fields and select a file.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await uploadBankStatement({
        bankAccountId: Number(bankAccountId),
        month: Number(month),
        year: Number(year),
        statementName: statementName.trim(),
        file,
        overwrite,
      });
      if (!result.ok) {
        if (result.code === "duplicate") {
          setOverwriteOpen(true);
          return;
        }
        setError(result.code === "empty" ? "No valid rows found in file." : "Invalid bank account.");
        return;
      }
      setOverwriteOpen(false);
      onOpenChange(false);
      reset();
      onSuccess(result.statementId);
    } finally {
      setBusy(false);
    }
  };

  const handleSubmit = () => {
    const existing = findExistingStatement(Number(bankAccountId), Number(month), Number(year));
    if (existing && !preset) {
      setOverwriteOpen(true);
      return;
    }
    void doUpload(!!preset || !!existing);
  };

  return (
    <>
      <Dialog
        open={open}
        onOpenChange={(v) => {
          onOpenChange(v);
          if (!v) reset();
        }}
      >
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">{preset ? "Re-upload Statement" : "Upload Bank Statement"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-3 py-1">
            <div className="space-y-1">
              <Label className="text-xs">Bank Account</Label>
              <Select value={bankAccountId} onValueChange={setBankAccountId} disabled={!!preset}>
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select bank" />
                </SelectTrigger>
                <SelectContent>
                  {accounts.map((a) => (
                    <SelectItem key={a.id} value={String(a.id)} className="text-xs">
                      {a.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <Label className="text-xs">Month</Label>
                <Select value={month} onValueChange={setMonth} disabled={!!preset}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {MONTH_NAMES.map((m, i) => (
                      <SelectItem key={m} value={String(i + 1)} className="text-xs">
                        {m}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label className="text-xs">Year</Label>
                <Select value={year} onValueChange={setYear} disabled={!!preset}>
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[currentYear - 1, currentYear, currentYear + 1].map((y) => (
                      <SelectItem key={y} value={String(y)} className="text-xs">
                        {y}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Statement Name</Label>
              <Input
                className="h-8 text-xs"
                value={statementName}
                onChange={(e) => setStatementName(e.target.value)}
                placeholder="e.g. HDFC June 2026"
              />
            </div>
            <div className="space-y-1">
              <Label className="text-xs">Upload File (Excel / CSV)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv"
                className="h-8 text-xs"
                onChange={(e) => setFile(e.target.files?.[0] ?? null)}
              />
            </div>
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => onOpenChange(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              disabled={busy}
              onClick={handleSubmit}
            >
              {busy ? "Uploading…" : preset ? "Overwrite & Import" : "Upload"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={overwriteOpen} onOpenChange={setOverwriteOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm">Overwrite existing statement?</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-muted-foreground leading-relaxed">
            Statement already uploaded for this bank and month. Re-uploading will overwrite all existing bank entries
            and matching data for this month. Do you want to continue?
          </p>
          <DialogFooter>
            <Button variant="outline" size="sm" className="h-8 text-xs" onClick={() => setOverwriteOpen(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-amber-600 hover:bg-amber-700 text-white"
              disabled={busy}
              onClick={() => void doUpload(true)}
            >
              {busy ? "Importing…" : "Yes, overwrite"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
