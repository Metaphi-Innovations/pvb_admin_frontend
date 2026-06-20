import BankGroupAccountsClient from "../BankGroupAccountsClient";

export default async function BankGroupPage({
  params,
}: {
  params: Promise<{ groupId: string }>;
}) {
  const { groupId } = await params;
  return <BankGroupAccountsClient bankGroupId={Number(groupId)} />;
}
