import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export function MasterFetchedBadge({ className }: { className?: string }) {
  return (
    <Badge
      variant="outline"
      className={cn(
        "text-[9px] h-4 px-1.5 font-medium text-emerald-700 border-emerald-200 bg-emerald-50",
        className,
      )}
    >
      Fetched from Master
    </Badge>
  );
}
