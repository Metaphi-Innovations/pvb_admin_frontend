"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { AlertTriangle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { SimpleCashVoucherForm } from "@/components/accounts/SimpleCashVoucherForm";
import { SimpleContraVoucherForm } from "@/components/accounts/SimpleContraVoucherForm";
import { ZohoVoucherEntryForm } from "@/components/accounts/ZohoVoucherEntryForm";
import { VoucherEntryModeToggle } from "@/components/accounts/VoucherEntryModeToggle";
import {
  getVoucherById,
  inferVoucherEntryMode,
  type VoucherEntryMode,
} from "@/app/(app)/accounts/vouchers/voucher-data";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useClientMounted } from "@/lib/use-client-mounted";

export type DualEntryVoucherType = "receipt" | "payment" | "contra";

interface VoucherDualEntryFormProps {
  voucherType: DualEntryVoucherType;
  cancelHref: string;
  onDone: () => void;
  voucherId?: number;
  readOnly?: boolean;
  onEdit?: () => void;
  breadcrumbSection?: string;
  /** Contra double-entry extras */
  contraExtraHeader?: React.ReactNode;
  contraLedgerFilter?: (ledger: ChartOfAccount) => boolean;
}

export function VoucherDualEntryForm({
  voucherType,
  cancelHref,
  onDone,
  voucherId,
  readOnly = false,
  onEdit,
  breadcrumbSection = "Transactions",
  contraExtraHeader,
  contraLedgerFilter,
}: VoucherDualEntryFormProps) {
  const mounted = useClientMounted();
  const existing = useMemo(
    () => (mounted && voucherId != null ? getVoucherById(voucherId) : undefined),
    [mounted, voucherId],
  );

  const initialMode = useMemo<VoucherEntryMode>(() => {
    if (existing) return inferVoucherEntryMode(existing);
    return "simple";
  }, [existing]);

  const [entryMode, setEntryMode] = useState<VoucherEntryMode>(initialMode);
  const [pendingMode, setPendingMode] = useState<VoucherEntryMode | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [hasEnteredData, setHasEnteredData] = useState(false);

  useEffect(() => {
    setEntryMode(initialMode);
  }, [initialMode]);

  const requestModeChange = useCallback(
    (next: VoucherEntryMode) => {
      if (next === entryMode) return;
      if (readOnly) return;
      if (hasEnteredData) {
        setPendingMode(next);
        setConfirmOpen(true);
        return;
      }
      setEntryMode(next);
      setHasEnteredData(false);
    },
    [entryMode, hasEnteredData, readOnly],
  );

  const confirmModeSwitch = () => {
    if (pendingMode) {
      setEntryMode(pendingMode);
      setHasEnteredData(false);
    }
    setPendingMode(null);
    setConfirmOpen(false);
  };

  const entryModeControl = (
    <VoucherEntryModeToggle
      value={entryMode}
      onChange={requestModeChange}
      disabled={readOnly}
    />
  );

  if (!mounted) {
    return (
      <div className="border border-border rounded-xl bg-muted/10 h-56 animate-pulse mx-5 my-4" />
    );
  }

  if (voucherType === "contra") {
    if (entryMode === "simple") {
      return (
        <>
          <SimpleContraVoucherForm
            key={`contra-simple-${voucherId ?? "new"}`}
            cancelHref={cancelHref}
            onDone={onDone}
            voucherId={voucherId}
            readOnly={readOnly}
            onEdit={onEdit}
            entryModeControl={entryModeControl}
            onDirtyChange={setHasEnteredData}
          />
          <ModeSwitchDialog
            open={confirmOpen}
            onClose={() => {
              setConfirmOpen(false);
              setPendingMode(null);
            }}
            onConfirm={confirmModeSwitch}
          />
        </>
      );
    }
    return (
      <>
        <ZohoVoucherEntryForm
          key={`contra-double-${voucherId ?? "new"}`}
          voucherType="contra"
          cancelHref={cancelHref}
          voucherId={voucherId}
          onDone={onDone}
          readOnly={readOnly}
          onEdit={onEdit}
          breadcrumbSection={breadcrumbSection}
          extraHeader={contraExtraHeader}
          ledgerFilter={contraLedgerFilter}
          quickAddScope="bank_cash"
          strictPostValidation
          entryMode="double"
          entryModeControl={entryModeControl}
          onDirtyChange={setHasEnteredData}
        />
        <ModeSwitchDialog
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setPendingMode(null);
          }}
          onConfirm={confirmModeSwitch}
        />
      </>
    );
  }

  if (entryMode === "simple") {
    return (
      <>
        <SimpleCashVoucherForm
          key={`${voucherType}-simple-${voucherId ?? "new"}`}
          mode={voucherType}
          cancelHref={cancelHref}
          onDone={onDone}
          voucherId={voucherId}
          readOnly={readOnly}
          onEdit={onEdit}
          fullWidth
          flexibleEntry
          entryModeControl={entryModeControl}
          onDirtyChange={setHasEnteredData}
        />
        <ModeSwitchDialog
          open={confirmOpen}
          onClose={() => {
            setConfirmOpen(false);
            setPendingMode(null);
          }}
          onConfirm={confirmModeSwitch}
        />
      </>
    );
  }

  return (
    <>
      <ZohoVoucherEntryForm
        key={`${voucherType}-double-${voucherId ?? "new"}`}
        voucherType={voucherType}
        cancelHref={cancelHref}
        voucherId={voucherId}
        onDone={onDone}
        readOnly={readOnly}
        onEdit={onEdit}
        breadcrumbSection={breadcrumbSection}
        showFinancialYear={false}
        strictPostValidation
        entryMode="double"
        entryModeControl={entryModeControl}
        onDirtyChange={setHasEnteredData}
      />
      <ModeSwitchDialog
        open={confirmOpen}
        onClose={() => {
          setConfirmOpen(false);
          setPendingMode(null);
        }}
        onConfirm={confirmModeSwitch}
      />
    </>
  );
}

function ModeSwitchDialog({
  open,
  onClose,
  onConfirm,
}: {
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
}) {
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
              <AlertTriangle className="w-4 h-4 text-amber-500" />
            </div>
            Switch entry mode?
          </DialogTitle>
          <DialogDescription className="pt-1">
            You have entered data in the current form. Switching entry mode will discard unsaved
            changes in this view.
          </DialogDescription>
        </DialogHeader>
        <div className="flex items-center justify-end gap-2 pt-2">
          <Button variant="outline" size="sm" className="h-8 text-xs" onClick={onClose}>
            Cancel
          </Button>
          <Button
            size="sm"
            className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
            onClick={onConfirm}
          >
            Switch mode
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
