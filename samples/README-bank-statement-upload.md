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

## Dummy file for local testing

Use [`dummy-bank-statement.csv`](./dummy-bank-statement.csv):

1. Open **Accounts → Banking → Bank Reconciliation →** your account → **Statement Reconciliation**.
2. Click **Upload Bank Statement** and select this file.
3. Rows appear under **Match Entries** (right) and **Unmatched Bank Entries**.
4. To exercise **Match & Reconcile**, create/post book vouchers with the **same amounts and directions** as the CSV rows you want to match (e.g. receipt ₹5,000, payment ₹10,000). Amount + direction must agree.

Sample rows include deposits (Credit), withdrawals (Debit), UTR/cheque refs, and one bank-charge line for unmatched testing.
