import { redirect } from "next/navigation";

/** Edit of incomplete ledgers is the Complete Details flow. */
export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  redirect(`/accounts/banking/bank-accounts/${id}/complete`);
}
