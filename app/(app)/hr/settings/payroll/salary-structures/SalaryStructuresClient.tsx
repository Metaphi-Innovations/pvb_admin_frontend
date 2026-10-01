"use client";

import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Check, ChevronsUpDown, Edit2, FileText, Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetBody,
  SheetFooter,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  HrActiveStatusSwitch,
  activeStatusToastMessage,
} from "../../../components/HrActiveStatusSwitch";
import { HrSuccessToast } from "../../../components/HrSuccessToast";
import {
  HrOrgPageHeader,
  HrOrgField,
  HrFormDrawer,
  HrConfirmDialog,
  HrSettingsDeleteDialog,
  type HrSettingsDeleteTarget,
  HrRowActions,
  HrStatusToggle,
  HrListingToolbar,
  HrDataGrid,
  exportOrgCsv,
  hrInput,
  hrBtn,
  type HrDensity,
  type HrStatusFilter,
  type HrDataGridColumn,
} from "../../organization/_components";
import {
  loadSalaryComponents,
  type SalaryComponentRecord,
  type SalaryComponentType,
} from "../../salary-components-data";
import {
  applySalaryStructureDefault,
  buildCalculateOnSelectOptions,
  buildLineFromComponent,
  calcModeLabel,
  computeStructurePreview,
  countEmployeesOnSalaryStructure,
  countLinesByType,
  getSalaryComponentById,
  groupStructureLines,
  isProtectedStatutoryStructureComponent,
  isSelfReferencingLine,
  loadSalaryStructures,
  nextSalaryStructureId,
  nextStructureLineId,
  saveSalaryStructures,
  systemCalculatedStructureLabels,
  withSalaryStructureNewAudit,
  withSalaryStructureUpdateAudit,
  type SalaryStructureLine,
  type SalaryStructureRecord,
  type StructureCalculateOnBase,
  type StructureLineCalcMode,
  type StructureLinePreview,
  type StructurePreview,
} from "../../salary-structures-data";
import { HR_BTN_CLASS, HR_BTN_PRIMARY_CLASS, HR_DRAWER_WIDTH_CLASS } from "../../organization/_components/hr-org-form";

/** Add/Edit + View drawer — 800px desktop; list stays partially visible */
const DRAWER_WIDTH =
  "w-full max-w-full sm:max-w-[calc(100vw-1.5rem)] lg:max-w-[800px]";

/** Component table column widths (table-fixed, ~665px total — fits 800px drawer) */
const COMPONENT_TABLE_COL = {
  component: "w-[200px] min-w-[180px]",
  calculation: "w-[150px] min-w-[140px]",
  valueRate: "w-[120px] min-w-[110px]",
  calculateOn: "w-[155px] min-w-[140px]",
  action: "w-10 min-w-[40px]",
} as const;

type FormState = {
  id?: number;
  name: string;
  isDefault: boolean;
  status: SalaryStructureRecord["status"];
  lines: SalaryStructureLine[];
};

const EMPTY: FormState = {
  name: "",
  isDefault: false,
  status: "active",
  lines: [],
};

const COLUMN_DEFS = [
  { id: "name", label: "Structure Name" },
  { id: "earnings", label: "Earnings" },
  { id: "deductions", label: "Deductions" },
  { id: "contributions", label: "Employer Contributions" },
  { id: "default", label: "Default" },
  { id: "employees", label: "Employees" },
  { id: "status", label: "Active" },
  { id: "actions", label: "Actions" },
];

type ConfirmTarget =
  | { type: "deactivate"; record: SalaryStructureRecord; count: number }
  | { type: "makeDefault"; form: FormState; currentDefaultName: string };

type DeleteState = { record: SalaryStructureRecord } & HrSettingsDeleteTarget;

type DrawerMode = "add" | "edit" | null;

function SectionHeading({ label }: { label: string }) {
  return (
    <div className="pb-2 border-b border-border">
      <p className="text-[10px] font-bold uppercase tracking-widest text-muted-foreground">
        {label}
      </p>
    </div>
  );
}

function OptionSelect<T extends string>({
  value,
  options,
  onChange,
  disabled,
  placeholder = "Select…",
  widthClass = "w-full",
}: {
  value: T | "";
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
  disabled?: boolean;
  placeholder?: string;
  widthClass?: string;
}) {
  const [open, setOpen] = useState(false);
  const label = options.find((o) => o.value === String(value))?.label ?? placeholder;
  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            hrInput(undefined, "default"),
            "h-9 w-full px-2.5 text-xs text-left flex items-center justify-between gap-1",
            disabled && "opacity-60 cursor-not-allowed",
            widthClass,
          )}
        >
          <span className="truncate">{label}</span>
          <ChevronsUpDown className="w-3 h-3 shrink-0 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent align="start" className={cn("p-1 rounded-[12px] min-w-[10rem]", widthClass)}>
        {options.map((opt) => (
          <button
            key={opt.value}
            type="button"
            onClick={() => {
              onChange(opt.value);
              setOpen(false);
            }}
            className={cn(
              "w-full flex items-center gap-2 px-2.5 py-2 text-xs text-left rounded-lg transition-colors",
              value === opt.value
                ? "bg-brand-50 text-brand-700 font-medium"
                : "text-foreground hover:bg-muted/60",
            )}
          >
            <span className="flex-1">{opt.label}</span>
            {value === opt.value ? (
              <Check className="w-3.5 h-3.5 text-brand-600 shrink-0" />
            ) : null}
          </button>
        ))}
      </PopoverContent>
    </Popover>
  );
}

