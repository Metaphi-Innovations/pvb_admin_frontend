import { redirect } from "next/navigation";

type Props = { params: { id: string } };

export default function ExpenseEditRedirect({ params }: Props) {
  redirect(`/accounts/transactions/expenses/${params.id}`);
}
