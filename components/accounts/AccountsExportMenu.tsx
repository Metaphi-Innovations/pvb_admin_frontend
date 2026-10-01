"use client";

import { Download, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { ACCOUNTS_ACTION_BUTTON_CLASS } from "@/lib/accounts/accounts-typography";

export interface AccountsExportMenuProps {
  onExcel?: () => void;
  onPdf?: () => void;
  onCsv?: () => void;
  disabled?: boolean;
  label?: string;
}

export function AccountsExportMenu({
  onExcel,
  onPdf,
  onCsv,
  disabled,
  label = "Export",
}: AccountsExportMenuProps) {
  const handleExcel = onExcel ?? onCsv;
  const handlePdf = onPdf ?? onCsv;

  if (!handleExcel && !handlePdf) return null;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className={cn(ACCOUNTS_ACTION_BUTTON_CLASS, "text-xs px-2.5")}
          disabled={disabled}
        >
          <Download className="w-4 h-4" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {handleExcel && (
          <DropdownMenuItem className="text-xs gap-2" onClick={handleExcel}>
            <FileSpreadsheet className="w-4 h-4" /> Export Excel
          </DropdownMenuItem>
        )}
        {handlePdf && (
          <DropdownMenuItem className="text-xs gap-2" onClick={handlePdf}>
            <FileDown className="w-4 h-4" /> Export PDF
          </DropdownMenuItem>
        )}
        {onCsv && (
          <DropdownMenuItem className="text-xs gap-2" onClick={onCsv}>
            <Download className="w-4 h-4" /> Export CSV
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