function parseNonNegNumber(raw: string): number | null {
  const t = raw.trim();
  if (t === "") return null;
  const n = Number(t);
  if (Number.isNaN(n) || n < 0) return null;
  return n;
}

function FormCompactSummary({
  earnings,
  deductions,
  employerContributions,
  configuredGross,
}: {
  earnings: number;
  deductions: number;
  employerContributions: number;
  configuredGross: number | null;
}) {
  return (
    <div className="rounded-lg border border-border bg-muted/20 px-3 py-2 text-[11px] text-muted-foreground flex flex-wrap items-center gap-x-2 gap-y-0.5">
      <span>
        {earnings} Earning{earnings === 1 ? "" : "s"} · {deductions} Deduction
        {deductions === 1 ? "" : "s"} · {employerContributions} Employer Contribution
        {employerContributions === 1 ? "" : "s"}
      </span>
      {configuredGross != null ? (
        <span className="text-foreground font-medium tabular-nums">
          · Configured Gross: ₹{configuredGross.toLocaleString("en-IN")}
        </span>
      ) : (
        <span>· CTC / percentage lines resolve at employee salary assignment</span>
      )}
    </div>
  );
}

function formatCalculateOnValue(line: SalaryStructureLine): string {
  if (line.calcMode !== "percent") return "";
  if (line.calculateOnBase === "ctc") return "ctc";
  if (line.calculateOnBase === "gross") return "gross";
  if (line.calculateOnBase === "component" && line.calculateOnComponentId != null) {
    return `component:${line.calculateOnComponentId}`;
  }
  return "";
}

function parseCalculateOnValue(value: string): {
  calculateOnBase: StructureCalculateOnBase;
  calculateOnComponentId: number | null;
} {
  if (value === "ctc") return { calculateOnBase: "ctc", calculateOnComponentId: null };
  if (value === "gross") return { calculateOnBase: "gross", calculateOnComponentId: null };
  if (value.startsWith("component:")) {
    return {
      calculateOnBase: "component",
      calculateOnComponentId: Number(value.slice("component:".length)) || null,
    };
  }
  return { calculateOnBase: "component", calculateOnComponentId: null };
}

