"use client";

import { useState } from "react";
import * as XLSX from "xlsx";
import { cn } from "@/lib/utils";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  importValidUploadRows,
  mapRawUploadRow,
  parsePincodeJsonFile,
  PINCODE_UPLOAD_REQUIRED_COLUMNS,
  setUploadErrorCount,
  type PincodeUploadValidation,
  validateUploadRows,
} from "../pincode-data";

type UploadStep = "select" | "validated";

export function PincodeUploadDialog({
  open,
  onClose,
  onImported,
}: {
  open: boolean;
  onClose: () => void;
  onImported: (count: number) => void;
}) {
  const [file, setFile] = useState<File | null>(null);
  const [step, setStep] = useState<UploadStep>("select");
  const [validation, setValidation] = useState<PincodeUploadValidation | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const reset = () => {
    setFile(null);
    setStep("select");
    setValidation(null);
    setError("");
    setBusy(false);
  };

  const handleClose = () => {
    reset();
    onClose();
  };

  const parseFile = async (selected: File): Promise<Record<string, unknown>[]> => {
    const name = selected.name.toLowerCase();
    if (name.endsWith(".json")) {
      const text = await selected.text();
      const json = JSON.parse(text) as unknown;
      const rows = parsePincodeJsonFile(json);
      return rows.map((r) => ({
        pincode: r.pincode,
        statename: r.stateName,
        district: r.district,
        cityname: r.city,
        officename: r.town,
      }));
    }
    if (name.endsWith(".csv")) {
      const text = await selected.text();
      const wb = XLSX.read(text, { type: "string" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    }
    if (name.endsWith(".xlsx") || name.endsWith(".xls")) {
      const buffer = await selected.arrayBuffer();
      const wb = XLSX.read(buffer, { type: "array" });
      const sheet = wb.Sheets[wb.SheetNames[0]];
      return XLSX.utils.sheet_to_json<Record<string, unknown>>(sheet, { defval: "" });
    }
    throw new Error("Unsupported file format. Please upload .xlsx, .csv, or .json.");
  };

  const handleValidate = async () => {
    if (!file) {
      setError("Please select a file to upload.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const rawRows = await parseFile(file);
      if (rawRows.length === 0) {
        setError("The uploaded file has no data rows.");
        return;
      }
      const mapped = rawRows.map((row, i) => mapRawUploadRow(row, i + 2));
      const result = validateUploadRows(mapped);
      setValidation(result);
      setStep("validated");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not read the uploaded file.");
    } finally {
      setBusy(false);
    }
  };

  const handleImport = () => {
    if (!validation || validation.validRows.length === 0) return;
    const count = importValidUploadRows(validation.validRows);
    setUploadErrorCount(validation.errorRows.length);
    onImported(count);
    handleClose();
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && handleClose()}>
      <DialogContent className={cn("max-w-3xl", step === "validated" && "max-h-[90vh] overflow-y-auto")}>
        <DialogHeader>
          <DialogTitle className="text-base">Upload India Post Master</DialogTitle>
          <DialogDescription>
            Upload India Post location master (.xlsx, .csv, or ERP JSON). Town is mapped from officename with
            B.O / S.O / GPO / H.O suffixes removed.
          </DialogDescription>
        </DialogHeader>

        {step === "select" && (
          <div className="space-y-4">
            <div className="rounded-lg border border-border/60 bg-muted/20 p-3 space-y-2">
              <p className="text-xs font-medium text-foreground">Required Columns</p>
              <p className="text-[11px] text-muted-foreground font-mono">
                {PINCODE_UPLOAD_REQUIRED_COLUMNS.join(", ")}
              </p>
              <p className="text-[11px] text-muted-foreground pt-1">
                JSON format: array or {"{ records: [...] }"} with pincode, state, district, city, town, status.
                CSV optional: cityname (defaults to district). India Post technical columns are ignored.
              </p>
            </div>

            <div className="space-y-1">
              <Label className="text-xs">Select File (.xlsx, .csv, or .json)</Label>
              <Input
                type="file"
                accept=".xlsx,.xls,.csv,.json"
                className="h-9 text-sm"
                onChange={(e) => {
                  setFile(e.target.files?.[0] ?? null);
                  setError("");
                }}
              />
              {file && (
                <p className="text-[11px] text-muted-foreground">Selected: {file.name}</p>
              )}
            </div>

            {error && <p className="text-xs text-red-600">{error}</p>}

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={handleValidate}
                disabled={busy || !file}
              >
                {busy ? "Validating…" : "Validate File"}
              </Button>
            </div>
          </div>
        )}

        {step === "validated" && validation && (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[
                { label: "Total Rows", value: validation.totalRows },
                { label: "Valid Rows", value: validation.validRows.length },
                { label: "Error Rows", value: validation.errorRows.length },
                { label: "Duplicate Rows", value: validation.duplicateRows },
              ].map((card) => (
                <div key={card.label} className="rounded-xl border border-border bg-white p-3">
                  <p className="text-lg font-bold leading-none">{card.value}</p>
                  <p className="text-[11px] text-muted-foreground mt-1">{card.label}</p>
                </div>
              ))}
            </div>

            <Tabs defaultValue="valid" className="space-y-3">
              <TabsList>
                <TabsTrigger value="valid" className="text-xs">
                  Valid Records ({validation.validRows.length})
                </TabsTrigger>
                <TabsTrigger value="errors" className="text-xs">
                  Error Records ({validation.errorRows.length})
                </TabsTrigger>
              </TabsList>

              <TabsContent value="valid" className="m-0">
                <div className="overflow-x-auto border border-border/60 rounded-lg max-h-[280px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        {["Pincode", "State", "District", "City", "Town"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validation.validRows.length === 0 ? (
                        <tr>
                          <td colSpan={5} className="px-3 py-8 text-center text-muted-foreground">
                            No valid records to import.
                          </td>
                        </tr>
                      ) : (
                        validation.validRows.map((row) => (
                          <tr
                            key={`${row.rowNumber}-${row.pincode}-${row.town}`}
                            className="border-t border-border/40"
                          >
                            <td className="px-3 py-2 font-mono">{row.pincode}</td>
                            <td className="px-3 py-2">{row.stateName}</td>
                            <td className="px-3 py-2">{row.district}</td>
                            <td className="px-3 py-2">{row.city}</td>
                            <td className="px-3 py-2">{row.town}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>

              <TabsContent value="errors" className="m-0">
                <div className="overflow-x-auto border border-border/60 rounded-lg max-h-[280px] overflow-y-auto">
                  <table className="w-full text-xs">
                    <thead className="bg-muted/40 sticky top-0">
                      <tr>
                        {["Row Number", "Pincode", "Town", "Error Reason"].map((h) => (
                          <th key={h} className="px-3 py-2 text-left font-semibold text-muted-foreground">
                            {h}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {validation.errorRows.length === 0 ? (
                        <tr>
                          <td colSpan={4} className="px-3 py-8 text-center text-muted-foreground">
                            No error rows.
                          </td>
                        </tr>
                      ) : (
                        validation.errorRows.map((row) => (
                          <tr key={`err-${row.rowNumber}`} className="border-t border-border/40">
                            <td className="px-3 py-2">{row.rowNumber}</td>
                            <td className="px-3 py-2 font-mono">{row.pincode || "—"}</td>
                            <td className="px-3 py-2">{row.town || "—"}</td>
                            <td className="px-3 py-2 text-red-600">{row.errorReason}</td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </TabsContent>
            </Tabs>

            <div className="flex items-center justify-end gap-2 pt-1">
              <Button
                variant="outline"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setStep("select");
                  setValidation(null);
                }}
              >
                Back
              </Button>
              <Button variant="outline" size="sm" className="h-8 text-xs" onClick={handleClose}>
                Cancel
              </Button>
              <Button
                size="sm"
                className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
                onClick={handleImport}
                disabled={validation.validRows.length === 0}
              >
                Import Valid Records
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
