import type { AccountExpense } from "./expense-data";
import {
  getApprovedAmount,
  getClaimedAmount,
  getPaidAmount,
  sourceLabel,
} from "./expense-data";

const STATUS_LABELS: Record<AccountExpense["status"], string> = {
  draft: "Draft",
  submitted: "Submitted",
  pending_approval: "Pending Approval",
  approved: "Approved",
  rejected: "Rejected",
  paid: "Paid",
  cancelled: "Cancelled",
};

function rowFromExpense(e: AccountExpense) {
  return {
    "Expense No.": e.expenseNumber,
    "Expense Date": e.expenseDate,
    "Employee Name": e.employeeName,
    "Employee Code": e.employeeCode,
    Category: e.categoryName,
    Description: e.description,
    Amount: e.amount,
    Tax: e.gstAmount,
    "Total Amount": e.totalAmount,
    "Claimed Amount": getClaimedAmount(e),
    "Approved Amount": getApprovedAmount(e),
    "Paid Amount": getPaidAmount(e),
    "Payment Mode": e.paymentMode ?? "",
    Source: sourceLabel(e.source),
    "Source Reference No.": e.sourceReferenceNo,
    Status: STATUS_LABELS[e.status] ?? e.status,
    "Paid Status": e.paidStatus === "paid" ? "Paid" : "Unpaid",
    "Approved By": e.approvedBy ?? "",
    "Approval Remarks": e.approvalRemarks ?? "",
    "Payment Date": e.payment?.paymentDate ?? "",
    "Payment Reference No.": e.payment?.paymentReferenceNo ?? "",
    "Created By": e.createdBy,
    "Updated By": e.updatedBy,
  };
}

export async function exportExpensesToExcel(expenses: AccountExpense[]): Promise<void> {
  const XLSX = await import("xlsx");
  const rows = expenses.map(rowFromExpense);
  const sheet = XLSX.utils.json_to_sheet(rows);
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, sheet, "Expenses");
  const date = new Date().toISOString().slice(0, 10);
  XLSX.writeFile(workbook, `Expenses_Export_${date}.xlsx`);
}
