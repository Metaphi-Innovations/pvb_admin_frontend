# Bank statement upload

Do **not** commit real bank CSV/Excel files to this repository.

Upload statements only from **Accounts → Bank Reconciliation → Upload Statement** on your machine.

## Supported columns

The importer detects common bank export headers (HDFC, ICICI, Axis, etc.):

| Field | Examples |
|-------|----------|
| Date | `Date`, `Value Dt`, `Transaction Date`, `Value Date` |
| Narration | `Narration`, `Transaction Particulars`, `Transaction Remarks` |
| Debit | `Withdrawal Amt.`, `Debit`, `Withdrawal Amount` |
| Credit | `Deposit Amt.`, `Credit`, `Deposit Amount` |
| Balance | `Closing Balance`, `Balance` (optional) |
| Reference | `Chq./Ref.No.`, `UTR`, `Reference No.` |

Each row needs a **date** and either **debit** or **credit**.

Dates: `DD/MM/YYYY` or `YYYY-MM-DD`. Amounts may include commas.
