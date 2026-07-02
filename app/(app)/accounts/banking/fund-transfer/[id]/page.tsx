import FundTransferDetailClient from "../FundTransferDetailClient";

export default function FundTransferViewPage({
  params,
}: {
  params: { id: string };
}) {
  const id = Number(params.id);
  return <FundTransferDetailClient transferId={id} />;
}
