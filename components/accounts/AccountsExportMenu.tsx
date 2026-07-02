"use client";

import { Download, FileDown, FileSpreadsheet } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
          className="h-7 text-xs gap-1 px-2.5"
          disabled={disabled}
        >
          <Download className="w-3.5 h-3.5" /> {label}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-40">
        {handleExcel && (
          <DropdownMenuItem className="text-xs gap-2" onClick={handleExcel}>
            <FileSpreadsheet className="w-3.5 h-3.5" /> Export Excel
          </DropdownMenuItem>
        )}
        {handlePdf && (
          <DropdownMenuItem className="text-xs gap-2" onClick={handlePdf}>
            <FileDown className="w-3.5 h-3.5" /> Export PDF
          </DropdownMenuItem>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
