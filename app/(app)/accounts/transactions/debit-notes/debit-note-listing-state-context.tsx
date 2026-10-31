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
import type { DebitNotesStatusTabId } from "../../debit-notes/note-utils";

export type DebitNoteRecordsListingState = {
  statusTab: DebitNotesStatusTabId;
  filters: NotesListingFilterState;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

export type DebitNotePendingListingState = {
  search: string;
  page: number;
  pageSize: number;
  sortKey: string;
  sortDir: "asc" | "desc";
  columnFilters: Record<string, unknown>;
};

export function createDefaultDebitNoteRecordsListingState(): DebitNoteRecordsListingState {
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

export function createDefaultDebitNotePendingListingState(): DebitNotePendingListingState {
  return {
    search: "",
    page: 1,
    pageSize: 25,
    sortKey: "",
    sortDir: "desc",
    columnFilters: {},
  };
}

type DebitNoteListingStateContextValue = {
  records: DebitNoteRecordsListingState;
  setRecords: Dispatch<SetStateAction<DebitNoteRecordsListingState>>;
  pending: DebitNotePendingListingState;
  setPending: Dispatch<SetStateAction<DebitNotePendingListingState>>;
  recordsFilterEpoch: number;
  setRecordsFilterEpoch: Dispatch<SetStateAction<number>>;
  pendingFilterEpoch: number;
  setPendingFilterEpoch: Dispatch<SetStateAction<number>>;
};

const DebitNoteListingStateContext =
  createContext<DebitNoteListingStateContextValue | null>(null);

export function DebitNoteListingStateProvider({
  children,
}: {
  children: ReactNode;
}) {
  const [records, setRecords] = useState(createDefaultDebitNoteRecordsListingState);
  const [pending, setPending] = useState(createDefaultDebitNotePendingListingState);
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
    <DebitNoteListingStateContext.Provider value={value}>
      {children}
    </DebitNoteListingStateContext.Provider>
  );
}

export function useDebitNoteListingState(): DebitNoteListingStateContextValue {
  const ctx = useContext(DebitNoteListingStateContext);
  if (!ctx) {
    throw new Error(
      "useDebitNoteListingState must be used within DebitNoteListingStateProvider",
    );
  }
  return ctx;
}
