"use client";

import React, {
  createContext,
  useContext,
  useMemo,
  useState,
  type Dispatch,
  type ReactNode,
  type SetStateAction,
} from "react";
import {
  resetNotesListingFilters,
  type NotesListingFilterState,
} from "../../components/notes-listing-shared";
import type { CreditNotesStatusTabId } from "../../credit-notes/note-utils";

export type CreditNoteRecordsListingState = {
  statusTab: CreditNotesStatusTabId;
  filters: NotesListingFilterState;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

export type CreditNotePendingListingState = {
  search: string;
  sourceFilter: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

export function createDefaultCreditNoteRecordsListingState(): CreditNoteRecordsListingState {
  return {
    statusTab: "all",
    filters: resetNotesListingFilters("this_year"),
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "desc",
    columnFilters: {},
  };
}

export function createDefaultCreditNotePendingListingState(): CreditNotePendingListingState {
  return {
    search: "",
    sourceFilter: "all",
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "desc",
    columnFilters: {},
  };
}

type CreditNoteListingStateContextValue = {
  records: CreditNoteRecordsListingState;
  setRecords: Dispatch<SetStateAction<CreditNoteRecordsListingState>>;
  pending: CreditNotePendingListingState;
  setPending: Dispatch<SetStateAction<CreditNotePendingListingState>>;
  recordsFilterEpoch: number;
  setRecordsFilterEpoch: Dispatch<SetStateAction<number>>;
  pendingFilterEpoch: number;
  setPendingFilterEpoch: Dispatch<SetStateAction<number>>;
};

const CreditNoteListingStateContext =
  createContext<CreditNoteListingStateContextValue | null>(null);

export function CreditNoteListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [records, setRecords] = useState(createDefaultCreditNoteRecordsListingState);
  const [pending, setPending] = useState(createDefaultCreditNotePendingListingState);
  const [recordsFilterEpoch, setRecordsFilterEpoch] = useState(0);
  const [pendingFilterEpoch, setPendingFilterEpoch] = useState(0);

  const value = useMemo(
    () => ({
      records,
      setRecords,
      pending,
      setPending,
      recordsFilterEpoch,
      setRecordsFilterEpoch,
      pendingFilterEpoch,
      setPendingFilterEpoch,
    }),
    [records, pending, recordsFilterEpoch, pendingFilterEpoch],
  );

  return (
    <CreditNoteListingStateContext.Provider value={value}>
      {children}
    </CreditNoteListingStateContext.Provider>
  );
}

export function useCreditNoteListingState(): CreditNoteListingStateContextValue {
  const ctx = useContext(CreditNoteListingStateContext);
  if (!ctx) {
    throw new Error(
      "useCreditNoteListingState must be used within CreditNoteListingStateProvider",
    );
  }
  return ctx;
}
