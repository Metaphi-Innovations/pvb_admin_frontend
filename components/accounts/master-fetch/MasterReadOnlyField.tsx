import { Label } from "@/components/ui/label";

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
      <Label className="text-xs text-muted-foreground mb-1 block">{label}</Label>
      <p
        className={`text-xs font-medium py-1.5 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[32px] flex items-center ${mono ? "font-mono" : ""}`}
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
    <div className={`space-y-1 ${className ?? ""}`}>
      <Label className="text-xs text-muted-foreground">{label}</Label>
      <p className="text-xs py-2 px-2.5 bg-muted/25 rounded-md border border-border/50 min-h-[48px] whitespace-pre-wrap">
        {value?.trim() ? value : "—"}
      </p>
    </div>
  );
}
