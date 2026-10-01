import { redirect } from "next/navigation";

type Props = { params: Promise<{ id: string }> };

/** Legacy route — canonical user module is /user-management/employee */
export default async function LegacyUserViewPage({ params }: Props) {
  const { id } = await params;
  redirect(`/user-management/employee/${id}`);
}
