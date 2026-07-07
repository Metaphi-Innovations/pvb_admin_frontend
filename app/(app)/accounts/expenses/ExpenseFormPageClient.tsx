"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { AccountsFormLayout } from "./components/AccountsFormLayout";
import { ExpenseForm } from "./components/ExpenseForm";
import { loadEmployees } from "@/app/(app)/user-management/employee/employee-data";
import { loadExpenseCategories } from "./expense-category-data";
import {
  DEFAULT_EXPENSE_FORM,
  canEditExpense,
  expenseToForm,
  formToExpense,
  generateExpenseNumber,
  getExpenseById,
  loadExpenses,
  saveExpenses,
  submitExpense,
  updateExpenseFromForm,
  validateExpenseForm,
} from "./expense-data";
import { EXPENSE_BREADCRUMB, EXPENSE_LIST_PATH } from "./expense-utils";

export default function ExpenseFormPageClient({
  mode,
  expenseId,
}: {
  mode: "create" | "edit";
  expenseId?: number;
}) {
  const router = useRouter();
  const [form, setForm] = useState(DEFAULT_EXPENSE_FORM);
  const [expenseNumber, setExpenseNumber] = useState("");
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (mode === "create") {
      setExpenseNumber(generateExpenseNumber(loadExpenses()));
      setForm(DEFAULT_EXPENSE_FORM);
      return;
    }
    if (!expenseId) return;
    const expense = getExpenseById(expenseId);
    if (!expense) {
      router.replace(EXPENSE_LIST_PATH);
      return;
    }
    if (!canEditExpense(expense)) {
      router.replace(`${EXPENSE_LIST_PATH}/${expenseId}`);
      return;
    }
    setExpenseNumber(expense.expenseNumber);
    setForm(expenseToForm(expense));
  }, [mode, expenseId, router]);

  const persist = (asDraft: boolean) => {
    const err = validateExpenseForm(form);
    if (err) {
      setError(err);
      return;
    }
    const employees = loadEmployees();
    const emp = employees.find((e) => e.id === form.employeeId);
    if (!emp) {
      setError("Invalid employee.");
      return;
    }
    const cat = loadExpenseCategories().find((c) => c.id === form.categoryId);
    if (!cat) {
      setError("Invalid category.");
      return;
    }

    const list = loadExpenses();
    if (mode === "create") {
      const id = list.length ? Math.max(...list.map((e) => e.id)) + 1 : 1;
      let expense = formToExpense(
        form,
        id,
        expenseNumber,
        { fullName: emp.fullName, employeeId: emp.employeeId, department: emp.department },
        cat.name,
        "draft",
      );
      if (!asDraft) expense = submitExpense(expense);
      saveExpenses([...list, expense]);
      router.push(`${EXPENSE_LIST_PATH}/${expense.id}`);
      return;
    }

    const existing = getExpenseById(expenseId!);
    if (!existing) return;
    let updated = updateExpenseFromForm(
      existing,
      form,
      { fullName: emp.fullName, employeeId: emp.employeeId, department: emp.department },
      cat.name,
    );
    if (!asDraft && existing.status === "draft") updated = submitExpense(updated);
    saveExpenses(list.map((e) => (e.id === updated.id ? updated : e)));
    router.push(`${EXPENSE_LIST_PATH}/${updated.id}`);
  };

  const title = mode === "create" ? "Create Expense" : "Edit Expense";

  return (
    <AccountsFormLayout
      title={title}
      breadcrumb={[...EXPENSE_BREADCRUMB]}
      code={expenseNumber}
      footer={
        <>
          <Button variant="outline" size="sm" className="h-9 text-sm font-medium" onClick={() => router.push(EXPENSE_LIST_PATH)}>
            Cancel
          </Button>
        </>
      }
    >
      {error && <p className="text-xs text-red-600 mb-3">{error}</p>}
      <ExpenseForm form={form} onChange={setForm} expenseNumber={expenseNumber} />
      <div className="flex justify-end gap-2 mt-4 pb-6">
        <Button
          size="sm"
          className="h-9 text-sm font-medium bg-brand-600 hover:bg-brand-700 text-white"
          onClick={() => persist(false)}
        >
          {mode === "create" ? "Submit for Approval" : "Save & Submit"}
        </Button>
      </div>
    </AccountsFormLayout>
  );
}
