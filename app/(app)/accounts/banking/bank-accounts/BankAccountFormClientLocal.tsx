"use client";

/**
 * @deprecated Use `BankAccountFormClient` directly.
 * Kept so any stale dynamic import still gets the API-backed form
 * (ledger + bank_account tables), not the localStorage demo form.
 */
export { default } from "./BankAccountFormClient";
