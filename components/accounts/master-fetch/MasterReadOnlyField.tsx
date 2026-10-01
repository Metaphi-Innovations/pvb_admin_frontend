import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
import {
  INVOICE_FORM_LABEL_CLASS,
  INVOICE_FORM_READONLY_CLASS,
} from "@/app/(app)/accounts/components/InvoiceFormLayout";

export function MasterReadOnlyField({
  label,
  value,
  className,
  mono,
}: {
  label: string;
  value?: string | null;
  className?: string;
  mono?: boolean;
}) {
  return (
    <div className={className}>
      <Label className={cn(INVOICE_FORM_LABEL_CLASS, "mb-1 block")}>{label}</Label>
      <p
        className={cn(
          INVOICE_FORM_READONLY_CLASS,
          "min-h-9 flex items-center px-2.5 text-sm",
          mono && "font-mono",
        )}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}

export function MasterReadOnlyAddress({
  label,
  value,
  className,
}: {
  label: string;
  value?: string;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1", className)}>
      <Label className={INVOICE_FORM_LABEL_CLASS}>{label}</Label>
      <p
        className={cn(
          INVOICE_FORM_READONLY_CLASS,
          "min-h-[72px] px-2.5 py-2 text-sm whitespace-pre-wrap",
        )}
      >
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}