function ViewReadOnlyTable({ items }: { items: StructureLinePreview[] }) {
  if (items.length === 0) {
    return <p className="text-xs text-muted-foreground py-2">No components configured.</p>;
  }
  return (
    <div className="rounded-xl border border-border">
      <table className="w-full table-fixed text-xs">
        <thead>
          <tr className="bg-muted/30 border-b border-border">
            <th className={cn("px-3 py-2.5 text-left font-semibold", COMPONENT_TABLE_COL.component)}>
              Component
            </th>
            <th
              className={cn("px-3 py-2.5 text-left font-semibold", COMPONENT_TABLE_COL.calculation)}
            >
              Calculation
            </th>
            <th className={cn("px-3 py-2.5 text-left font-semibold", COMPONENT_TABLE_COL.valueRate)}>
              Value / Rate
            </th>
            <th
              className={cn("px-3 py-2.5 text-left font-semibold", COMPONENT_TABLE_COL.calculateOn)}
            >
              Calculate On
            </th>
          </tr>
        </thead>
        <tbody>
          {items.map((item) => {
            const tip =
              item.calcMode === "system" &&
              item.componentName.trim().toLowerCase() === "professional tax"
                ? "Professional Tax is resolved from Statutory Compliance → Professional Tax configurations (state, salary basis, slabs). Amounts differ per employee."
                : item.calcMode === "system" &&
                    (item.componentName.trim().toLowerCase() === "employee pf" ||
                      item.componentName.trim().toLowerCase() === "employer pf")
                  ? "Provident Fund is resolved from Statutory Compliance → PF settings (rates, ceilings, EPS). Amounts differ per employee."
                  : item.calcMode === "system" &&
                      (item.componentName.trim().toLowerCase() === "esi" ||
                        item.componentName.trim().toLowerCase() === "employee esi" ||
                        item.componentName.trim().toLowerCase() === "employer esi")
                    ? "ESI is resolved from Statutory Compliance → ESI settings (eligibility limit, rates, contribution base). Amounts differ per employee."
                    : item.calcMode === "system" &&
                        (item.componentName.trim().toLowerCase() === "employee lwf" ||
                          item.componentName.trim().toLowerCase() === "employer lwf" ||
                          item.componentName.trim().toLowerCase() === "lwf")
                      ? "Labour Welfare Fund is resolved from Statutory Compliance → LWF settings (state, frequency, contribution months). Amounts differ per employee."
                      : null;
            return (
              <tr
                key={item.lineId}
                className="border-b border-border/60 last:border-0 h-[50px]"
              >
                <td className="px-3 py-3 align-middle font-medium text-foreground truncate">
                  {tip ? (
                    <TooltipProvider delayDuration={200}>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span className="cursor-help border-b border-dotted border-muted-foreground/50">
                            {item.componentName}
                          </span>
                        </TooltipTrigger>
                        <TooltipContent side="top" className="text-[11px] max-w-[240px]">
                          {tip}
                        </TooltipContent>
                      </Tooltip>
                    </TooltipProvider>
                  ) : (
                    item.componentName
                  )}
                </td>
                <td className="px-3 py-3 align-middle text-muted-foreground truncate">
                  {item.displayCalculation}
                </td>
                <td className="px-3 py-3 align-middle text-foreground">{item.displayAmount}</td>
                <td className="px-3 py-3 align-middle text-muted-foreground truncate">
                  {item.displayCalculateOn}
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function ViewStructureContent({
  record,
  preview,
  employeeCount,
}: {
  record: SalaryStructureRecord;
  preview: StructurePreview;
  employeeCount: number;
}) {
  const hasStatutoryEmployer = preview.employerContributions.some((i) => i.calcMode === "system");

  return (
    <div className="space-y-5">
      <section className="space-y-2.5">
        <SectionHeading label="Structure Details" />
        <div className="rounded-xl border border-border px-3 py-2.5 space-y-2">
          <div className="flex flex-wrap items-center gap-2">
            <p className="text-sm font-semibold text-foreground">{record.name}</p>
            {record.isDefault ? (
              <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
                Default
              </span>
            ) : null}
            <span
              className={cn(
                "inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-semibold border",
                record.status === "active"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : "bg-slate-100 text-slate-600 border-border",
              )}
            >
              {record.status === "active" ? "Active" : "Inactive"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground">
            {employeeCount} employee{employeeCount === 1 ? "" : "s"} assigned
          </p>
        </div>
      </section>

      <section className="space-y-2.5">
        <SectionHeading label="Earnings" />
        <ViewReadOnlyTable items={preview.earnings} />
      </section>

      <section className="space-y-2.5">
        <SectionHeading label="Employee Deductions" />
        <ViewReadOnlyTable items={preview.deductions} />
      </section>

      <section className="space-y-2.5">
        <SectionHeading label="Employer Contributions" />
        <ViewReadOnlyTable items={preview.employerContributions} />
      </section>

      <section className="space-y-2">
        <SectionHeading label="Salary Summary" />
        <div className="rounded-xl border border-border bg-muted/20 px-3 py-2.5 space-y-1.5 text-xs">
          {preview.grossEarnings != null ? (
            <div className="flex justify-between gap-3">
              <span className="text-muted-foreground">Configured Gross</span>
              <span className="font-semibold tabular-nums">
                ₹{preview.grossEarnings.toLocaleString("en-IN")}
              </span>
            </div>
          ) : null}
          <p className="text-[11px] text-muted-foreground leading-snug">
            Percentage-based lines (CTC / Basic) resolve when employee CTC is assigned — not in
            this template.
          </p>
          <div className="flex justify-between gap-3">
            <span className="text-muted-foreground">Employer Contribution</span>
            <span className="text-muted-foreground italic">
              {preview.totalEmployerContribution != null && !hasStatutoryEmployer
                ? `₹${preview.totalEmployerContribution.toLocaleString("en-IN")}`
                : "Calculated during payroll"}
            </span>
          </div>
          <p className="text-[11px] text-muted-foreground pt-1.5 border-t border-border/60 leading-snug">
            Actual statutory deductions and net pay are calculated during payroll.
          </p>
        </div>
      </section>
    </div>
  );
}

function ViewStructureDrawer({
  open,
  record,
  preview,
  employeeCount,
  onClose,
  onEdit,
}: {
  open: boolean;
  record: SalaryStructureRecord | null;
  preview: StructurePreview | null;
  employeeCount: number;
  onClose: () => void;
  onEdit: (record: SalaryStructureRecord) => void;
}) {
  return (
    <Sheet open={open} onOpenChange={(o) => !o && onClose()}>
      <SheetContent className={cn(HR_DRAWER_WIDTH_CLASS, DRAWER_WIDTH)}>
        <SheetHeader className="px-5 pt-4 pb-3 pr-12">
          <SheetTitle className="text-[15px] font-semibold">View Salary Structure</SheetTitle>
          <SheetDescription className="text-xs mt-0.5">
            Read-only template — not an employee payslip.
          </SheetDescription>
        </SheetHeader>
        <SheetBody className="px-5 py-4">
          {record && preview ? (
            <ViewStructureContent
              record={record}
              preview={preview}
              employeeCount={employeeCount}
            />
          ) : null}
        </SheetBody>
        <SheetFooter className="px-5 py-3 gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className={HR_BTN_CLASS}
            onClick={onClose}
          >
            Close
          </Button>
          {record ? (
            <Button
              type="button"
              size="sm"
              className={cn(HR_BTN_PRIMARY_CLASS, "gap-1.5")}
              onClick={() => {
                onClose();
                onEdit(record);
              }}
            >
              <Edit2 className="w-3.5 h-3.5" /> Edit
            </Button>
          ) : null}
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

function ComponentSectionTable({
  title,
  componentType,
  lines,
  allComponents,
  formLines,
  onAdd,
  onUpdateLine,
  onRemoveLine,
}: {
  title: string;
  componentType: SalaryComponentType;
  lines: SalaryStructureLine[];
  allComponents: SalaryComponentRecord[];
  formLines: SalaryStructureLine[];
  onAdd: (component: SalaryComponentRecord) => void;
  onUpdateLine: (lineId: number, patch: Partial<SalaryStructureLine>) => void;
  onRemoveLine: (lineId: number) => void;
}) {
  const [addOpen, setAddOpen] = useState(false);
  const usedIds = new Set(formLines.map((l) => l.componentId));
  const available = allComponents.filter(
    (c) => c.status === "active" && c.componentType === componentType && !usedIds.has(c.id),
  );

  const earningLines = formLines.filter((l) => {
    const c = allComponents.find((x) => x.id === l.componentId);
    return c?.componentType === "earning";
  });

  const earningCalcModeOptions: { value: StructureLineCalcMode; label: string }[] = [
    { value: "fixed", label: "Fixed Amount" },
    { value: "percent", label: "Percentage" },
  ];

  const setLineCalcMode = (line: SalaryStructureLine, mode: StructureLineCalcMode) => {
    if (mode === line.calcMode) return;
    if (mode === "fixed") {
      onUpdateLine(line.id, {
        calcMode: "fixed",
        structureAmount: line.structureAmount ?? 0,
        structureRate: null,
        calculateOnBase: null,
        calculateOnComponentId: null,
      });
      return;
    }
    onUpdateLine(line.id, {
      calcMode: "percent",
      structureAmount: null,
      structureRate: line.structureRate ?? 0,
      calculateOnBase: line.calculateOnBase ?? "ctc",
      calculateOnComponentId:
        line.calculateOnBase === "component" ? line.calculateOnComponentId : null,
    });
  };

  return (
    <section className="space-y-2.5">
      <div className="flex items-center justify-between gap-2">
        <SectionHeading label={title} />
        <Popover open={addOpen} onOpenChange={setAddOpen}>
          <PopoverTrigger asChild>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className={cn(hrBtn("gap-1 h-7 text-[11px]"), "shrink-0")}
              disabled={available.length === 0}
            >
              <Plus className="w-3 h-3" /> Add Component
            </Button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1 rounded-[12px]">
            {available.length === 0 ? (
              <p className="px-2.5 py-2 text-xs text-muted-foreground">
                No active components available
              </p>
            ) : (
              available.map((c) => (
                <button
                  key={c.id}
                  type="button"
                  onClick={() => {
                    onAdd(c);
                    setAddOpen(false);
                  }}
                  className="w-full px-2.5 py-2 text-xs text-left rounded-lg hover:bg-muted/60"
                >
                  {c.name}
                </button>
              ))
            )}
          </PopoverContent>
        </Popover>
      </div>

      {lines.length === 0 ? (
        <p className="text-xs text-muted-foreground py-2">No components in this section.</p>
      ) : (
        <div className="rounded-xl border border-border">
          <table className="w-full table-fixed text-xs">
            <thead>
              <tr className="bg-muted/30 border-b border-border">
                <th
                  className={cn(
                    "px-3 py-2.5 text-left font-semibold",
                    COMPONENT_TABLE_COL.component,
                  )}
                >
                  Component
                </th>
                <th
                  className={cn(
                    "px-3 py-2.5 text-left font-semibold",
                    COMPONENT_TABLE_COL.calculation,
                  )}
                >
                  Calculation
                </th>
                <th
                  className={cn(
                    "px-3 py-2.5 text-left font-semibold",
                    COMPONENT_TABLE_COL.valueRate,
                  )}
                >
                  Value / Rate
                </th>
                <th
                  className={cn(
                    "px-3 py-2.5 text-left font-semibold",
                    COMPONENT_TABLE_COL.calculateOn,
                  )}
                >
                  Calculate On
                </th>
                <th
                  className={cn("px-2 py-2.5", COMPONENT_TABLE_COL.action)}
                  aria-label="Actions"
                />
              </tr>
            </thead>
            <tbody>
              {lines.map((ln) => {
                const comp = getSalaryComponentById(ln.componentId, allComponents);
                if (!comp) return null;
                const inactive = comp.status === "inactive";
                const canEditCalcMode =
                  componentType === "earning" &&
                  ln.calcMode !== "system" &&
                  !isProtectedStatutoryStructureComponent(comp);
                const calculateOnOptions = buildCalculateOnSelectOptions(
                  ln,
                  earningLines,
                  allComponents,
                );
                const systemLabels =
                  ln.calcMode === "system" ? systemCalculatedStructureLabels(comp) : null;
                return (
                  <tr
                    key={ln.id}
                    className="border-b border-border/60 last:border-0 h-[50px]"
                  >
                    <td className="px-3 py-3 align-middle">
                      {systemLabels?.tooltip ? (
                        <TooltipProvider delayDuration={200}>
                          <Tooltip>
                            <TooltipTrigger asChild>
                              <span className="font-medium text-foreground truncate block cursor-help border-b border-dotted border-muted-foreground/40 w-fit max-w-full">
                                {comp.name}
                              </span>
                            </TooltipTrigger>
                            <TooltipContent side="top" className="text-[11px] max-w-[240px]">
                              {systemLabels.tooltip}
                            </TooltipContent>
                          </Tooltip>
                        </TooltipProvider>
                      ) : (
                        <span className="font-medium text-foreground truncate block">
                          {comp.name}
                        </span>
                      )}
                      {inactive ? (
                        <span className="text-[10px] text-amber-600">(Inactive)</span>
                      ) : null}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {canEditCalcMode ? (
                        <OptionSelect
                          value={ln.calcMode}
                          options={earningCalcModeOptions}
                          onChange={(v) => setLineCalcMode(ln, v)}
                          widthClass="w-[9.5rem]"
                        />
                      ) : (
                        <span className="text-muted-foreground">{calcModeLabel(ln.calcMode)}</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {ln.calcMode === "system" && systemLabels ? (
                        <span className="text-muted-foreground">{systemLabels.valueRate}</span>
                      ) : ln.calcMode === "fixed" ? (
                        <div className="flex items-center gap-1">
                          <span className="text-muted-foreground shrink-0">₹</span>
                          <Input
                            inputMode="decimal"
                            value={ln.structureAmount != null ? String(ln.structureAmount) : ""}
                            onChange={(e) =>
                              onUpdateLine(ln.id, {
                                structureAmount: parseNonNegNumber(e.target.value),
                              })
                            }
                            className={cn(hrInput(), "h-9 w-[6.5rem] text-xs shrink-0")}
                            placeholder="0"
                          />
                        </div>
                      ) : ln.calcMode === "percent" ? (
                        <div className="flex items-center gap-1 shrink-0">
                          <Input
                            inputMode="decimal"
                            value={ln.structureRate != null ? String(ln.structureRate) : ""}
                            onChange={(e) =>
                              onUpdateLine(ln.id, {
                                structureRate: parseNonNegNumber(e.target.value),
                              })
                            }
                            className={cn(hrInput(), "h-9 w-[5rem] text-xs")}
                            placeholder="0"
                          />
                          <span className="text-muted-foreground shrink-0">%</span>
                        </div>
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-3 py-3 align-middle">
                      {ln.calcMode === "system" && systemLabels ? (
                        <span className="text-muted-foreground">{systemLabels.calculateOn}</span>
                      ) : ln.calcMode === "percent" ? (
                        <OptionSelect
                          value={formatCalculateOnValue(ln)}
                          options={calculateOnOptions}
                          onChange={(v) => {
                            const parsed = parseCalculateOnValue(v);
                            onUpdateLine(ln.id, parsed);
                          }}
                          placeholder="Select base…"
                          widthClass="w-[9.75rem]"
                        />
                      ) : (
                        <span className="text-muted-foreground">—</span>
                      )}
                    </td>
                    <td className="px-1 py-3 align-middle text-center">
                      <TooltipProvider delayDuration={200}>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <button
                              type="button"
                              onClick={() => onRemoveLine(ln.id)}
                              className="p-1.5 rounded-md hover:bg-red-50 text-muted-foreground hover:text-red-600"
                              aria-label="Remove component"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-[11px]">
                            Remove Component
                          </TooltipContent>
                        </Tooltip>
                      </TooltipProvider>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default function SalaryStructuresClient() {
  const [records, setRecords] = useState<SalaryStructureRecord[]>([]);
  const [components, setComponents] = useState<SalaryComponentRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<HrStatusFilter>("all");
  const [density, setDensity] = useState<HrDensity>("compact");
  const [visibleColumns, setVisibleColumns] = useState(COLUMN_DEFS.map((c) => c.id));
  const [selectedIds, setSelectedIds] = useState<number[]>([]);
  const [drawerMode, setDrawerMode] = useState<DrawerMode>(null);
  const [viewRecord, setViewRecord] = useState<SalaryStructureRecord | null>(null);
  const [form, setForm] = useState<FormState>(EMPTY);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [toast, setToast] = useState<string | null>(null);
  const [confirm, setConfirm] = useState<ConfirmTarget | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteState | null>(null);

  const refresh = useCallback(() => {
    setLoading(true);
    setRecords(loadSalaryStructures());
    setComponents(loadSalaryComponents());
    setLoading(false);
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const filtered = useMemo(() => {
    let list = records;
    if (statusFilter !== "all") list = list.filter((r) => r.status === statusFilter);
    const q = search.trim().toLowerCase();
    if (!q) return list;
    return list.filter((r) => r.name.toLowerCase().includes(q));
  }, [records, search, statusFilter]);

  const formPreview = useMemo(
    () =>
      computeStructurePreview(
        {
          id: form.id ?? 0,
          name: form.name,
          isDefault: form.isDefault,
          status: form.status,
          lines: form.lines,
          createdBy: "",
          updatedBy: "",
          createdAt: "",
          updatedAt: "",
        },
        components,
      ),
    [form, components],
  );

  const groupedFormLines = useMemo(
    () =>
      groupStructureLines(
        {
          id: 0,
          name: "",
          isDefault: false,
          status: "active",
          lines: form.lines,
          createdBy: "",
          updatedBy: "",
          createdAt: "",
          updatedAt: "",
        },
        components,
      ),
    [form.lines, components],
  );

  const openAdd = () => {
    setForm(EMPTY);
    setErrors({});
    setDrawerMode("add");
  };

  const openEdit = (record: SalaryStructureRecord) => {
    setForm({
      id: record.id,
      name: record.name,
      isDefault: record.isDefault,
      status: record.status,
      lines: structuredClone(record.lines),
    });
    setErrors({});
    setDrawerMode("edit");
  };

  const closeDrawer = () => setDrawerMode(null);

  const set = <K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((f) => ({ ...f, [key]: value }));
    setErrors((e) => {
      const n = { ...e };
      delete n[key];
      delete n.lines;
      return n;
    });
  };

  const updateLine = (lineId: number, patch: Partial<SalaryStructureLine>) => {
    setForm((f) => ({
      ...f,
      lines: f.lines.map((l) => (l.id === lineId ? { ...l, ...patch } : l)),
    }));
  };

  const removeLine = (lineId: number) => {
    setForm((f) => ({ ...f, lines: f.lines.filter((l) => l.id !== lineId) }));
  };

  const addComponent = (component: SalaryComponentRecord) => {
    const earningLines = form.lines.filter((l) => {
      const c = components.find((x) => x.id === l.componentId);
      return c?.componentType === "earning";
    });
    const newLine = buildLineFromComponent(
      component,
      nextStructureLineId(form.lines),
      earningLines,
      components,
    );
    setForm((f) => ({ ...f, lines: [...f.lines, newLine] }));
  };

  const validate = () => {
    const e: Record<string, string> = {};
    if (!form.name.trim()) e.name = "Structure name is required";
    else if (
      records.some(
        (r) =>
          r.name.trim().toLowerCase() === form.name.trim().toLowerCase() && r.id !== form.id,
      )
    ) {
      e.name = "Structure name must be unique";
    }

    for (const ln of form.lines) {
      const comp = getSalaryComponentById(ln.componentId, components);
      if (!comp) continue;
      if (ln.calcMode === "fixed" && ln.structureAmount == null) {
        e.lines = `Enter amount for ${comp.name}`;
        break;
      }
      if (ln.calcMode === "percent") {
        if (ln.structureRate == null) {
          e.lines = `Enter percentage for ${comp.name}`;
          break;
        }
        if (ln.structureRate > 100) {
          e.lines = `Rate for ${comp.name} cannot exceed 100%`;
          break;
        }
        if (!ln.calculateOnBase) {
          e.lines = `Select calculation base for ${comp.name}`;
          break;
        }
        if (
          ln.calculateOnBase === "component" &&
          (!ln.calculateOnComponentId || isSelfReferencingLine(ln))
        ) {
          e.lines = `${comp.name} cannot calculate on itself — choose another base`;
          break;
        }
      }
    }

    setErrors(e);
    return Object.keys(e).length === 0;
  };

  const commitSave = (payload: FormState) => {
    const base = {
      name: payload.name.trim(),
      isDefault: payload.isDefault,
      status: payload.status,
      lines: payload.lines,
    };

    let next = [...records];
    let targetId: number;

    if (payload.id) {
      targetId = payload.id;
      next = next.map((r) =>
        r.id === payload.id
          ? withSalaryStructureUpdateAudit({ ...r, ...base, id: r.id })
          : r,
      );
    } else {
      targetId = nextSalaryStructureId(records);
      next = [...next, withSalaryStructureNewAudit({ ...base, id: targetId })];
    }

    if (payload.isDefault) {
      next = applySalaryStructureDefault(next, targetId);
    }

    saveSalaryStructures(next);
    closeDrawer();
    refresh();
    setToast(
      payload.id ? "Salary structure updated successfully." : "Salary structure created successfully.",
    );
  };

  const handleSave = () => {
    if (!validate()) return;
    if (form.isDefault) {
      const currentDefault = records.find((s) => s.isDefault && s.id !== form.id);
      if (currentDefault) {
        setConfirm({
          type: "makeDefault",
          form,
          currentDefaultName: currentDefault.name,
        });
        return;
      }
    }
    commitSave(form);
  };

  const applyStatus = (record: SalaryStructureRecord, nextActive: boolean) => {
    saveSalaryStructures(
      records.map((r) =>
        r.id === record.id
          ? withSalaryStructureUpdateAudit({
              ...r,
              status: nextActive ? "active" : "inactive",
              isDefault: nextActive ? r.isDefault : false,
            })
          : r,
      ),
    );
    setToast(activeStatusToastMessage(record.name, nextActive));
    refresh();
  };

  const handleStatusToggle = (record: SalaryStructureRecord, nextActive: boolean) => {
    if (record.status === (nextActive ? "active" : "inactive")) return;
    if (!nextActive && record.isDefault) {
      setToast(
        "Default structure cannot be deactivated. Set another active structure as default first.",
      );
      return;
    }
    if (!nextActive) {
      const usageCount = countEmployeesOnSalaryStructure(record);
      if (usageCount > 0) {
        setConfirm({ type: "deactivate", record, count: usageCount });
        return;
      }
    }
    applyStatus(record, nextActive);
  };

  const handleConfirm = () => {
    if (!confirm) return;
    if (confirm.type === "makeDefault") {
      commitSave(confirm.form);
      setConfirm(null);
      return;
    }
    applyStatus(confirm.record, false);
    setConfirm(null);
  };

  const requestDelete = (record: SalaryStructureRecord) => {
    const employeeCount = countEmployeesOnSalaryStructure(record);
    setDeleteTarget({
      record,
      entityLabel: "Salary Structure",
      usageCount: record.isDefault ? Math.max(employeeCount, 1) : employeeCount,
      isActive: record.status === "active",
    });
  };

  const handleDelete = () => {
    if (!deleteTarget) return;
    saveSalaryStructures(records.filter((r) => r.id !== deleteTarget.record.id));
    setSelectedIds([]);
    refresh();
    setToast(`${deleteTarget.record.name} deleted successfully.`);
    setDeleteTarget(null);
  };

  const viewPreview = useMemo(
    () => (viewRecord ? computeStructurePreview(viewRecord, components) : null),
    [viewRecord, components],
  );

  const columns: HrDataGridColumn<SalaryStructureRecord>[] = [
    {
      id: "name",
      label: "Structure Name",
      sortable: true,
      sortValue: (r) => r.name,
      render: (r) => (
        <button
          type="button"
          onClick={() => setViewRecord(r)}
          className="font-semibold text-foreground hover:text-brand-700 text-left transition-colors"
        >
          {r.name}
        </button>
      ),
    },
    {
      id: "earnings",
      label: "Earnings",
      sortable: true,
      sortValue: (r) => countLinesByType(r, components).earnings,
      render: (r) => {
        const c = countLinesByType(r, components);
        return (
          <span className="text-muted-foreground tabular-nums">
            {c.earnings} Earning{c.earnings === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      id: "deductions",
      label: "Deductions",
      sortable: true,
      sortValue: (r) => countLinesByType(r, components).deductions,
      render: (r) => {
        const c = countLinesByType(r, components);
        return (
          <span className="text-muted-foreground tabular-nums">
            {c.deductions} Deduction{c.deductions === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      id: "contributions",
      label: "Employer Contributions",
      sortable: true,
      sortValue: (r) => countLinesByType(r, components).employerContributions,
      render: (r) => {
        const c = countLinesByType(r, components);
        return (
          <span className="text-muted-foreground tabular-nums">
            {c.employerContributions} Contribution{c.employerContributions === 1 ? "" : "s"}
          </span>
        );
      },
    },
    {
      id: "default",
      label: "Default",
      sortable: true,
      sortValue: (r) => (r.isDefault ? 1 : 0),
      render: (r) =>
        r.isDefault ? (
          <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-semibold bg-brand-50 text-brand-700 border border-brand-200">
            Default
          </span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    },
    {
      id: "employees",
      label: "Employees",
      sortable: true,
      sortValue: (r) => countEmployeesOnSalaryStructure(r),
      render: (r) => (
        <span className="text-muted-foreground tabular-nums">
          {countEmployeesOnSalaryStructure(r)} Employee
          {countEmployeesOnSalaryStructure(r) === 1 ? "" : "s"}
        </span>
      ),
    },
    {
      id: "status",
      label: "Active",
      sortable: true,
      sortValue: (r) => r.status,
      render: (r) => (
        <HrActiveStatusSwitch
          checked={r.status === "active"}
          onCheckedChange={(active) => handleStatusToggle(r, active)}
        />
      ),
    },
    {
      id: "actions",
      label: "",
      className: "w-[5.5rem]",
      render: (r) => (
        <HrRowActions
          onView={() => setViewRecord(r)}
          onEdit={() => openEdit(r)}
          onDelete={() => requestDelete(r)}
        />
      ),
    },
  ];

  return (
    <HrOrgPageHeader
      title="Salary Structures"
      description="Create reusable salary structures using configured salary components."
      icon={FileText}
      sectionLabel="Payroll Settings"
      actions={
        <Button size="sm" className={hrBtn("gap-1.5", true)} onClick={openAdd}>
          <Plus className="w-3.5 h-3.5" /> Add Salary Structure
        </Button>
      }
    >
      <div className="space-y-3">
        <HrListingToolbar
          search={search}
          onSearchChange={setSearch}
          searchPlaceholder="Search salary structures…"
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          density={density}
          onDensityChange={setDensity}
          columns={COLUMN_DEFS}
          visibleColumns={visibleColumns}
          onVisibleColumnsChange={setVisibleColumns}
          selectedCount={selectedIds.length}
          onRefresh={refresh}
          onExport={() =>
            exportOrgCsv(
              "hr-salary-structures.csv",
              [
                "Structure Name",
                "Earnings",
                "Deductions",
                "Employer Contributions",
                "Default",
                "Employees",
                "Status",
              ],
              filtered.map((r) => {
                const c = countLinesByType(r, components);
                return [
                  r.name,
                  String(c.earnings),
                  String(c.deductions),
                  String(c.employerContributions),
                  r.isDefault ? "Yes" : "No",
                  String(countEmployeesOnSalaryStructure(r)),
                  r.status,
                ];
              }),
            )
          }
        />

        <HrDataGrid
          rows={filtered}
          columns={columns}
          visibleColumnIds={visibleColumns}
          density={density}
          loading={loading}
          isEmptyStore={records.length === 0}
          emptyTitle="No salary structures yet"
          emptyDescription="Create a reusable template from configured salary components."
          emptyActionLabel="+ Add Salary Structure"
          onEmptyAction={openAdd}
          onClearFilters={() => {
            setSearch("");
            setStatusFilter("all");
          }}
          selectedIds={selectedIds}
          onSelectedIdsChange={setSelectedIds}
        />
      </div>

      <HrFormDrawer
        open={drawerMode !== null}
        onOpenChange={(o) => !o && closeDrawer()}
        title={drawerMode === "edit" ? "Edit Salary Structure" : "Add Salary Structure"}
        description="Template composition — not employee-specific salary amounts."
        onSave={handleSave}
        saveLabel={drawerMode === "edit" ? "Update" : "Create"}
        contentClassName={DRAWER_WIDTH}
      >
        <div className="space-y-5 pb-1">
          <section className="space-y-3">
            <SectionHeading label="Structure Details" />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-3.5">
              <HrOrgField label="Structure Name" required size="full" error={errors.name}>
                <Input
                  value={form.name}
                  onChange={(e) => set("name", e.target.value)}
                  className={hrInput(undefined, errors.name ? "error" : "default")}
                  placeholder="Standard Staff Structure"
                />
              </HrOrgField>
              <div className="sm:col-span-2 space-y-3">
                <HrStatusToggle
                  checked={form.isDefault}
                  onCheckedChange={(v) => set("isDefault", v)}
                  label="Default Structure"
                  activeLabel="ON"
                  inactiveLabel="OFF"
                  size="sm"
                  helper={
                    form.isDefault
                      ? "New employees may use this structure by default"
                      : "Only one active structure can be default"
                  }
                />
                <HrStatusToggle
                  checked={form.status === "active"}
                  onCheckedChange={(v) => {
                    if (form.isDefault && !v) {
                      setToast(
                        "Default structure cannot be inactive. Set another active structure as default first.",
                      );
                      return;
                    }
                    set("status", v ? "active" : "inactive");
                  }}
                  label="Active"
                  activeLabel="ON"
                  inactiveLabel="OFF"
                  size="sm"
                  helper={
                    form.isDefault
                      ? "Default structure must stay active"
                      : form.status === "active"
                        ? "Available for employee assignment"
                        : "Hidden from new assignments"
                  }
                />
              </div>
            </div>
          </section>

          {errors.lines ? (
            <p className="text-xs text-red-500">{errors.lines}</p>
          ) : null}

          <ComponentSectionTable
            title="Earnings"
            componentType="earning"
            lines={groupedFormLines.earnings}
            allComponents={components}
            formLines={form.lines}
            onAdd={addComponent}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
          />

          <ComponentSectionTable
            title="Employee Deductions"
            componentType="deduction"
            lines={groupedFormLines.deductions}
            allComponents={components}
            formLines={form.lines}
            onAdd={addComponent}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
          />

          <ComponentSectionTable
            title="Employer Contributions"
            componentType="employer_contribution"
            lines={groupedFormLines.employerContributions}
            allComponents={components}
            formLines={form.lines}
            onAdd={addComponent}
            onUpdateLine={updateLine}
            onRemoveLine={removeLine}
          />

          <FormCompactSummary
            earnings={groupedFormLines.earnings.length}
            deductions={groupedFormLines.deductions.length}
            employerContributions={groupedFormLines.employerContributions.length}
            configuredGross={formPreview.grossEarnings}
          />
        </div>
      </HrFormDrawer>

      <ViewStructureDrawer
        open={!!viewRecord}
        record={viewRecord}
        preview={viewPreview}
        employeeCount={viewRecord ? countEmployeesOnSalaryStructure(viewRecord) : 0}
        onClose={() => setViewRecord(null)}
        onEdit={openEdit}
      />

      <HrConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={handleConfirm}
        destructive={confirm?.type === "deactivate"}
        title={
          confirm?.type === "makeDefault"
            ? "Make this the default Salary Structure?"
            : "Deactivate salary structure?"
        }
        description={
          confirm?.type === "makeDefault"
            ? `${confirm.currentDefaultName} is currently the default Salary Structure. Make this the new default?`
            : confirm?.type === "deactivate"
              ? `${confirm.record.name} is currently assigned to ${confirm.count} employees. Existing employee salary records will remain unchanged, but this structure will not be available for new assignments.`
              : ""
        }
        confirmLabel={confirm?.type === "makeDefault" ? "Make Default" : "Deactivate"}
      />

      <HrSettingsDeleteDialog
        open={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        target={deleteTarget}
        onDelete={handleDelete}
        onMakeInactive={() => {
          if (!deleteTarget) return;
          applyStatus(deleteTarget.record, false);
          setDeleteTarget(null);
        }}
      />

      <HrSuccessToast message={toast} onDismiss={() => setToast(null)} />
    </HrOrgPageHeader>
  );
}
