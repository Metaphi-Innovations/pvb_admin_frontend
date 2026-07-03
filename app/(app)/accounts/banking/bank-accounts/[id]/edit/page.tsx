import BankAccountFormClient from "../../BankAccountFormClient";

export default async function EditBankAccountPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  return <BankAccountFormClient accountId={Number(id)} />;
}
