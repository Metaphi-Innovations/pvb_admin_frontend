import ClaimDetailClient from "../ClaimDetailClient";

export default function ClaimDetailPage({ params }: { params: { id: string } }) {
  return <ClaimDetailClient claimId={Number(params.id)} />;
}
