"use client";

import { Label } from "@/components/ui/label";
import { CompactToggle } from "@/components/ui/ActiveInactiveToggle";

/** Same Yes/No switch used on bank account add form (COA GST Applicable style). */
export function BankAccountToggle({
  checked,
  onCheckedChange,
  disabled,
  showLabel = true,
  className,
}: {
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
  disabled?: boolean;
  /** When false, renders the compact switch without Yes/No text (listing). */
  showLabel?: boolean;
  className?: string;
}) {
  return (
    <CompactToggle
      checked={checked}
      onCheckedChange={onCheckedChange}
      disabled={disabled}
      activeLabel="Yes"
      inactiveLabel="No"
      showLabel={showLabel}
      className={className}
    />
  );
}

/** Bordered label + toggle row (Status on add/edit form). */
export function BankAccountYesNoField({
  label,
  checked,
  disabled,
  onChange,
}: {
  label: string;
  checked: boolean;
  disabled?: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div className="flex h-9 items-center justify-between gap-3 rounded-lg border border-border/60 px-3">
      <Label className="min-w-0 text-xs font-medium leading-none">{label}</Label>
      <BankAccountToggle
        checked={checked}
        onCheckedChange={onChange}
        disabled={disabled}
      />
    </div>
  );
}

/** Description + toggle card (Defaults & Reconciliation). */
export function BankAccountToggleRow({
  label,
  description,
  checked,
  onCheckedChange,
  disabled,
}: {
  label: string;
  description: string;
  checked: boolean;
  onCheckedChange: (v: boolean) => void;
  disabled?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-lg border border-border/60 px-3 py-2">
      <div className="min-w-0">
        <p className="text-xs font-medium text-foreground leading-none">{label}</p>
        <p className="text-[11px] text-muted-foreground mt-1">{description}</p>
      </div>
      <BankAccountToggle
        checked={checked}
        onCheckedChange={onCheckedChange}
        disabled={disabled}
      />
    </div>
  );
}
