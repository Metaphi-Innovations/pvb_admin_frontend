"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { AlertTriangle } from "lucide-react";
import {
  canAddLedgerUnder,
  canEditLedger,
  describeInvalidLedgerParentMessage,
} from "@/app/(app)/accounts/masters/chart-of-accounts/chart-of-accounts-data";
import {
  registerCoaAddLedgerHandlers,
  requestCoaSpecializedLedgerForm,
} from "@/app/(app)/accounts/masters/chart-of-accounts/coa-add-ledger-bridge";
import { registerCoaEditLedgerHandler } from "@/app/(app)/accounts/masters/chart-of-accounts/coa-edit-ledger-bridge";
import type { ChartOfAccount } from "@/app/(app)/accounts/data";
import { useCanCoa } from "@/lib/accounts/use-can-coa";
import {
  isCustomerOrSupplierLinkedLedger,
  resolveCoaMasterLink,
} from "@/lib/accounts/coa-master-link";
import {
  coaPartyMasterCreateHref,
  coaPartyMasterEditHref,
} from "@/lib/accounts/coa-party-master-routes";
import { CHART_OF_ACCOUNTS_HREF } from "@/lib/accounts/accounts-nav";
import { loadChartOfAccounts } from "@/app/(app)/accounts/data";
import { useCoaNavigation } from "./CoaNavigationContext";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

function genericLedgerNewHref(parentGroupId?: number | null): string {
  const base = `${CHART_OF_ACCOUNTS_HREF}/ledgers/new`;
  return parentGroupId != null ? `${base}?parent=${parentGroupId}` : base;
}

function genericLedgerEditHref(ledgerId: number): string {
  return `${CHART_OF_ACCOUNTS_HREF}/ledgers/${ledgerId}/edit`;
}

/**
 * Routes COA add/edit ledger actions to the full-page Generic Ledger form.
 * Keeps edit confirmation; no longer opens the side drawer.
 */
