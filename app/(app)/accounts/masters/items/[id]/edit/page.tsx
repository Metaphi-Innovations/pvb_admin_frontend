import AccountItemFormClient from "../../AccountItemFormClient";

type PageProps = { params: { id: string } };

export default function EditAccountItemPage({ params }: PageProps) {
  return <AccountItemFormClient itemId={Number(params.id)} />;
}
