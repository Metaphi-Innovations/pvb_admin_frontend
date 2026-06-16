import ExpenseViewPageClient from "../../../expenses/ExpenseViewPageClient";

type PageProps = { params: { id: string } };

export default function ExpenseViewPage({ params }: PageProps) {
  return <ExpenseViewPageClient paymentId={Number(params.id)} />;
}