export function CoaAddLedgerHost() {
  const router = useRouter();
  const canCreate = useCanCoa("create");
  const canEdit = useCanCoa("edit");
  const { records, selectedId, coaReady } = useCoaNavigation();

  const [editConfirmTarget, setEditConfirmTarget] = useState<ChartOfAccount | null>(null);
  const [blockMessage, setBlockMessage] = useState<string | null>(null);
  const selectedIdRef = useRef(selectedId);

  const openGlobalAdd = useCallback(
    (preferredParentId?: number | null) => {
      if (!canCreate) {
        setBlockMessage("You do not have permission to create ledgers.");
        return;
      }
      const list = records.length > 0 ? records : loadChartOfAccounts();
      const parent =
        preferredParentId != null
          ? list.find((r) => r.id === preferredParentId)
          : undefined;
      const parentGroupId =
        parent && canAddLedgerUnder(parent, list) ? preferredParentId! : null;

      if (parentGroupId != null) {
        const partyHref = coaPartyMasterCreateHref(parentGroupId, list);
        if (partyHref) {
          router.push(partyHref);
          return;
        }
      }

      if (parentGroupId != null && requestCoaSpecializedLedgerForm(parentGroupId)) return;

      if (parent && parentGroupId == null) {
        setBlockMessage(describeInvalidLedgerParentMessage(parent, list));
        return;
      }

      router.push(genericLedgerNewHref(parentGroupId));
    },
    [canCreate, records, router],
  );

  const openAddUnderParent = useCallback(
    (parentGroupId: number) => {
      if (!canCreate) {
        setBlockMessage("You do not have permission to create ledgers.");
        return;
      }
      const list = records.length > 0 ? records : loadChartOfAccounts();
      const parent = list.find((r) => r.id === parentGroupId);
      const partyHref = parent ? coaPartyMasterCreateHref(parentGroupId, list) : null;
      if (partyHref) {
        router.push(partyHref);
        return;
      }
      if (requestCoaSpecializedLedgerForm(parentGroupId)) return;
      if (!parent || !canAddLedgerUnder(parent, list)) {
        setBlockMessage(
          parent
            ? describeInvalidLedgerParentMessage(parent, list)
            : "Please select a valid Parent Group.",
        );
        return;
      }
      router.push(genericLedgerNewHref(parentGroupId));
    },
    [canCreate, records, router],
  );

  const openEdit = useCallback(
    (ledgerId: number) => {
      if (!canEdit) {
        setBlockMessage("You do not have permission to edit ledgers.");
        return;
      }
      const list = records.length > 0 ? records : loadChartOfAccounts();
      const row = list.find((r) => r.id === ledgerId);
      if (!row || !canEditLedger(row, list)) {
        setBlockMessage("This ledger cannot be edited.");
        return;
      }
      const link = resolveCoaMasterLink(row, list);
      if (link?.category === "customer" || link?.category === "vendor") {
        router.push(coaPartyMasterEditHref(link.category, link.sourceId));
        return;
      }
      setEditConfirmTarget(row);
    },
    [canEdit, records, router],
  );

  useEffect(() => {
    registerCoaAddLedgerHandlers({
      addUnderParent: openAddUnderParent,
      openGlobal: openGlobalAdd,
    });
    return () =>
      registerCoaAddLedgerHandlers({ addUnderParent: null, openGlobal: null });
  }, [openAddUnderParent, openGlobalAdd]);

  useEffect(() => {
    registerCoaEditLedgerHandler(openEdit);
    return () => registerCoaEditLedgerHandler(null);
  }, [openEdit]);

  useEffect(() => {
    if (selectedIdRef.current === selectedId) return;
    selectedIdRef.current = selectedId;
    setEditConfirmTarget(null);
    setBlockMessage(null);
  }, [selectedId]);

  useEffect(() => {
    if (!coaReady || typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);

    const add = params.get("addLedger");
    if (add) {
      params.delete("addLedger");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", next);

      if (add === "global") {
        openGlobalAdd(null);
        return;
      }
      const id = Number(add);
      if (Number.isFinite(id)) openAddUnderParent(id);
      return;
    }

    const editId = params.get("edit");
    if (editId) {
      params.delete("edit");
      const qs = params.toString();
      const next = `${window.location.pathname}${qs ? `?${qs}` : ""}`;
      window.history.replaceState(null, "", next);
      const id = Number(editId);
      if (Number.isFinite(id)) openEdit(id);
    }
  }, [coaReady, openAddUnderParent, openGlobalAdd, openEdit]);

  return (
    <>
      <Dialog
        open={blockMessage != null}
        onOpenChange={(open) => {
          if (!open) setBlockMessage(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Cannot continue
            </DialogTitle>
            <DialogDescription className="pt-1">{blockMessage}</DialogDescription>
          </DialogHeader>
          <div className="flex justify-end pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setBlockMessage(null)}
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog
        open={editConfirmTarget != null}
        onOpenChange={(open) => {
          if (!open) setEditConfirmTarget(null);
        }}
      >
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-amber-50 border border-amber-200">
                <AlertTriangle className="w-4 h-4 text-amber-500" />
              </div>
              Edit ledger?
            </DialogTitle>
            <DialogDescription className="pt-1">
              {editConfirmTarget
                ? isCustomerOrSupplierLinkedLedger(editConfirmTarget, records)
                  ? `"${editConfirmTarget.accountName}" is linked to a customer/supplier master. You can update accounting fields here; legal entity details remain in the master.`
                  : `Edit "${editConfirmTarget.accountName}"? You will open the full Generic Ledger form.`
                : ""}
            </DialogDescription>
          </DialogHeader>
          <div className="flex items-center justify-end gap-2 pt-2">
            <Button
              variant="outline"
              size="sm"
              className="h-8 text-xs"
              onClick={() => setEditConfirmTarget(null)}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              className="h-8 text-xs bg-brand-600 hover:bg-brand-700 text-white"
              onClick={() => {
                if (!editConfirmTarget) return;
                const id = editConfirmTarget.id;
                setEditConfirmTarget(null);
                router.push(genericLedgerEditHref(id));
              }}
            >
              Continue
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
