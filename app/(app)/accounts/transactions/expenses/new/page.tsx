import { redirect } from "next/navigation";
import { EXPENSE_LIST_PATH } from "../../../expenses/expense-utils";

export default function ExpenseCreateRedirect() {
  redirect(EXPENSE_LIST_PATH);
}
