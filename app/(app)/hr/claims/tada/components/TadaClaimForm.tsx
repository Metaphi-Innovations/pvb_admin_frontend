"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Download, Eye, Plus, Trash2, Upload } from "lucide-react";
import {
  CITY_CATEGORY_POLICY_OPTIONS,
  CLAIM_TYPE_OPTIONS,
  TRAVEL_MODE_OPTIONS,
} from "@/lib/hr/config";
import { getActiveHrEmployees } from "../../../employees/employee-master-data";
import type {
  ClaimAttachment,
  TadaClaimFormValues,
  TadaExpenseDetail,
  TadaTravelDetail,
} from "../tada-claim-data";
import {
  DEFAULT_EXPENSE,
  DEFAULT_TRAVEL,
  employeeFieldsForClaim,
  newRowId,
} from "../tada-claim-data";

export function TadaClaimForm({
  form,
  onChange,
  claimNumber,
  readOnly,
}: {
  form: TadaClaimFormValues;
  onChange: (f: TadaClaimFormValues) => void;
  claimNumber: string;
  readOnly?: boolean;
}) {
  const employees = getActiveHrEmployees();
  const set = (patch: Partial<TadaClaimFormValues>) => onChange({ ...form, ...patch });

  const onEmployeeChange = (employeeId: number) => {
    const fields = employeeFieldsForClaim(employeeId);
    onChange({ ...form, employeeId, ...fields });
  };

  const updateTravel = (i: number, patch: Partial<TadaTravelDetail>) => {
    const travelDetails = [...form.travelDetails];
    const row = { ...travelDetails[i], ...patch };
    if (patch.distanceKm !== undefined || patch.ratePerKm !== undefined) {
      row.amount = Math.round((row.distanceKm || 0) * (row.ratePerKm || 0));
    }
    travelDetails[i] = row;
    set({ travelDetails });
  };

  const updateExpense = (i: number, patch: Partial<TadaExpenseDetail>) => {
    const expenseDetails = [...form.expenseDetails];
    expenseDetails[i] = { ...expenseDetails[i], ...patch };
    set({ expenseDetails });
  };

  const addAttachment = () => {
    const att: ClaimAttachment = {
      id: newRowId("att"),
      documentName: `Document ${form.attachments.length + 1}`,
      fileName: `upload_${Date.now()}.pdf`,
    };
    set({ attachments: [...form.attachments, att] });
  };

  return (
    <Tabs defaultValue="basic" className="space-y-3">
      <TabsList className="h-8 bg-muted/40 p-0.5 gap-0.5">
        {(["basic", "travel", "expense", "attachments"] as const).map((t) => (
          <TabsTrigger
            key={t}
            value={t}
            className="h-7 px-3 text-[11px] data-[state=active]:bg-white data-[state=active]:shadow-sm rounded-md"
          >
            {t === "basic"
              ? "Basic Details"
              : t === "travel"
                ? "Travel Details"
                : t === "expense"
                  ? "Expense Details"
                  : "Attachments"}
          </TabsTrigger>
        ))}
      </TabsList>

      <TabsContent value="basic" className="mt-0">
        <div className="page-shell p-3">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            <div className="space-y-1">
              <Label className="text-[11px]">Claim No.</Label>
              <Input value={claimNumber} disabled className="h-8 text-xs font-mono bg-muted/30" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Employee *</Label>
              <Select
                value={form.employeeId ? String(form.employeeId) : ""}
                disabled={readOnly}
                onValueChange={(v) => onEmployeeChange(Number(v))}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue placeholder="Select" />
                </SelectTrigger>
                <SelectContent>
                  {employees.map((e) => (
                    <SelectItem key={e.id} value={String(e.id)} className="text-xs">
                      {e.employeeName} ({e.employeeCode})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Designation</Label>
              <Input value={form.designation} disabled className="h-8 text-xs bg-muted/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Reporting Manager</Label>
              <Input value={form.reportingManager} disabled className="h-8 text-xs bg-muted/20" />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Claim Period From *</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                disabled={readOnly}
                value={form.periodFrom}
                onChange={(e) => set({ periodFrom: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Claim Period To *</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                disabled={readOnly}
                value={form.periodTo}
                onChange={(e) => set({ periodTo: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Claim Date *</Label>
              <Input
                type="date"
                className="h-8 text-xs"
                disabled={readOnly}
                value={form.claimDate}
                onChange={(e) => set({ claimDate: e.target.value })}
              />
            </div>
            <div className="space-y-1">
              <Label className="text-[11px]">Claim Type *</Label>
              <Select
                value={form.claimType}
                disabled={readOnly}
                onValueChange={(v) => set({ claimType: v })}
              >
                <SelectTrigger className="h-8 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CLAIM_TYPE_OPTIONS.map((c) => (
                    <SelectItem key={c.code} value={c.code} className="text-xs">
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1 sm:col-span-2 lg:col-span-4">
              <Label className="text-[11px]">Remarks</Label>
              <Input
                className="h-8 text-xs"
                disabled={readOnly}
                value={form.remarks}
                onChange={(e) => set({ remarks: e.target.value })}
                placeholder="Purpose of travel / claim notes"
              />
            </div>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="travel" className="mt-0">
        <div className="page-shell overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
            <p className="text-xs font-semibold">Travel Details</p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() =>
                  set({
                    travelDetails: [
                      ...form.travelDetails,
                      { ...DEFAULT_TRAVEL, id: newRowId("tr") },
                    ],
                  })
                }
              >
                <Plus className="w-3 h-3" /> Add Row
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  {[
                    "Travel Date",
                    "From",
                    "To",
                    "City Category",
                    "Mode",
                    "Dist (km)",
                    "Rate/km",
                    "Amount",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground whitespace-nowrap"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.travelDetails.map((row, i) => (
                  <tr key={row.id} className="border-b border-border/40">
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        className="h-7 text-[11px] w-[120px]"
                        disabled={readOnly}
                        value={row.travelDate}
                        onChange={(e) => updateTravel(i, { travelDate: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-7 text-[11px] w-[90px]"
                        disabled={readOnly}
                        value={row.fromLocation}
                        onChange={(e) => updateTravel(i, { fromLocation: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-7 text-[11px] w-[90px]"
                        disabled={readOnly}
                        value={row.toLocation}
                        onChange={(e) => updateTravel(i, { toLocation: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={row.cityCategory}
                        disabled={readOnly}
                        onValueChange={(v) => updateTravel(i, { cityCategory: v })}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-[110px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {CITY_CATEGORY_POLICY_OPTIONS.map((c) => (
                            <SelectItem key={c} value={c} className="text-xs">
                              {c}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Select
                        value={row.travelMode}
                        disabled={readOnly}
                        onValueChange={(v) => updateTravel(i, { travelMode: v })}
                      >
                        <SelectTrigger className="h-7 text-[11px] w-[130px]">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TRAVEL_MODE_OPTIONS.map((m) => (
                            <SelectItem key={m} value={m} className="text-xs">
                              {m}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        className="h-7 text-[11px] w-[70px]"
                        disabled={readOnly}
                        value={row.distanceKm || ""}
                        onChange={(e) =>
                          updateTravel(i, { distanceKm: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        className="h-7 text-[11px] w-[70px]"
                        disabled={readOnly}
                        value={row.ratePerKm || ""}
                        onChange={(e) =>
                          updateTravel(i, { ratePerKm: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        className="h-7 text-[11px] w-[80px] bg-muted/20"
                        disabled
                        value={row.amount || ""}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {!readOnly && form.travelDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            set({
                              travelDetails: form.travelDetails.filter((_, j) => j !== i),
                            })
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="expense" className="mt-0">
        <div className="page-shell overflow-hidden">
          <div className="px-3 py-2 border-b flex items-center justify-between bg-muted/20">
            <p className="text-xs font-semibold">Expense Details</p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={() =>
                  set({
                    expenseDetails: [
                      ...form.expenseDetails,
                      { ...DEFAULT_EXPENSE, id: newRowId("ex") },
                    ],
                  })
                }
              >
                <Plus className="w-3 h-3" /> Add Row
              </Button>
            )}
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead className="bg-muted/30 border-b">
                <tr>
                  {[
                    "Expense Type",
                    "Bill Date",
                    "Bill No.",
                    "Claimed",
                    "Approved",
                    "Remarks",
                  ].map((h) => (
                    <th
                      key={h}
                      className="px-2 py-2 text-left text-[10px] font-semibold uppercase text-muted-foreground"
                    >
                      {h}
                    </th>
                  ))}
                  <th className="w-8" />
                </tr>
              </thead>
              <tbody>
                {form.expenseDetails.map((row, i) => (
                  <tr key={row.id} className="border-b border-border/40">
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-7 text-[11px] w-[110px]"
                        disabled={readOnly}
                        value={row.expenseType}
                        onChange={(e) => updateExpense(i, { expenseType: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="date"
                        className="h-7 text-[11px] w-[120px]"
                        disabled={readOnly}
                        value={row.billDate}
                        onChange={(e) => updateExpense(i, { billDate: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-7 text-[11px] w-[90px]"
                        disabled={readOnly}
                        value={row.billNo}
                        onChange={(e) => updateExpense(i, { billNo: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        className="h-7 text-[11px] w-[80px]"
                        disabled={readOnly}
                        value={row.claimedAmount || ""}
                        onChange={(e) =>
                          updateExpense(i, { claimedAmount: Number(e.target.value) })
                        }
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        type="number"
                        className="h-7 text-[11px] w-[80px] bg-muted/20"
                        disabled
                        value={row.approvedAmount || ""}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      <Input
                        className="h-7 text-[11px] min-w-[100px]"
                        disabled={readOnly}
                        value={row.remarks}
                        onChange={(e) => updateExpense(i, { remarks: e.target.value })}
                      />
                    </td>
                    <td className="px-2 py-1.5">
                      {!readOnly && form.expenseDetails.length > 1 && (
                        <button
                          type="button"
                          onClick={() =>
                            set({
                              expenseDetails: form.expenseDetails.filter((_, j) => j !== i),
                            })
                          }
                          className="text-red-500"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </TabsContent>

      <TabsContent value="attachments" className="mt-0">
        <div className="page-shell p-3">
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-semibold">Attachments</p>
            {!readOnly && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[11px] gap-1"
                onClick={addAttachment}
              >
                <Upload className="w-3 h-3" /> Upload File
              </Button>
            )}
          </div>
          {form.attachments.length === 0 ? (
            <p className="text-[11px] text-muted-foreground">Bills, receipts, supporting documents.</p>
          ) : (
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b">
                  <th className="py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    Document Name
                  </th>
                  <th className="py-1.5 text-left text-[10px] font-semibold uppercase text-muted-foreground">
                    File
                  </th>
                  <th className="py-1.5 text-right text-[10px] font-semibold uppercase text-muted-foreground">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody>
                {form.attachments.map((a, i) => (
                  <tr key={a.id} className="border-b border-border/40">
                    <td className="py-2 pr-2">
                      <Input
                        className="h-7 text-[11px]"
                        disabled={readOnly}
                        value={a.documentName}
                        onChange={(e) => {
                          const attachments = [...form.attachments];
                          attachments[i] = { ...a, documentName: e.target.value };
                          set({ attachments });
                        }}
                      />
                    </td>
                    <td className="py-2 text-muted-foreground font-mono text-[11px]">{a.fileName}</td>
                    <td className="py-2">
                      <div className="flex justify-end gap-1">
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
                          title="View"
                        >
                          <Eye className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center rounded hover:bg-muted"
                          title="Download"
                        >
                          <Download className="w-3.5 h-3.5" />
                        </button>
                        {!readOnly && (
                          <button
                            type="button"
                            className="w-7 h-7 flex items-center justify-center rounded hover:bg-red-50 text-red-600"
                            title="Delete"
                            onClick={() =>
                              set({
                                attachments: form.attachments.filter((_, j) => j !== i),
                              })
                            }
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </TabsContent>
    </Tabs>
  );
}
